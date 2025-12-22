/**
 * Job Postings Routes
 * API para gestión de ofertas laborales y postulaciones
 *
 * FLUJO COMPLETO:
 * Postulación → Revisión RRHH → Entrevista → Aprobación Admin →
 * [NOTIFICACIÓN MÉDICO] → Examen Preocupacional → Apto → Alta Empleado
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { body, validationResult, param, query } = require('express-validator');
const { Op } = require('sequelize');

// Middleware de autenticación
const { auth: authMiddleware } = require('../middleware/auth');

// Importar modelos desde database.js
const {
  User,
  Company,
  Department,
  JobPosting,
  JobApplication,
  CandidateProfile,
  MedicalRecord,
  sequelize
} = require('../config/database');

// Importar JWT para autenticación simple de candidatos
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'aponnt_secret_2025';

// Importar servicio de email
let EmailService;
try {
  EmailService = require('../services/EmailService');
} catch (e) {
  console.log('⚠️ EmailService no disponible, emails de verificación desactivados');
}

// Importar servicio de inbox para notificaciones proactivas
const inboxService = require('../services/inboxService');

// Importar servicio de matching de candidatos internos
const InternalCandidateMatchingService = require('../services/InternalCandidateMatchingService');

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
    if (extname) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF, DOC y DOCX'));
    }
  }
});

// Helper para construir contexto
const buildContext = (req) => ({
  userId: req.user?.user_id || req.user?.id,
  companyId: req.user?.company_id,
  userName: req.user?.name || req.user?.username,
  userRole: req.user?.role
});

// ============================================================================
// ENDPOINTS PÚBLICOS (Sin autenticación)
// ============================================================================

/**
 * GET /api/job-postings/public/offers
 * Portal público de empleos - Sin autenticación
 */
router.get('/public/offers', async (req, res) => {
  try {
    const {
      company_id,
      company_slug,
      location,
      job_type,
      department_id,
      search,
      page = 1,
      limit = 20
    } = req.query;

    const offset = (page - 1) * limit;

    // Construir filtros
    const where = {
      status: 'active',
      is_public: true
    };

    // Si se especifica empresa
    if (company_id) {
      where.company_id = parseInt(company_id);
    } else if (company_slug) {
      // Buscar por slug de empresa
      const company = await Company.findOne({ where: { slug: company_slug } });
      if (company) {
        where.company_id = company.company_id;
      }
    }

    if (location) {
      where.location = { [Op.iLike]: `%${location}%` };
    }

    if (job_type && job_type !== 'all') {
      where.job_type = job_type;
    }

    if (department_id && department_id !== 'all') {
      where.department_id = parseInt(department_id);
    }

    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: offers } = await JobPosting.findAndCountAll({
      where,
      include: [
        {
          model: Company,
          as: 'company',
          attributes: ['company_id', 'name', 'slug', 'city', 'province']
        },
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        }
      ],
      attributes: [
        'id', 'title', 'description', 'requirements', 'responsibilities',
        'department_name', 'location', 'job_type',
        'salary_min', 'salary_max', 'salary_currency', 'salary_period',
        'benefits', 'tags', 'skills_required',
        'requires_cv', 'requires_cover_letter',
        'posted_at', 'auto_close_date', 'company_id'
      ],
      order: [['posted_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    // Agrupar por empresa para la vista del portal
    const companies = {};
    offers.forEach(offer => {
      const companyId = offer.company_id;
      if (!companies[companyId]) {
        companies[companyId] = {
          company: offer.company,
          offers: []
        };
      }
      companies[companyId].offers.push({
        ...offer.toJSON(),
        company: undefined // No duplicar
      });
    });

    res.json({
      success: true,
      offers,
      byCompany: Object.values(companies),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      },
      filters: {
        jobTypes: ['full-time', 'part-time', 'contract', 'temporary', 'internship'],
        locations: await JobPosting.findAll({
          where: { status: 'active', is_public: true },
          attributes: [[sequelize.fn('DISTINCT', sequelize.col('location')), 'location']],
          raw: true
        }).then(rows => rows.map(r => r.location).filter(Boolean))
      }
    });

  } catch (error) {
    console.error('❌ [JOB-POSTINGS] Error obteniendo ofertas públicas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener ofertas'
    });
  }
});

/**
 * GET /api/job-postings/public/offers/:id
 * Detalle de oferta pública
 */
router.get('/public/offers/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const offer = await JobPosting.findOne({
      where: {
        id,
        status: 'active',
        is_public: true
      },
      include: [
        {
          model: Company,
          as: 'company',
          attributes: ['company_id', 'name', 'slug', 'city', 'province', 'address']
        },
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!offer) {
      return res.status(404).json({
        success: false,
        error: 'Oferta no encontrada o no disponible'
      });
    }

    // Incrementar contador de vistas
    await offer.incrementViews();

    res.json({
      success: true,
      offer
    });

  } catch (error) {
    console.error('❌ [JOB-POSTINGS] Error obteniendo oferta pública:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener oferta'
    });
  }
});

/**
 * POST /api/job-postings/public/apply
 * Postulación pública (sin autenticación)
 */
router.post('/public/apply', upload.single('cv'), async (req, res) => {
  try {
    console.log(`📝 [JOB-POSTINGS] Nueva postulación pública recibida`);

    const data = req.body;

    // Validar campos requeridos
    if (!data.job_posting_id) {
      return res.status(400).json({
        success: false,
        error: 'job_posting_id es requerido'
      });
    }

    if (!data.candidate_first_name || !data.candidate_last_name || !data.candidate_email) {
      return res.status(400).json({
        success: false,
        error: 'Nombre, apellido y email son requeridos'
      });
    }

    // Verificar que la oferta existe y está activa
    const jobPosting = await JobPosting.findOne({
      where: {
        id: data.job_posting_id,
        status: 'active',
        is_public: true
      }
    });

    if (!jobPosting) {
      return res.status(400).json({
        success: false,
        error: 'Oferta no encontrada o no está disponible'
      });
    }

    // Verificar si puede recibir más postulaciones
    if (!jobPosting.canReceiveApplications()) {
      return res.status(400).json({
        success: false,
        error: 'Esta oferta ya no acepta postulaciones'
      });
    }

    // Verificar si ya postuló
    const alreadyApplied = await JobApplication.hasApplied(
      data.candidate_email,
      data.job_posting_id
    );

    if (alreadyApplied) {
      return res.status(400).json({
        success: false,
        error: 'Ya te has postulado a esta oferta anteriormente'
      });
    }

    // Manejar CV subido
    let cvData = {};
    if (req.file) {
      cvData = {
        cv_file_path: req.file.path,
        cv_file_name: req.file.originalname,
        cv_uploaded_at: new Date()
      };
    } else if (jobPosting.requires_cv) {
      return res.status(400).json({
        success: false,
        error: 'Esta oferta requiere adjuntar un CV'
      });
    }

    // Parsear campos JSON si vienen como string
    const parseJSON = (val) => {
      if (!val) return [];
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch { return []; }
      }
      return val;
    };

    const application = await JobApplication.create({
      company_id: jobPosting.company_id,
      job_posting_id: data.job_posting_id,
      candidate_first_name: data.candidate_first_name,
      candidate_last_name: data.candidate_last_name,
      candidate_email: data.candidate_email,
      candidate_phone: data.candidate_phone || null,
      candidate_dni: data.candidate_dni || null,
      candidate_birth_date: data.candidate_birth_date || null,
      candidate_gender: data.candidate_gender || null,
      candidate_nationality: data.candidate_nationality || null,
      candidate_address: data.candidate_address || null,
      candidate_city: data.candidate_city || null,
      candidate_province: data.candidate_province || null,
      candidate_postal_code: data.candidate_postal_code || null,
      experience_years: data.experience_years ? parseInt(data.experience_years) : null,
      current_position: data.current_position || null,
      current_company: data.current_company || null,
      education_level: data.education_level || null,
      education_title: data.education_title || null,
      skills: parseJSON(data.skills),
      languages: parseJSON(data.languages),
      certifications: parseJSON(data.certifications),
      ...cvData,
      cover_letter: data.cover_letter || null,
      salary_expectation: data.salary_expectation || null,
      availability: data.availability || null,
      preferred_schedule: data.preferred_schedule || null,
      willing_to_relocate: data.willing_to_relocate === 'true' || data.willing_to_relocate === true,
      source: 'portal_publico',
      ip_address: req.ip || req.connection?.remoteAddress,
      user_agent: req.headers['user-agent'],
      status: 'nuevo',
      status_history: [{
        from_status: null,
        to_status: 'nuevo',
        changed_at: new Date().toISOString(),
        changed_by: null,
        notes: 'Postulación recibida desde portal público'
      }]
    });

    console.log(`✅ [JOB-POSTINGS] Postulación pública creada: ID=${application.id} para oferta ${jobPosting.title}`);

    // Enviar notificación a RRHH de la empresa
    try {
      const rrhh = await User.findAll({
        where: {
          company_id: jobPosting.company_id,
          role: { [Op.in]: ['admin', 'rrhh'] },
          is_active: true
        },
        attributes: ['user_id', 'firstName', 'lastName', 'email']
      });

      if (rrhh.length > 0 && inboxService) {
        const notificationGroup = await inboxService.createNotificationGroup(jobPosting.company_id, {
          group_type: 'new_job_application',
          initiator_type: 'external',
          subject: `📝 Nueva Postulación: ${application.candidate_first_name} ${application.candidate_last_name}`,
          priority: 'normal',
          metadata: {
            application_id: application.id,
            candidate_name: `${application.candidate_first_name} ${application.candidate_last_name}`,
            candidate_email: application.candidate_email,
            job_posting_id: jobPosting.id,
            job_title: jobPosting.title
          }
        });

        for (const user of rrhh) {
          await inboxService.sendMessage(notificationGroup.id, jobPosting.company_id, {
            sender_type: 'system',
            sender_name: 'Portal de Empleos',
            recipient_type: 'user',
            recipient_id: user.user_id,
            recipient_name: `${user.firstName} ${user.lastName}`,
            message_type: 'informational',
            subject: 'Nueva Postulación Recibida',
            content: `
📝 **NUEVA POSTULACIÓN RECIBIDA**

**Candidato:** ${application.candidate_first_name} ${application.candidate_last_name}
**Email:** ${application.candidate_email}
**Teléfono:** ${application.candidate_phone || 'No registrado'}

**Puesto:** ${jobPosting.title}
**Ubicación:** ${jobPosting.location || 'No especificada'}

Acceda al módulo de Postulaciones Laborales para revisar esta candidatura.
            `.trim()
          });
        }
      }
    } catch (notifError) {
      console.error('Error enviando notificación a RRHH:', notifError);
    }

    res.status(201).json({
      success: true,
      message: '¡Gracias por tu postulación! Hemos recibido tu información correctamente.',
      applicationId: application.id,
      candidateName: `${application.candidate_first_name} ${application.candidate_last_name}`,
      jobTitle: jobPosting.title
    });

  } catch (error) {
    console.error('❌ [JOB-POSTINGS] Error creando postulación pública:', error);
    res.status(500).json({
      success: false,
      error: 'Error al procesar tu postulación. Por favor intenta nuevamente.'
    });
  }
});

/**
 * GET /api/job-postings/public/companies
 * Lista de empresas con ofertas activas
 */
router.get('/public/companies', async (req, res) => {
  try {
    const companiesWithJobs = await JobPosting.findAll({
      where: { status: 'active', is_public: true },
      include: [{
        model: Company,
        as: 'company',
        attributes: ['company_id', 'name', 'slug', 'city', 'province']
      }],
      attributes: [
        'company_id',
        [sequelize.fn('COUNT', sequelize.col('JobPosting.id')), 'job_count']
      ],
      group: ['JobPosting.company_id', 'company.company_id', 'company.name', 'company.slug', 'company.city', 'company.province'],
      raw: false
    });

    const companies = companiesWithJobs.map(row => ({
      ...row.company?.toJSON(),
      jobCount: parseInt(row.get('job_count')) || 0
    }));

    res.json({
      success: true,
      companies
    });

  } catch (error) {
    console.error('❌ [JOB-POSTINGS] Error obteniendo empresas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener empresas'
    });
  }
});

// ============================================================================
// ENDPOINTS PÚBLICOS - BOLSA DE CVs (Portal de Empleo Público)
// ============================================================================

/**
 * POST /api/job-postings/public/candidates/register
 * Registrar candidato en pool - Envía código de verificación
 */
router.post('/public/candidates/register', async (req, res) => {
  try {
    const { email, full_name, phone, professional_title } = req.body;

    if (!email || !full_name) {
      return res.status(400).json({
        success: false,
        error: 'Email y nombre completo son requeridos'
      });
    }

    // Verificar si ya existe
    let candidate = await CandidateProfile.findOne({ where: { email } });

    if (candidate && candidate.is_verified) {
      return res.status(400).json({
        success: false,
        error: 'Este email ya está registrado. Usa la opción de login.'
      });
    }

    if (!candidate) {
      candidate = await CandidateProfile.create({
        email,
        full_name,
        phone,
        professional_title
      });
    } else {
      // Actualizar datos básicos si existe pero no está verificado
      await candidate.update({ full_name, phone, professional_title });
    }

    // Generar código de verificación
    const verificationCode = candidate.generateVerificationCode();
    await candidate.save();

    // Enviar email con código
    if (EmailService) {
      try {
        await EmailService.sendEmail({
          to: email,
          subject: 'Tu código de verificación - Portal de Empleo',
          html: `
            <h2>¡Hola ${full_name}!</h2>
            <p>Tu código de verificación es:</p>
            <h1 style="font-size: 32px; letter-spacing: 5px; text-align: center; background: #f0f0f0; padding: 20px; border-radius: 8px;">
              ${verificationCode}
            </h1>
            <p>Este código expira en 15 minutos.</p>
            <p>Si no solicitaste este código, ignora este email.</p>
          `
        });
      } catch (emailError) {
        console.error('⚠️ Error enviando email de verificación:', emailError);
      }
    }

    res.json({
      success: true,
      message: 'Código de verificación enviado a tu email',
      candidateId: candidate.id
    });

  } catch (error) {
    console.error('❌ [CANDIDATES] Error en registro:', error);
    res.status(500).json({
      success: false,
      error: 'Error al registrar candidato'
    });
  }
});

/**
 * POST /api/job-postings/public/candidates/verify
 * Verificar código y devolver token
 */
router.post('/public/candidates/verify', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        error: 'Email y código son requeridos'
      });
    }

    const candidate = await CandidateProfile.findOne({ where: { email } });

    if (!candidate) {
      return res.status(404).json({
        success: false,
        error: 'Candidato no encontrado'
      });
    }

    if (!candidate.isCodeValid(code)) {
      return res.status(400).json({
        success: false,
        error: 'Código inválido o expirado'
      });
    }

    // Marcar como verificado
    await candidate.update({
      is_verified: true,
      verification_code: null,
      verification_code_expires: null,
      last_login: new Date()
    });

    // Generar token JWT (expira en 24h)
    const token = jwt.sign(
      {
        candidateId: candidate.id,
        email: candidate.email,
        type: 'candidate'
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Email verificado correctamente',
      token,
      profile: {
        id: candidate.id,
        email: candidate.email,
        full_name: candidate.full_name,
        is_verified: true,
        has_complete_profile: !!(candidate.skills?.length > 0 && candidate.professional_title)
      }
    });

  } catch (error) {
    console.error('❌ [CANDIDATES] Error en verificación:', error);
    res.status(500).json({
      success: false,
      error: 'Error al verificar código'
    });
  }
});

/**
 * POST /api/job-postings/public/candidates/login
 * Login de candidato existente - Envía código por email
 */
router.post('/public/candidates/login', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email es requerido'
      });
    }

    const candidate = await CandidateProfile.findOne({ where: { email, is_verified: true } });

    if (!candidate) {
      return res.status(404).json({
        success: false,
        error: 'Candidato no encontrado o no verificado'
      });
    }

    // Generar código de verificación
    const verificationCode = candidate.generateVerificationCode();
    await candidate.save();

    // Enviar email con código
    if (EmailService) {
      try {
        await EmailService.sendEmail({
          to: email,
          subject: 'Tu código de acceso - Portal de Empleo',
          html: `
            <h2>¡Hola ${candidate.full_name}!</h2>
            <p>Tu código de acceso es:</p>
            <h1 style="font-size: 32px; letter-spacing: 5px; text-align: center; background: #f0f0f0; padding: 20px; border-radius: 8px;">
              ${verificationCode}
            </h1>
            <p>Este código expira en 15 minutos.</p>
          `
        });
      } catch (emailError) {
        console.error('⚠️ Error enviando email de login:', emailError);
      }
    }

    res.json({
      success: true,
      message: 'Código de acceso enviado a tu email'
    });

  } catch (error) {
    console.error('❌ [CANDIDATES] Error en login:', error);
    res.status(500).json({
      success: false,
      error: 'Error al iniciar sesión'
    });
  }
});

/**
 * GET /api/job-postings/public/candidates/me
 * Obtener perfil del candidato actual
 */
router.get('/public/candidates/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Token de autenticación requerido'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.type !== 'candidate') {
      return res.status(403).json({
        success: false,
        error: 'Token no válido para candidatos'
      });
    }

    const candidate = await CandidateProfile.findByPk(decoded.candidateId);

    if (!candidate) {
      return res.status(404).json({
        success: false,
        error: 'Candidato no encontrado'
      });
    }

    res.json({
      success: true,
      profile: {
        id: candidate.id,
        email: candidate.email,
        full_name: candidate.full_name,
        phone: candidate.phone,
        location: candidate.location,
        professional_title: candidate.professional_title,
        years_experience: candidate.years_experience,
        skills: candidate.skills,
        education: candidate.education,
        experience: candidate.experience,
        preferences: candidate.preferences,
        visibility: candidate.visibility,
        cv_original_name: candidate.cv_original_name,
        has_cv: !!candidate.cv_file_path,
        profile_views: candidate.profile_views,
        created_at: candidate.created_at
      }
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token inválido o expirado'
      });
    }
    console.error('❌ [CANDIDATES] Error obteniendo perfil:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener perfil'
    });
  }
});

/**
 * PUT /api/job-postings/public/candidates/profile
 * Actualizar perfil del candidato
 */
router.put('/public/candidates/profile', upload.single('cv'), async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Token de autenticación requerido'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.type !== 'candidate') {
      return res.status(403).json({
        success: false,
        error: 'Token no válido para candidatos'
      });
    }

    const candidate = await CandidateProfile.findByPk(decoded.candidateId);

    if (!candidate) {
      return res.status(404).json({
        success: false,
        error: 'Candidato no encontrado'
      });
    }

    // Parsear datos del body (pueden venir como JSON string en FormData)
    const updateData = {};
    const fields = ['full_name', 'phone', 'professional_title', 'years_experience', 'visibility'];

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    // Campos JSON
    const jsonFields = ['location', 'skills', 'education', 'experience', 'preferences'];
    for (const field of jsonFields) {
      if (req.body[field]) {
        try {
          updateData[field] = typeof req.body[field] === 'string'
            ? JSON.parse(req.body[field])
            : req.body[field];
        } catch (e) {
          console.warn(`⚠️ Error parseando ${field}:`, e.message);
        }
      }
    }

    // Si se subió CV
    if (req.file) {
      // Eliminar CV anterior si existe
      if (candidate.cv_file_path && fs.existsSync(candidate.cv_file_path)) {
        try {
          fs.unlinkSync(candidate.cv_file_path);
        } catch (e) {
          console.warn('⚠️ No se pudo eliminar CV anterior:', e.message);
        }
      }
      updateData.cv_file_path = req.file.path;
      updateData.cv_original_name = req.file.originalname;
    }

    await candidate.update(updateData);

    res.json({
      success: true,
      message: 'Perfil actualizado correctamente',
      profile: {
        id: candidate.id,
        full_name: candidate.full_name,
        professional_title: candidate.professional_title,
        skills: candidate.skills,
        has_cv: !!candidate.cv_file_path
      }
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token inválido o expirado'
      });
    }
    console.error('❌ [CANDIDATES] Error actualizando perfil:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar perfil'
    });
  }
});

/**
 * GET /api/job-postings/public/candidates/pool
 * Buscar en pool de candidatos (público, datos básicos)
 */
router.get('/public/candidates/pool', async (req, res) => {
  try {
    const { skills, experience_min, location, page = 1, limit = 20 } = req.query;

    const result = await CandidateProfile.searchPool({
      skills: skills ? skills.split(',') : null,
      experience_min,
      location,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('❌ [CANDIDATES] Error buscando pool:', error);
    res.status(500).json({
      success: false,
      error: 'Error al buscar candidatos'
    });
  }
});

/**
 * GET /api/job-postings/public/candidates/pool/stats
 * Estadísticas del pool de candidatos
 */
router.get('/public/candidates/pool/stats', async (req, res) => {
  try {
    const stats = await CandidateProfile.findAll({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN is_verified = true THEN 1 END')), 'verified'],
        [sequelize.fn('AVG', sequelize.col('years_experience')), 'avgExperience']
      ],
      where: {
        status: 'active',
        visibility: 'public'
      },
      raw: true
    });

    res.json({
      success: true,
      stats: {
        totalCandidates: parseInt(stats[0]?.total) || 0,
        verifiedCandidates: parseInt(stats[0]?.verified) || 0,
        avgExperience: parseFloat(stats[0]?.avgExperience) || 0
      }
    });

  } catch (error) {
    console.error('❌ [CANDIDATES] Error obteniendo stats:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas'
    });
  }
});

// Middleware de autenticación para todas las rutas siguientes
router.use(authMiddleware);

// ============================================================================
// ENDPOINTS PARA POOL DE CVs (Requieren auth de empresa)
// ============================================================================

/**
 * GET /api/job-postings/candidates/pool
 * Empresas: Ver pool de candidatos con datos completos
 */
router.get('/candidates/pool', async (req, res) => {
  try {
    const context = buildContext(req);
    const { skills, experience_min, location, page = 1, limit = 20 } = req.query;

    const result = await CandidateProfile.searchPool({
      skills: skills ? skills.split(',') : null,
      experience_min,
      location,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    // Para empresas autenticadas, incrementar contador de vistas
    // (implementación simplificada)

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('❌ [CANDIDATES] Error buscando pool (auth):', error);
    res.status(500).json({
      success: false,
      error: 'Error al buscar candidatos'
    });
  }
});

/**
 * GET /api/job-postings/candidates/pool/:id
 * Empresas: Ver detalle de candidato
 */
router.get('/candidates/pool/:id', async (req, res) => {
  try {
    const context = buildContext(req);
    const { id } = req.params;

    const candidate = await CandidateProfile.findOne({
      where: {
        id,
        status: 'active',
        visibility: 'public',
        is_verified: true
      }
    });

    if (!candidate) {
      return res.status(404).json({
        success: false,
        error: 'Candidato no encontrado o no disponible'
      });
    }

    // Incrementar contador de vistas
    await candidate.increment('profile_views');

    res.json({
      success: true,
      candidate: {
        id: candidate.id,
        full_name: candidate.full_name,
        professional_title: candidate.professional_title,
        location: candidate.location,
        years_experience: candidate.years_experience,
        skills: candidate.skills,
        education: candidate.education,
        experience: candidate.experience,
        preferences: {
          work_mode: candidate.preferences?.work_mode,
          availability: candidate.preferences?.availability,
          willing_to_relocate: candidate.preferences?.willing_to_relocate
        },
        has_cv: !!candidate.cv_file_path,
        cv_download_url: candidate.cv_file_path
          ? `/api/job-postings/candidates/pool/${candidate.id}/cv`
          : null,
        profile_views: candidate.profile_views + 1,
        created_at: candidate.created_at
      }
    });

  } catch (error) {
    console.error('❌ [CANDIDATES] Error obteniendo candidato:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener candidato'
    });
  }
});

/**
 * GET /api/job-postings/candidates/pool/:id/cv
 * Empresas: Descargar CV de candidato
 */
router.get('/candidates/pool/:id/cv', async (req, res) => {
  try {
    const { id } = req.params;

    const candidate = await CandidateProfile.findOne({
      where: {
        id,
        status: 'active',
        visibility: 'public',
        is_verified: true
      }
    });

    if (!candidate || !candidate.cv_file_path) {
      return res.status(404).json({
        success: false,
        error: 'CV no encontrado'
      });
    }

    if (!fs.existsSync(candidate.cv_file_path)) {
      return res.status(404).json({
        success: false,
        error: 'Archivo CV no encontrado en servidor'
      });
    }

    res.download(candidate.cv_file_path, candidate.cv_original_name || 'cv.pdf');

  } catch (error) {
    console.error('❌ [CANDIDATES] Error descargando CV:', error);
    res.status(500).json({
      success: false,
      error: 'Error al descargar CV'
    });
  }
});

/**
 * POST /api/job-postings/candidates/pool/:id/import
 * Empresas: Importar candidato del pool a una oferta específica
 */
router.post('/candidates/pool/:id/import', async (req, res) => {
  try {
    const context = buildContext(req);
    const { id } = req.params;
    const { job_posting_id } = req.body;

    if (!job_posting_id) {
      return res.status(400).json({
        success: false,
        error: 'job_posting_id es requerido'
      });
    }

    // Verificar que la oferta existe y pertenece a la empresa
    const jobPosting = await JobPosting.findOne({
      where: {
        id: job_posting_id,
        company_id: context.companyId
      }
    });

    if (!jobPosting) {
      return res.status(404).json({
        success: false,
        error: 'Oferta laboral no encontrada'
      });
    }

    // Obtener candidato del pool
    const candidate = await CandidateProfile.findOne({
      where: {
        id,
        status: 'active',
        is_verified: true
      }
    });

    if (!candidate) {
      return res.status(404).json({
        success: false,
        error: 'Candidato no encontrado en pool'
      });
    }

    // Verificar si ya existe una postulación
    const existingApplication = await JobApplication.findOne({
      where: {
        job_posting_id,
        candidate_email: candidate.email
      }
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        error: 'Este candidato ya tiene una postulación para esta oferta'
      });
    }

    // Crear JobApplication a partir del CandidateProfile
    const application = await JobApplication.create({
      job_posting_id,
      company_id: context.companyId,
      candidate_name: candidate.full_name,
      candidate_email: candidate.email,
      candidate_phone: candidate.phone,
      candidate_location: candidate.location?.city || '',
      professional_title: candidate.professional_title,
      years_experience: candidate.years_experience,
      skills: candidate.skills,
      education_summary: JSON.stringify(candidate.education),
      experience_summary: JSON.stringify(candidate.experience),
      cv_path: candidate.cv_file_path,
      cv_original_name: candidate.cv_original_name,
      source: 'cv_pool',
      status: 'new',
      imported_from_pool: true,
      pool_profile_id: candidate.id,
      imported_by: context.userId,
      imported_at: new Date()
    });

    res.json({
      success: true,
      message: 'Candidato importado al pipeline exitosamente',
      application: {
        id: application.id,
        candidate_name: application.candidate_name,
        status: application.status,
        job_posting_id: application.job_posting_id
      }
    });

  } catch (error) {
    console.error('❌ [CANDIDATES] Error importando candidato:', error);
    res.status(500).json({
      success: false,
      error: 'Error al importar candidato'
    });
  }
});

// ============================================================================
// ENDPOINTS PARA OFERTAS LABORALES (JobPosting) - REQUIEREN AUTH
// ============================================================================

/**
 * GET /api/job-postings/offers
 * Obtener todas las ofertas de la empresa
 */
router.get('/offers', async (req, res) => {
  try {
    const context = buildContext(req);
    console.log(`📋 [JOB-POSTINGS] Obteniendo ofertas para company_id=${context.companyId}`);

    const { status, department_id, job_type, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Construir filtros
    const where = {
      company_id: context.companyId
    };

    if (status && status !== 'all') {
      where.status = status;
    }

    if (department_id && department_id !== 'all') {
      where.department_id = parseInt(department_id);
    }

    if (job_type && job_type !== 'all') {
      where.job_type = job_type;
    }

    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: offers } = await JobPosting.findAndCountAll({
      where,
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['user_id', 'firstName', 'lastName']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      offers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('❌ [JOB-POSTINGS] Error obteniendo ofertas:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al obtener ofertas'
    });
  }
});

/**
 * GET /api/job-postings/offers/:id
 * Obtener detalle de una oferta
 */
router.get('/offers/:id', async (req, res) => {
  try {
    const context = buildContext(req);
    const { id } = req.params;

    const offer = await JobPosting.findOne({
      where: {
        id,
        company_id: context.companyId
      },
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['user_id', 'firstName', 'lastName']
        },
        {
          model: User,
          as: 'hiringManager',
          attributes: ['user_id', 'firstName', 'lastName']
        },
        {
          model: User,
          as: 'recruiter',
          attributes: ['user_id', 'firstName', 'lastName']
        }
      ]
    });

    if (!offer) {
      return res.status(404).json({
        success: false,
        error: 'Oferta no encontrada'
      });
    }

    res.json({
      success: true,
      offer
    });

  } catch (error) {
    console.error('❌ [JOB-POSTINGS] Error obteniendo oferta:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al obtener oferta'
    });
  }
});

/**
 * POST /api/job-postings/offers
 * Crear nueva oferta laboral
 */
router.post('/offers', [
  body('title').notEmpty().withMessage('El título es requerido'),
  body('description').notEmpty().withMessage('La descripción es requerida')
], async (req, res) => {
  try {
    const context = buildContext(req);
    console.log(`➕ [JOB-POSTINGS] Creando oferta para company_id=${context.companyId}`);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Datos de entrada inválidos',
        details: errors.array()
      });
    }

    const data = req.body;

    const offer = await JobPosting.create({
      company_id: context.companyId,
      title: data.title,
      description: data.description,
      requirements: data.requirements || null,
      responsibilities: data.responsibilities || null,
      department_id: data.department_id || null,
      department_name: data.department_name || null,
      location: data.location || null,
      job_type: data.job_type || 'full-time',
      salary_min: data.salary_min || null,
      salary_max: data.salary_max || null,
      salary_currency: data.salary_currency || 'ARS',
      salary_period: data.salary_period || 'monthly',
      benefits: data.benefits || [],
      status: data.status || 'draft',
      is_public: data.is_public !== false,
      is_internal: data.is_internal || false,
      // Campos de búsqueda interna
      search_scope: data.search_scope || 'external',
      internal_matching_enabled: data.internal_matching_enabled !== false,
      internal_matching_criteria: data.internal_matching_criteria || {
        match_skills: true,
        match_experience: true,
        match_certifications: true,
        match_education: true,
        min_match_score: 50
      },
      max_applications: data.max_applications || null,
      auto_close_date: data.auto_close_date || null,
      requires_cv: data.requires_cv !== false,
      requires_cover_letter: data.requires_cover_letter || false,
      tags: data.tags || [],
      skills_required: data.skills_required || [],
      hiring_manager_id: data.hiring_manager_id || null,
      recruiter_id: data.recruiter_id || null,
      created_by: context.userId
    });

    console.log(`✅ [JOB-POSTINGS] Oferta creada: ID=${offer.id}`);

    res.status(201).json({
      success: true,
      offer,
      message: 'Oferta laboral creada exitosamente'
    });

  } catch (error) {
    console.error('❌ [JOB-POSTINGS] Error creando oferta:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al crear oferta'
    });
  }
});

/**
 * PUT /api/job-postings/offers/:id
 * Actualizar oferta laboral
 */
router.put('/offers/:id', async (req, res) => {
  try {
    const context = buildContext(req);
    const { id } = req.params;

    const offer = await JobPosting.findOne({
      where: {
        id,
        company_id: context.companyId
      }
    });

    if (!offer) {
      return res.status(404).json({
        success: false,
        error: 'Oferta no encontrada'
      });
    }

    const allowedFields = [
      'title', 'description', 'requirements', 'responsibilities',
      'department_id', 'department_name', 'location', 'job_type',
      'salary_min', 'salary_max', 'salary_currency', 'salary_period',
      'benefits', 'status', 'is_public', 'is_internal',
      // Campos de búsqueda interna
      'search_scope', 'internal_matching_enabled', 'internal_matching_criteria',
      'max_applications', 'auto_close_date', 'requires_cv',
      'requires_cover_letter', 'tags', 'skills_required',
      'hiring_manager_id', 'recruiter_id'
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        offer[field] = req.body[field];
      }
    }

    // Si se publica, registrar fecha
    if (req.body.status === 'active' && !offer.posted_at) {
      offer.posted_at = new Date();
    }

    // Si se cierra, registrar fecha
    if (['closed', 'filled'].includes(req.body.status) && !offer.closed_at) {
      offer.closed_at = new Date();
    }

    await offer.save();

    console.log(`✅ [JOB-POSTINGS] Oferta actualizada: ID=${offer.id}`);

    res.json({
      success: true,
      offer,
      message: 'Oferta actualizada exitosamente'
    });

  } catch (error) {
    console.error('❌ [JOB-POSTINGS] Error actualizando oferta:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al actualizar oferta'
    });
  }
});

/**
 * DELETE /api/job-postings/offers/:id
 * Eliminar/cerrar oferta
 */
router.delete('/offers/:id', async (req, res) => {
  try {
    const context = buildContext(req);
    const { id } = req.params;

    const offer = await JobPosting.findOne({
      where: {
        id,
        company_id: context.companyId
      }
    });

    if (!offer) {
      return res.status(404).json({
        success: false,
        error: 'Oferta no encontrada'
      });
    }

    // Verificar si tiene postulaciones
    const applicationCount = await JobApplication.count({
      where: { job_posting_id: id }
    });

    if (applicationCount > 0) {
      // Solo cerrar, no eliminar
      offer.status = 'closed';
      offer.closed_at = new Date();
      await offer.save();

      return res.json({
        success: true,
        message: `Oferta cerrada (tiene ${applicationCount} postulaciones asociadas)`,
        closed: true
      });
    }

    // Si no tiene postulaciones, eliminar
    await offer.destroy();

    console.log(`✅ [JOB-POSTINGS] Oferta eliminada: ID=${id}`);

    res.json({
      success: true,
      message: 'Oferta eliminada exitosamente'
    });

  } catch (error) {
    console.error('❌ [JOB-POSTINGS] Error eliminando oferta:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al eliminar oferta'
    });
  }
});

/**
 * POST /api/job-postings/offers/:id/publish
 * Publicar oferta (auto-dispara matching interno si aplica)
 */
router.post('/offers/:id/publish', async (req, res) => {
  try {
    const context = buildContext(req);
    const { id } = req.params;

    const offer = await JobPosting.findOne({
      where: {
        id,
        company_id: context.companyId
      }
    });

    if (!offer) {
      return res.status(404).json({
        success: false,
        error: 'Oferta no encontrada'
      });
    }

    await offer.publish();

    let internalMatchingResult = null;

    // AUTO-TRIGGER: Si la búsqueda incluye candidatos internos, ejecutar matching
    if (['internal', 'both'].includes(offer.search_scope) && offer.internal_matching_enabled) {
      console.log(`🔍 [JOB-POSTINGS] Auto-ejecutando matching interno para oferta ${id}`);
      try {
        const matchingService = new InternalCandidateMatchingService(context.companyId);
        internalMatchingResult = await matchingService.executeMatching(offer);
        console.log(`✅ [JOB-POSTINGS] Matching completado: ${internalMatchingResult.candidatesNotified} candidatos notificados`);
      } catch (matchError) {
        console.error('⚠️ [JOB-POSTINGS] Error en matching interno:', matchError);
        internalMatchingResult = { error: matchError.message, candidatesNotified: 0 };
      }
    }

    res.json({
      success: true,
      offer,
      internalMatching: internalMatchingResult,
      message: internalMatchingResult
        ? `Oferta publicada. ${internalMatchingResult.candidatesNotified || 0} candidatos internos notificados.`
        : 'Oferta publicada exitosamente'
    });

  } catch (error) {
    console.error('❌ [JOB-POSTINGS] Error publicando oferta:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al publicar oferta'
    });
  }
});

/**
 * POST /api/job-postings/offers/:id/run-internal-matching
 * Ejecutar matching de candidatos internos manualmente
 */
router.post('/offers/:id/run-internal-matching', async (req, res) => {
  try {
    const context = buildContext(req);
    const { id } = req.params;
    const { force = false, min_score } = req.body;

    const offer = await JobPosting.findOne({
      where: {
        id,
        company_id: context.companyId
      }
    });

    if (!offer) {
      return res.status(404).json({
        success: false,
        error: 'Oferta no encontrada'
      });
    }

    // Verificar que la oferta esté activa
    if (offer.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'La oferta debe estar activa para ejecutar el matching'
      });
    }

    // Verificar que la oferta tenga búsqueda interna habilitada
    if (!['internal', 'both'].includes(offer.search_scope)) {
      return res.status(400).json({
        success: false,
        error: 'Esta oferta no tiene habilitada la búsqueda interna',
        hint: 'Cambie el campo search_scope a "internal" o "both"'
      });
    }

    console.log(`🔍 [JOB-POSTINGS] Ejecutando matching interno manual para oferta ${id}`);

    // Crear servicio de matching
    const matchingService = new InternalCandidateMatchingService(context.companyId);

    // Ejecutar matching
    const result = await matchingService.executeMatching(offer, {
      forceResend: force,
      minScore: min_score || offer.internal_matching_criteria?.min_match_score || 50
    });

    console.log(`✅ [JOB-POSTINGS] Matching completado: ${result.candidatesNotified} candidatos notificados`);

    res.json({
      success: true,
      result,
      message: `Matching ejecutado. ${result.candidatesNotified} candidatos internos notificados.`
    });

  } catch (error) {
    console.error('❌ [JOB-POSTINGS] Error ejecutando matching interno:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al ejecutar matching interno'
    });
  }
});

/**
 * GET /api/job-postings/offers/:id/internal-candidates
 * Obtener candidatos internos que hacen match con la oferta
 */
router.get('/offers/:id/internal-candidates', async (req, res) => {
  try {
    const context = buildContext(req);
    const { id } = req.params;
    const { show_all = false } = req.query;

    const offer = await JobPosting.findOne({
      where: {
        id,
        company_id: context.companyId
      }
    });

    if (!offer) {
      return res.status(404).json({
        success: false,
        error: 'Oferta no encontrada'
      });
    }

    // Crear servicio de matching
    const matchingService = new InternalCandidateMatchingService(context.companyId);

    // Obtener candidatos con preview (sin enviar notificaciones)
    const candidates = await matchingService.getMatchingCandidates(offer, {
      showAll: show_all === 'true',
      includeNotified: true
    });

    // Enriquecer con info de si ya fueron notificados
    const notifiedIds = offer.internal_candidates_notified || [];
    const enrichedCandidates = candidates.map(c => ({
      ...c,
      already_notified: notifiedIds.includes(c.user_id),
      notified_at: notifiedIds.includes(c.user_id) ? offer.internal_matching_executed_at : null
    }));

    res.json({
      success: true,
      candidates: enrichedCandidates,
      total: enrichedCandidates.length,
      alreadyNotified: enrichedCandidates.filter(c => c.already_notified).length,
      pendingNotification: enrichedCandidates.filter(c => !c.already_notified).length,
      matchingCriteria: offer.internal_matching_criteria,
      lastExecutedAt: offer.internal_matching_executed_at
    });

  } catch (error) {
    console.error('❌ [JOB-POSTINGS] Error obteniendo candidatos internos:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al obtener candidatos internos'
    });
  }
});

// ============================================================================
// ENDPOINTS PARA POSTULACIONES (JobApplication)
// ============================================================================

/**
 * GET /api/job-postings/applications
 * Obtener todas las postulaciones de la empresa
 */
router.get('/applications', async (req, res) => {
  try {
    const context = buildContext(req);
    console.log(`👥 [JOB-POSTINGS] Obteniendo postulaciones para company_id=${context.companyId}`);

    const {
      job_posting_id,
      status,
      search,
      page = 1,
      limit = 20
    } = req.query;
    const offset = (page - 1) * limit;

    const where = {
      company_id: context.companyId
    };

    if (job_posting_id) {
      where.job_posting_id = parseInt(job_posting_id);
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (search) {
      where[Op.or] = [
        { candidate_first_name: { [Op.iLike]: `%${search}%` } },
        { candidate_last_name: { [Op.iLike]: `%${search}%` } },
        { candidate_email: { [Op.iLike]: `%${search}%` } },
        { candidate_dni: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: applications } = await JobApplication.findAndCountAll({
      where,
      include: [
        {
          model: JobPosting,
          as: 'jobPosting',
          attributes: ['id', 'title', 'department_name', 'location']
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['user_id', 'firstName', 'lastName']
        },
        {
          model: User,
          as: 'adminApprover',
          attributes: ['user_id', 'firstName', 'lastName']
        }
      ],
      order: [['applied_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      applications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('❌ [JOB-POSTINGS] Error obteniendo postulaciones:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al obtener postulaciones'
    });
  }
});

/**
 * GET /api/job-postings/applications/:id
 * Obtener detalle de una postulación
 */
router.get('/applications/:id', async (req, res) => {
  try {
    const context = buildContext(req);
    const { id } = req.params;

    const application = await JobApplication.findOne({
      where: {
        id,
        company_id: context.companyId
      },
      include: [
        {
          model: JobPosting,
          as: 'jobPosting',
          attributes: ['id', 'title', 'department_name', 'location', 'job_type']
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['user_id', 'firstName', 'lastName']
        },
        {
          model: User,
          as: 'interviewer',
          attributes: ['user_id', 'firstName', 'lastName']
        },
        {
          model: User,
          as: 'adminApprover',
          attributes: ['user_id', 'firstName', 'lastName']
        },
        {
          model: User,
          as: 'medicalApprover',
          attributes: ['user_id', 'firstName', 'lastName']
        },
        {
          model: MedicalRecord,
          as: 'medicalRecord',
          attributes: ['id', 'title', 'result', 'exam_date']
        }
      ]
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Postulación no encontrada'
      });
    }

    res.json({
      success: true,
      application
    });

  } catch (error) {
    console.error('❌ [JOB-POSTINGS] Error obteniendo postulación:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al obtener postulación'
    });
  }
});

/**
 * POST /api/job-postings/applications
 * Crear nueva postulación
 */
router.post('/applications', upload.single('cv'), async (req, res) => {
  try {
    const context = buildContext(req);
    console.log(`📝 [JOB-POSTINGS] Creando postulación para company_id=${context.companyId}`);

    const data = req.body;

    // Validar campos requeridos
    if (!data.job_posting_id) {
      return res.status(400).json({
        success: false,
        error: 'job_posting_id es requerido'
      });
    }

    if (!data.candidate_first_name || !data.candidate_last_name || !data.candidate_email) {
      return res.status(400).json({
        success: false,
        error: 'Nombre, apellido y email del candidato son requeridos'
      });
    }

    // Verificar que la oferta existe y está activa
    const jobPosting = await JobPosting.findOne({
      where: {
        id: data.job_posting_id,
        company_id: context.companyId,
        status: 'active'
      }
    });

    if (!jobPosting) {
      return res.status(400).json({
        success: false,
        error: 'Oferta no encontrada o no está activa'
      });
    }

    // Verificar si ya postuló
    const alreadyApplied = await JobApplication.hasApplied(
      data.candidate_email,
      data.job_posting_id
    );

    if (alreadyApplied) {
      return res.status(400).json({
        success: false,
        error: 'Este candidato ya postuló a esta oferta'
      });
    }

    // Manejar CV subido
    let cvData = {};
    if (req.file) {
      cvData = {
        cv_file_path: req.file.path,
        cv_file_name: req.file.originalname,
        cv_uploaded_at: new Date()
      };
    }

    const application = await JobApplication.create({
      company_id: context.companyId,
      job_posting_id: data.job_posting_id,
      candidate_first_name: data.candidate_first_name,
      candidate_last_name: data.candidate_last_name,
      candidate_email: data.candidate_email,
      candidate_phone: data.candidate_phone || null,
      candidate_dni: data.candidate_dni || null,
      candidate_birth_date: data.candidate_birth_date || null,
      candidate_gender: data.candidate_gender || null,
      candidate_nationality: data.candidate_nationality || null,
      candidate_address: data.candidate_address || null,
      candidate_city: data.candidate_city || null,
      candidate_province: data.candidate_province || null,
      candidate_postal_code: data.candidate_postal_code || null,
      experience_years: data.experience_years || null,
      current_position: data.current_position || null,
      current_company: data.current_company || null,
      education_level: data.education_level || null,
      education_title: data.education_title || null,
      skills: data.skills || [],
      languages: data.languages || [],
      certifications: data.certifications || [],
      ...cvData,
      cover_letter: data.cover_letter || null,
      salary_expectation: data.salary_expectation || null,
      availability: data.availability || null,
      preferred_schedule: data.preferred_schedule || null,
      willing_to_relocate: data.willing_to_relocate || false,
      source: data.source || 'portal',
      referrer_employee_id: data.referrer_employee_id || null,
      status: 'nuevo',
      status_history: [{
        from_status: null,
        to_status: 'nuevo',
        changed_at: new Date().toISOString(),
        changed_by: context.userId,
        notes: 'Postulación recibida'
      }]
    });

    console.log(`✅ [JOB-POSTINGS] Postulación creada: ID=${application.id}`);

    res.status(201).json({
      success: true,
      application,
      message: 'Postulación enviada exitosamente'
    });

  } catch (error) {
    console.error('❌ [JOB-POSTINGS] Error creando postulación:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al crear postulación'
    });
  }
});

/**
 * PUT /api/job-postings/applications/:id/status
 * Cambiar estado de postulación (flujo principal)
 */
router.put('/applications/:id/status', async (req, res) => {
  try {
    const context = buildContext(req);
    const { id } = req.params;
    const { status, notes } = req.body;

    const application = await JobApplication.findOne({
      where: {
        id,
        company_id: context.companyId
      }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Postulación no encontrada'
      });
    }

    // Validar estado
    const validStatuses = Object.values(JobApplication.STATUSES);
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Estado inválido. Válidos: ${validStatuses.join(', ')}`
      });
    }

    // Cambiar estado con tracking
    await application.changeStatus(status, context.userId, notes || '');

    console.log(`✅ [JOB-POSTINGS] Estado cambiado: ID=${id}, ${application.status} → ${status}`);

    res.json({
      success: true,
      application,
      message: 'Estado actualizado exitosamente'
    });

  } catch (error) {
    console.error('❌ [JOB-POSTINGS] Error cambiando estado:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al cambiar estado'
    });
  }
});

/**
 * POST /api/job-postings/applications/:id/review
 * Marcar como revisado por RRHH
 */
router.post('/applications/:id/review', async (req, res) => {
  try {
    const context = buildContext(req);
    const { id } = req.params;
    const { notes, score } = req.body;

    const application = await JobApplication.findOne({
      where: {
        id,
        company_id: context.companyId
      }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Postulación no encontrada'
      });
    }

    application.reviewed_by = context.userId;
    application.reviewed_at = new Date();
    application.review_notes = notes || '';
    application.review_score = score || null;

    await application.changeStatus('revision', context.userId, notes || 'Revisión RRHH');

    res.json({
      success: true,
      application,
      message: 'Postulación marcada como revisada'
    });

  } catch (error) {
    console.error('❌ [JOB-POSTINGS] Error marcando revisión:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al marcar revisión'
    });
  }
});

/**
 * POST /api/job-postings/applications/:id/approve-admin
 * Aprobación administrativa (DISPARA NOTIFICACIÓN AL MÉDICO)
 */
router.post('/applications/:id/approve-admin', async (req, res) => {
  try {
    const context = buildContext(req);
    const { id } = req.params;
    const { notes } = req.body;

    const application = await JobApplication.findOne({
      where: {
        id,
        company_id: context.companyId
      },
      include: [{
        model: JobPosting,
        as: 'jobPosting',
        attributes: ['id', 'title', 'department_name']
      }]
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Postulación no encontrada'
      });
    }

    // Aprobar administrativamente
    const result = await application.approveAdministrative(context.userId, notes || '');

    // AQUÍ SE DISPARA LA NOTIFICACIÓN AL MÉDICO
    if (result.shouldNotifyMedical) {
      console.log(`🔔 [JOB-POSTINGS] DISPARANDO NOTIFICACIÓN AL MÉDICO para candidato ${application.getFullName()}`);

      try {
        // 1. Buscar médicos de la empresa
        const medicos = await User.findAll({
          where: {
            company_id: context.companyId,
            role: 'medical',
            is_active: true
          },
          attributes: ['user_id', 'firstName', 'lastName', 'email', 'employeeId']
        });

        if (medicos.length > 0) {
          // 2. Crear grupo de notificación
          const notificationGroup = await inboxService.createNotificationGroup(context.companyId, {
            group_type: 'preocupacional_exam_request',
            initiator_type: 'system',
            initiator_id: context.userId,
            subject: `📋 Examen Preocupacional Requerido: ${application.getFullName()}`,
            priority: 'high',
            metadata: {
              application_id: application.id,
              candidate_name: application.getFullName(),
              candidate_email: application.candidate_email,
              candidate_dni: application.candidate_dni,
              job_posting_id: application.job_posting_id,
              job_title: application.jobPosting?.title || 'Puesto no especificado',
              department: application.jobPosting?.department_name || null,
              workflow_type: 'job_application_approved'
            }
          });

          // 3. Enviar mensaje a cada médico
          for (const medico of medicos) {
            const medicoFullName = `${medico.firstName} ${medico.lastName}`;
            await inboxService.sendMessage(notificationGroup.id, context.companyId, {
              sender_type: 'system',
              sender_id: context.userId,
              sender_name: context.userName || 'Sistema RRHH',
              recipient_type: 'user',
              recipient_id: medico.user_id,
              recipient_name: medicoFullName,
              message_type: 'action_required',
              subject: `Examen Preocupacional Pendiente`,
              content: `
📋 **CANDIDATO APROBADO PARA EXAMEN PREOCUPACIONAL**

**Candidato:** ${application.getFullName()}
**DNI:** ${application.candidate_dni || 'No registrado'}
**Email:** ${application.candidate_email}
**Teléfono:** ${application.candidate_phone || 'No registrado'}

**Puesto:** ${application.jobPosting?.title || 'No especificado'}
**Departamento:** ${application.jobPosting?.department_name || 'No especificado'}

**Fecha de Aprobación RRHH:** ${new Date().toLocaleDateString('es-AR')}
${notes ? `**Notas RRHH:** ${notes}` : ''}

---
⚠️ **Acción requerida:** Programar y realizar examen preocupacional.
              `.trim(),
              deadline_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
              requires_response: true,
              channels: ['web', 'email']
            });

            console.log(`📧 [JOB-POSTINGS] Notificación enviada a médico: ${medicoFullName} (${medico.email})`);
          }

          application.notification_id = notificationGroup.id;
          console.log(`✅ [JOB-POSTINGS] Grupo de notificación creado: ID=${notificationGroup.id}`);
        } else {
          console.warn(`⚠️ [JOB-POSTINGS] No hay médicos registrados en la empresa ${context.companyId}`);
        }

        application.notification_sent_to_medical = true;
        application.notification_sent_at = new Date();
        await application.save();

      } catch (notifError) {
        console.error('❌ [JOB-POSTINGS] Error enviando notificación al médico:', notifError);
        // No fallar la operación si la notificación falla
      }
    }

    res.json({
      success: true,
      application,
      notifiedMedical: result.shouldNotifyMedical,
      message: 'Candidato aprobado administrativamente. Notificación enviada al médico.'
    });

  } catch (error) {
    console.error('❌ [JOB-POSTINGS] Error aprobando administrativamente:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al aprobar administrativamente'
    });
  }
});

/**
 * POST /api/job-postings/applications/:id/medical-result
 * Registrar resultado de examen médico
 */
router.post('/applications/:id/medical-result', async (req, res) => {
  try {
    const context = buildContext(req);
    const { id } = req.params;
    const { result, medical_record_id, observations, restrictions } = req.body;

    const application = await JobApplication.findOne({
      where: {
        id,
        company_id: context.companyId
      }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Postulación no encontrada'
      });
    }

    // Validar resultado
    const validResults = ['apto', 'apto_con_observaciones', 'no_apto'];
    if (!validResults.includes(result)) {
      return res.status(400).json({
        success: false,
        error: `Resultado inválido. Válidos: ${validResults.join(', ')}`
      });
    }

    // Registrar resultado médico
    const medicalResult = await application.setMedicalResult(
      result,
      medical_record_id || null,
      context.userId,
      observations || '',
      restrictions || []
    );

    console.log(`🩺 [JOB-POSTINGS] Resultado médico registrado: ${result} para postulación ${id}`);

    res.json({
      success: true,
      application,
      canBeHired: medicalResult.canBeHired,
      message: medicalResult.canBeHired
        ? 'Candidato APTO para contratar'
        : 'Candidato NO APTO médicamente'
    });

  } catch (error) {
    console.error('❌ [JOB-POSTINGS] Error registrando resultado médico:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al registrar resultado médico'
    });
  }
});

/**
 * POST /api/job-postings/applications/:id/hire
 * Contratar candidato (crear usuario/empleado)
 */
router.post('/applications/:id/hire', async (req, res) => {
  try {
    const context = buildContext(req);
    const { id } = req.params;
    const {
      start_date,
      department_id,
      position,
      salary,
      contract_type,
      employee_id // Si ya se creó el user
    } = req.body;

    const application = await JobApplication.findOne({
      where: {
        id,
        company_id: context.companyId
      }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Postulación no encontrada'
      });
    }

    // Verificar que esté apto
    if (!['apto', 'apto_con_observaciones'].includes(application.status)) {
      return res.status(400).json({
        success: false,
        error: 'El candidato debe estar APTO médicamente para ser contratado',
        currentStatus: application.status
      });
    }

    let employeeUserId = employee_id;
    let newUserCredentials = null;

    // Si no se proporciona employee_id, crear el usuario automáticamente
    if (!employeeUserId) {
      // Generar legajo único basado en empresa + secuencia
      const company = await Company.findByPk(context.companyId);
      const companySlug = company?.slug?.toUpperCase() || 'EMP';
      const userCount = await User.count({ where: { company_id: context.companyId } });
      const newEmployeeId = `${companySlug}-${String(userCount + 1).padStart(4, '0')}`;

      // Generar usuario (nombre.apellido en minúsculas)
      const baseUsername = `${application.candidate_first_name}.${application.candidate_last_name}`
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '.');

      // Verificar si el usuario ya existe
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [
            { email: application.candidate_email },
            { dni: application.candidate_dni }
          ],
          company_id: context.companyId
        }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Ya existe un usuario con este email o DNI',
          existingUserId: existingUser.user_id
        });
      }

      // Generar contraseña temporal (primeros 4 del DNI + nombre en minúsculas)
      const tempPassword = `${(application.candidate_dni || '1234').slice(0, 4)}${application.candidate_first_name.toLowerCase().slice(0, 4)}`;
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      // Crear el nuevo usuario/empleado
      const newUser = await User.create({
        companyId: context.companyId,
        company_id: context.companyId,
        employeeId: newEmployeeId,
        firstName: application.candidate_first_name,
        lastName: application.candidate_last_name,
        email: application.candidate_email,
        phone: application.candidate_phone,
        dni: application.candidate_dni,
        birthDate: application.candidate_birth_date,
        address: application.candidate_address,
        city: application.candidate_city,
        province: application.candidate_province,
        postal_code: application.candidate_postal_code,
        password: hashedPassword,
        usuario: baseUsername,
        role: 'employee',
        department_id: department_id,
        position: position,
        salary: salary,
        hireDate: start_date || new Date(),
        is_active: true,
        isActive: true,
        force_password_change: true,
        account_status: 'active'
      });

      employeeUserId = newUser.user_id;

      // Guardar credenciales para la respuesta
      newUserCredentials = {
        user_id: newUser.user_id,
        employeeId: newEmployeeId,
        username: baseUsername,
        email: application.candidate_email,
        temporaryPassword: tempPassword,
        mustChangePassword: true
      };

      console.log(`✅ [JOB-POSTINGS] Usuario creado automáticamente:`);
      console.log(`   ID: ${employeeUserId}`);
      console.log(`   Legajo: ${newEmployeeId}`);
      console.log(`   Usuario: ${baseUsername}`);
      console.log(`   Email: ${application.candidate_email}`);
      console.log(`   Contraseña temporal: ${tempPassword}`);
    }

    // Contratar
    await application.hire(context.userId, employeeUserId, {
      startDate: start_date,
      departmentId: department_id,
      position: position,
      salary: salary,
      contractType: contract_type
    });

    console.log(`🎉 [JOB-POSTINGS] Candidato CONTRATADO: ${application.getFullName()}, User ID: ${employeeUserId}`);

    const response = {
      success: true,
      application,
      employeeUserId,
      message: `¡${application.getFullName()} ha sido contratado exitosamente!`
    };

    // Incluir credenciales si se creó un nuevo usuario
    if (newUserCredentials) {
      response.newEmployee = newUserCredentials;
      response.message += ` Se ha creado el usuario ${newUserCredentials.username} con contraseña temporal.`;
    }

    res.json(response);

  } catch (error) {
    console.error('❌ [JOB-POSTINGS] Error contratando:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al contratar'
    });
  }
});

/**
 * POST /api/job-postings/applications/:id/reject
 * Rechazar candidato
 */
router.post('/applications/:id/reject', async (req, res) => {
  try {
    const context = buildContext(req);
    const { id } = req.params;
    const { reason, notes } = req.body;

    const application = await JobApplication.findOne({
      where: {
        id,
        company_id: context.companyId
      }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Postulación no encontrada'
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'El motivo de rechazo es requerido'
      });
    }

    await application.reject(context.userId, reason, notes || '');

    console.log(`❌ [JOB-POSTINGS] Candidato rechazado: ${application.getFullName()}`);

    res.json({
      success: true,
      application,
      message: 'Candidato rechazado'
    });

  } catch (error) {
    console.error('❌ [JOB-POSTINGS] Error rechazando:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al rechazar'
    });
  }
});

/**
 * GET /api/job-postings/applications/:id/cv
 * Descargar CV del candidato
 */
router.get('/applications/:id/cv', async (req, res) => {
  try {
    const context = buildContext(req);
    const { id } = req.params;

    const application = await JobApplication.findOne({
      where: {
        id,
        company_id: context.companyId
      },
      attributes: ['cv_file_path', 'cv_file_name']
    });

    if (!application || !application.cv_file_path) {
      return res.status(404).json({
        success: false,
        error: 'CV no encontrado'
      });
    }

    if (!fs.existsSync(application.cv_file_path)) {
      return res.status(404).json({
        success: false,
        error: 'Archivo CV no encontrado en el servidor'
      });
    }

    res.download(application.cv_file_path, application.cv_file_name);

  } catch (error) {
    console.error('❌ [JOB-POSTINGS] Error descargando CV:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al descargar CV'
    });
  }
});

// ============================================================================
// ENDPOINTS PARA VISTA MÉDICA (Candidatos pendientes de preocupacional)
// ============================================================================

/**
 * GET /api/job-postings/pending-medical
 * Candidatos pendientes de examen preocupacional (para médicos)
 */
router.get('/pending-medical', async (req, res) => {
  try {
    const context = buildContext(req);
    console.log(`🩺 [JOB-POSTINGS] Obteniendo candidatos pendientes de examen médico`);

    const applications = await JobApplication.getPendingMedicalExam(context.companyId);

    // Enriquecer con datos de la oferta
    const enriched = await Promise.all(applications.map(async (app) => {
      const jobPosting = await JobPosting.findByPk(app.job_posting_id, {
        attributes: ['id', 'title', 'department_name', 'location']
      });

      return {
        ...app.toJSON(),
        jobPosting,
        candidateFullName: app.getFullName(),
        daysSinceApproval: app.admin_approved_at
          ? Math.floor((new Date() - new Date(app.admin_approved_at)) / (1000 * 60 * 60 * 24))
          : null
      };
    }));

    res.json({
      success: true,
      applications: enriched,
      count: enriched.length
    });

  } catch (error) {
    console.error('❌ [JOB-POSTINGS] Error obteniendo pendientes médicos:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al obtener candidatos pendientes'
    });
  }
});

/**
 * GET /api/job-postings/ready-to-hire
 * Candidatos aptos para contratar
 */
router.get('/ready-to-hire', async (req, res) => {
  try {
    const context = buildContext(req);

    const applications = await JobApplication.getReadyToHire(context.companyId);

    const enriched = await Promise.all(applications.map(async (app) => {
      const jobPosting = await JobPosting.findByPk(app.job_posting_id, {
        attributes: ['id', 'title', 'department_name', 'location']
      });

      return {
        ...app.toJSON(),
        jobPosting,
        candidateFullName: app.getFullName()
      };
    }));

    res.json({
      success: true,
      applications: enriched,
      count: enriched.length
    });

  } catch (error) {
    console.error('❌ [JOB-POSTINGS] Error obteniendo listos para contratar:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al obtener candidatos'
    });
  }
});

// ============================================================================
// ENDPOINTS PARA ANALYTICS
// ============================================================================

/**
 * POST /api/job-postings/applications/:id/schedule-interview
 * Programar entrevista para un candidato
 */
router.post('/applications/:id/schedule-interview', async (req, res) => {
  try {
    const context = buildContext(req);
    const { id } = req.params;
    const {
      interview_date,
      interview_time,
      interview_location,
      interview_type,
      interviewer_id,
      interviewer_name,
      notes,
      bring_documents
    } = req.body;

    const application = await JobApplication.findOne({
      where: {
        id,
        company_id: context.companyId
      },
      include: [{
        model: JobPosting,
        as: 'jobPosting',
        attributes: ['id', 'title', 'department_name']
      }]
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Postulación no encontrada'
      });
    }

    // Actualizar datos de entrevista
    const scheduledAt = new Date(`${interview_date}T${interview_time}`);
    application.interview_scheduled_at = scheduledAt;
    application.interview_location = interview_location || 'Por confirmar';
    application.interview_type = interview_type || 'presencial';
    application.interviewer_id = interviewer_id || null;

    await application.changeStatus('entrevista_pendiente', context.userId, notes || 'Entrevista programada');

    // Enviar notificación al entrevistador
    if (interviewer_id) {
      try {
        const interviewer = await User.findByPk(interviewer_id);
        if (interviewer) {
          const notificationGroup = await inboxService.createNotificationGroup(context.companyId, {
            group_type: 'interview_scheduled',
            initiator_type: 'user',
            initiator_id: context.userId,
            subject: `📅 Entrevista Programada: ${application.getFullName()}`,
            priority: 'high',
            metadata: {
              application_id: application.id,
              candidate_name: application.getFullName(),
              job_title: application.jobPosting?.title
            }
          });

          await inboxService.sendMessage(notificationGroup.id, context.companyId, {
            sender_type: 'user',
            sender_id: context.userId,
            sender_name: context.userName,
            recipient_type: 'user',
            recipient_id: interviewer_id,
            recipient_name: `${interviewer.firstName} ${interviewer.lastName}`,
            message_type: 'action_required',
            subject: 'Entrevista Programada',
            content: `
📅 **ENTREVISTA PROGRAMADA**

**Candidato:** ${application.getFullName()}
**Puesto:** ${application.jobPosting?.title || 'No especificado'}
**Fecha:** ${new Date(scheduledAt).toLocaleDateString('es-AR')}
**Hora:** ${new Date(scheduledAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
**Lugar:** ${interview_location || 'Por confirmar'}
**Tipo:** ${interview_type || 'Presencial'}
${bring_documents ? `\n**Documentos solicitados:** ${bring_documents}` : ''}
${notes ? `\n**Notas:** ${notes}` : ''}

⚠️ Por favor confirme su disponibilidad.
            `.trim(),
            deadline_at: scheduledAt,
            requires_response: true
          });

          console.log(`📧 [JOB-POSTINGS] Notificación de entrevista enviada a: ${interviewer.firstName} ${interviewer.lastName}`);
        }
      } catch (notifError) {
        console.error('Error enviando notificación de entrevista:', notifError);
      }
    }

    // TODO: Enviar notificación al candidato (por email)
    console.log(`📅 [JOB-POSTINGS] Entrevista programada para ${application.getFullName()} el ${scheduledAt}`);

    res.json({
      success: true,
      application,
      message: `Entrevista programada para ${new Date(scheduledAt).toLocaleDateString('es-AR')}`
    });

  } catch (error) {
    console.error('❌ [JOB-POSTINGS] Error programando entrevista:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al programar entrevista'
    });
  }
});

/**
 * POST /api/job-postings/applications/:id/complete-interview
 * Completar/registrar resultado de entrevista
 */
router.post('/applications/:id/complete-interview', async (req, res) => {
  try {
    const context = buildContext(req);
    const { id } = req.params;
    const {
      score,
      notes,
      recommendation,
      strengths,
      weaknesses,
      cultural_fit
    } = req.body;

    const application = await JobApplication.findOne({
      where: {
        id,
        company_id: context.companyId
      }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Postulación no encontrada'
      });
    }

    // Registrar resultado de entrevista
    application.interview_score = score || null;
    application.interview_notes = JSON.stringify({
      notes: notes || '',
      recommendation: recommendation || 'neutral',
      strengths: strengths || [],
      weaknesses: weaknesses || [],
      cultural_fit: cultural_fit || null,
      completed_at: new Date().toISOString(),
      completed_by: context.userId
    });

    await application.changeStatus('entrevista_realizada', context.userId, `Entrevista completada. Puntaje: ${score || 'N/A'}, Recomendación: ${recommendation || 'neutral'}`);

    console.log(`✅ [JOB-POSTINGS] Entrevista completada para postulación ${id}. Score: ${score}, Recomendación: ${recommendation}`);

    res.json({
      success: true,
      application,
      message: 'Entrevista registrada exitosamente'
    });

  } catch (error) {
    console.error('❌ [JOB-POSTINGS] Error completando entrevista:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al completar entrevista'
    });
  }
});

/**
 * GET /api/job-postings/pipeline
 * Vista de pipeline de reclutamiento (Kanban-style)
 */
router.get('/pipeline', async (req, res) => {
  try {
    const context = buildContext(req);
    console.log(`📊 [JOB-POSTINGS] Obteniendo pipeline para company_id=${context.companyId}`);

    // Definir columnas del pipeline
    const pipelineStages = [
      { key: 'nuevo', label: 'Nuevos', color: '#17a2b8' },
      { key: 'revision', label: 'En Revisión', color: '#6c757d' },
      { key: 'entrevista_pendiente', label: 'Entrevista Pendiente', color: '#fd7e14' },
      { key: 'entrevista_realizada', label: 'Entrevista OK', color: '#6f42c1' },
      { key: 'aprobado_administrativo', label: 'Aprobado RRHH', color: '#20c997' },
      { key: 'examen_pendiente', label: 'Examen Médico', color: '#e83e8c' },
      { key: 'apto', label: 'Apto', color: '#28a745' },
      { key: 'contratado', label: 'Contratado', color: '#28a745' }
    ];

    // Obtener todas las postulaciones activas (no rechazadas ni desistidas)
    const applications = await JobApplication.findAll({
      where: {
        company_id: context.companyId,
        status: {
          [Op.notIn]: ['rechazado', 'desistio', 'no_apto']
        }
      },
      include: [{
        model: JobPosting,
        as: 'jobPosting',
        attributes: ['id', 'title', 'department_name']
      }],
      order: [['applied_at', 'DESC']]
    });

    // Agrupar por estado
    const pipeline = pipelineStages.map(stage => ({
      ...stage,
      count: 0,
      applications: []
    }));

    applications.forEach(app => {
      const stage = pipeline.find(s => s.key === app.status);
      if (stage) {
        stage.count++;
        stage.applications.push({
          id: app.id,
          name: app.getFullName(),
          email: app.candidate_email,
          phone: app.candidate_phone,
          jobTitle: app.jobPosting?.title || 'N/A',
          department: app.jobPosting?.department_name || 'N/A',
          appliedAt: app.applied_at,
          daysSinceApplied: Math.floor((new Date() - new Date(app.applied_at)) / (1000 * 60 * 60 * 24)),
          interviewDate: app.interview_scheduled_at,
          interviewScore: app.interview_score
        });
      }
    });

    res.json({
      success: true,
      pipeline,
      totalActive: applications.length
    });

  } catch (error) {
    console.error('❌ [JOB-POSTINGS] Error obteniendo pipeline:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al obtener pipeline'
    });
  }
});

/**
 * GET /api/job-postings/pending-legal
 * Candidatos pendientes de revisión legal
 */
router.get('/pending-legal', async (req, res) => {
  try {
    const context = buildContext(req);
    console.log(`⚖️ [JOB-POSTINGS] Obteniendo candidatos pendientes de legal`);

    // Candidatos aptos médicamente pero aún no contratados
    const applications = await JobApplication.findAll({
      where: {
        company_id: context.companyId,
        status: {
          [Op.in]: ['apto', 'apto_con_observaciones']
        }
      },
      include: [{
        model: JobPosting,
        as: 'jobPosting',
        attributes: ['id', 'title', 'department_name', 'location']
      }],
      order: [['medical_approved_at', 'ASC']]
    });

    const enriched = applications.map(app => ({
      ...app.toJSON(),
      candidateFullName: app.getFullName(),
      daysSinceMedicalApproval: app.medical_approved_at
        ? Math.floor((new Date() - new Date(app.medical_approved_at)) / (1000 * 60 * 60 * 24))
        : null
    }));

    res.json({
      success: true,
      applications: enriched,
      count: enriched.length
    });

  } catch (error) {
    console.error('❌ [JOB-POSTINGS] Error obteniendo pendientes legales:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al obtener candidatos pendientes'
    });
  }
});

/**
 * POST /api/job-postings/applications/:id/legal-result
 * Registrar resultado de revisión legal
 */
router.post('/applications/:id/legal-result', async (req, res) => {
  try {
    const context = buildContext(req);
    const { id } = req.params;
    const { result, notes, documents_verified } = req.body;

    const application = await JobApplication.findOne({
      where: {
        id,
        company_id: context.companyId
      }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Postulación no encontrada'
      });
    }

    // El resultado legal se registra en las notas del historial
    const historyEntry = {
      from_status: application.status,
      to_status: result === 'approved' ? 'apto' : 'rechazado',
      changed_at: new Date().toISOString(),
      changed_by: context.userId,
      notes: `Revisión Legal: ${result}. ${notes || ''}`
    };

    const history = application.status_history || [];
    history.push(historyEntry);
    application.status_history = history;

    if (result !== 'approved') {
      application.rejected_at = new Date();
      application.rejected_by = context.userId;
      application.rejection_reason = 'Revisión legal no aprobada';
      application.rejection_notes = notes;
      application.rejection_stage = 'legal';
      application.status = 'rechazado';
    }

    await application.save();

    console.log(`⚖️ [JOB-POSTINGS] Resultado legal para postulación ${id}: ${result}`);

    res.json({
      success: true,
      application,
      message: result === 'approved'
        ? 'Revisión legal aprobada. Candidato listo para contratar.'
        : 'Candidato rechazado por revisión legal.'
    });

  } catch (error) {
    console.error('❌ [JOB-POSTINGS] Error registrando resultado legal:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al registrar resultado legal'
    });
  }
});

/**
 * GET /api/job-postings/stats
 * Estadísticas de postulaciones
 */
router.get('/stats', async (req, res) => {
  try {
    const context = buildContext(req);

    const stats = await JobApplication.getStatsByCompany(context.companyId);

    // Contar ofertas
    const offerStats = await JobPosting.findAll({
      where: { company_id: context.companyId },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    res.json({
      success: true,
      applications: stats,
      offers: offerStats.reduce((acc, item) => {
        acc[item.status] = parseInt(item.count);
        return acc;
      }, {}),
      offersTotal: offerStats.reduce((acc, item) => acc + parseInt(item.count), 0)
    });

  } catch (error) {
    console.error('❌ [JOB-POSTINGS] Error obteniendo stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al obtener estadísticas'
    });
  }
});

module.exports = router;
