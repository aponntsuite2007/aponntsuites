const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');

// Middleware para verificar autenticación de empresa
const authenticateCompany = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autorización requerido' });
    }

    const token = authHeader.substring(7);
    const companyId = req.headers['x-company-id'];

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID requerido en headers' });
    }

    // Verificar que la empresa existe y está activa
    const company = await sequelize.query(`
      SELECT id, name, slug, is_active, status
      FROM companies
      WHERE id = :companyId AND is_active = true
    `, {
      replacements: { companyId },
      type: sequelize.QueryTypes.SELECT
    });

    if (company.length === 0) {
      return res.status(404).json({ error: 'Empresa no encontrada o inactiva' });
    }

    req.company = company[0];
    req.companyId = parseInt(companyId);
    next();
  } catch (error) {
    console.error('Error en authenticateCompany:', error);
    res.status(500).json({ error: 'Error de autenticación' });
  }
};

// 🏢 GET /company-info - Obtener información de la empresa
router.get('/company-info', authenticateCompany, async (req, res) => {
  try {
    const companyInfo = await sequelize.query(`
      SELECT
        id, name, legal_name, slug, tax_id, contact_email, contact_phone,
        address, city, province, country, website,
        max_employees, contracted_employees, license_type, status,
        active_modules, features, created_at, updated_at
      FROM companies
      WHERE id = :companyId AND is_active = true
    `, {
      replacements: { companyId: req.companyId },
      type: sequelize.QueryTypes.SELECT
    });

    if (companyInfo.length === 0) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    const company = companyInfo[0];

    // Obtener estadísticas básicas
    const [employeeCount, activeModulesCount] = await Promise.all([
      // Contar empleados activos de la empresa
      sequelize.query(`
        SELECT COUNT(*) as count
        FROM users
        WHERE company_id = :companyId AND is_active = true
      `, {
        replacements: { companyId: req.companyId },
        type: sequelize.QueryTypes.SELECT
      }),

      // Contar módulos activos
      sequelize.query(`
        SELECT COUNT(*) as count
        FROM company_modules cm
        INNER JOIN system_modules sm ON cm.system_module_id = sm.id
        WHERE cm.company_id = :companyId AND cm.activo = true
      `, {
        replacements: { companyId: req.companyId },
        type: sequelize.QueryTypes.SELECT
      })
    ]);

    res.json({
      success: true,
      company: {
        ...company,
        currentEmployees: employeeCount[0].count,
        activeModulesCount: activeModulesCount[0].count
      }
    });

  } catch (error) {
    console.error('Error obteniendo información de empresa:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 👥 GET /employees - Obtener empleados de la empresa
router.get('/employees', authenticateCompany, async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', department = '', active = 'true' } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = ['u.company_id = :companyId'];
    let replacements = { companyId: req.companyId };

    if (search) {
      whereConditions.push('(u.first_name ILIKE :search OR u.last_name ILIKE :search OR u.email ILIKE :search OR u.employee_id ILIKE :search)');
      replacements.search = `%${search}%`;
    }

    if (department) {
      whereConditions.push('d.name ILIKE :department');
      replacements.department = `%${department}%`;
    }

    if (active !== 'all') {
      whereConditions.push('u.is_active = :isActive');
      replacements.isActive = active === 'true';
    }

    const employees = await sequelize.query(`
      SELECT
        u.id, u.first_name, u.last_name, u.email, u.employee_id,
        u.phone, u.hire_date, u.is_active, u.role, u.position,
        d.name as department_name,
        u.created_at, u.updated_at
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY u.last_name, u.first_name
      LIMIT :limit OFFSET :offset
    `, {
      replacements: { ...replacements, limit: parseInt(limit), offset },
      type: sequelize.QueryTypes.SELECT
    });

    // Contar total para paginación
    const totalResult = await sequelize.query(`
      SELECT COUNT(*) as total
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE ${whereConditions.join(' AND ')}
    `, {
      replacements,
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      employees,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(totalResult[0].total),
        pages: Math.ceil(totalResult[0].total / limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo empleados:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 📋 GET /departments - Obtener departamentos de la empresa
router.get('/departments', authenticateCompany, async (req, res) => {
  try {
    const departments = await sequelize.query(`
      SELECT
        d.id, d.name, d.description,
        COUNT(u.id) as employee_count,
        d.created_at, d.updated_at
      FROM departments d
      LEFT JOIN users u ON d.id = u.department_id AND u.company_id = :companyId AND u.is_active = true
      WHERE d.company_id = :companyId
      GROUP BY d.id, d.name, d.description, d.created_at, d.updated_at
      ORDER BY d.name
    `, {
      replacements: { companyId: req.companyId },
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      departments
    });

  } catch (error) {
    console.error('Error obteniendo departamentos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ⏰ GET /attendance/recent - Obtener asistencias recientes
router.get('/attendance/recent', authenticateCompany, async (req, res) => {
  try {
    const { limit = 20, date = null } = req.query;

    let dateCondition = '';
    let replacements = { companyId: req.companyId, limit: parseInt(limit) };

    if (date) {
      dateCondition = 'AND DATE(a.created_at) = :date';
      replacements.date = date;
    } else {
      dateCondition = 'AND DATE(a.created_at) = CURRENT_DATE';
    }

    const attendance = await sequelize.query(`
      SELECT
        a.id, a.clock_in, a.clock_out, a.total_hours,
        a.created_at,
        u.first_name, u.last_name, u.employee_id,
        d.name as department_name
      FROM attendances a
      INNER JOIN users u ON a.user_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.company_id = :companyId ${dateCondition}
      ORDER BY a.created_at DESC
      LIMIT :limit
    `, {
      replacements,
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      attendance
    });

  } catch (error) {
    console.error('Error obteniendo asistencias:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 🏥 GET /medical/certificates - Obtener certificados médicos de empleados
router.get('/medical/certificates', authenticateCompany, async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'all', employee_id = null } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = ['u.company_id = :companyId'];
    let replacements = { companyId: req.companyId };

    if (status !== 'all') {
      whereConditions.push('mc.status = :status');
      replacements.status = status;
    }

    if (employee_id) {
      whereConditions.push('u.id = :employeeId');
      replacements.employeeId = employee_id;
    }

    const certificates = await sequelize.query(`
      SELECT
        mc.id, mc.certificate_type, mc.issue_date, mc.expiry_date,
        mc.status, mc.notes, mc.file_path,
        u.first_name, u.last_name, u.employee_id,
        d.name as department_name,
        mc.created_at, mc.updated_at
      FROM medical_certificates mc
      INNER JOIN users u ON mc.user_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY mc.created_at DESC
      LIMIT :limit OFFSET :offset
    `, {
      replacements: { ...replacements, limit: parseInt(limit), offset },
      type: sequelize.QueryTypes.SELECT
    });

    // Contar total
    const totalResult = await sequelize.query(`
      SELECT COUNT(*) as total
      FROM medical_certificates mc
      INNER JOIN users u ON mc.user_id = u.id
      WHERE ${whereConditions.join(' AND ')}
    `, {
      replacements,
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      certificates,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(totalResult[0].total),
        pages: Math.ceil(totalResult[0].total / limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo certificados médicos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 💊 GET /medical/prescriptions - Obtener recetas médicas de empleados
router.get('/medical/prescriptions', authenticateCompany, async (req, res) => {
  try {
    const { page = 1, limit = 20, employee_id = null } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = ['u.company_id = :companyId'];
    let replacements = { companyId: req.companyId };

    if (employee_id) {
      whereConditions.push('u.id = :employeeId');
      replacements.employeeId = employee_id;
    }

    const prescriptions = await sequelize.query(`
      SELECT
        mp.id, mp.medication_name, mp.dosage, mp.frequency,
        mp.start_date, mp.end_date, mp.notes, mp.doctor_name,
        u.first_name, u.last_name, u.employee_id,
        d.name as department_name,
        mp.created_at, mp.updated_at
      FROM medical_prescriptions mp
      INNER JOIN users u ON mp.user_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY mp.created_at DESC
      LIMIT :limit OFFSET :offset
    `, {
      replacements: { ...replacements, limit: parseInt(limit), offset },
      type: sequelize.QueryTypes.SELECT
    });

    const totalResult = await sequelize.query(`
      SELECT COUNT(*) as total
      FROM medical_prescriptions mp
      INNER JOIN users u ON mp.user_id = u.id
      WHERE ${whereConditions.join(' AND ')}
    `, {
      replacements,
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      prescriptions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(totalResult[0].total),
        pages: Math.ceil(totalResult[0].total / limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo recetas médicas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 📊 GET /dashboard/stats - Obtener estadísticas del dashboard
router.get('/dashboard/stats', authenticateCompany, async (req, res) => {
  try {
    const [
      employeeStats,
      attendanceToday,
      attendanceWeek,
      medicalStats,
      departmentStats
    ] = await Promise.all([
      // Estadísticas de empleados
      sequelize.query(`
        SELECT
          COUNT(*) as total_employees,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_employees,
          COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_employees
        FROM users
        WHERE company_id = :companyId
      `, {
        replacements: { companyId: req.companyId },
        type: sequelize.QueryTypes.SELECT
      }),

      // Asistencias de hoy
      sequelize.query(`
        SELECT
          COUNT(*) as total_today,
          COUNT(CASE WHEN clock_out IS NOT NULL THEN 1 END) as completed_today,
          COUNT(CASE WHEN clock_out IS NULL THEN 1 END) as in_progress_today
        FROM attendances a
        INNER JOIN users u ON a.user_id = u.id
        WHERE u.company_id = :companyId
        AND DATE(a.created_at) = CURRENT_DATE
      `, {
        replacements: { companyId: req.companyId },
        type: sequelize.QueryTypes.SELECT
      }),

      // Asistencias de la semana
      sequelize.query(`
        SELECT
          DATE(a.created_at) as date,
          COUNT(*) as count
        FROM attendances a
        INNER JOIN users u ON a.user_id = u.id
        WHERE u.company_id = :companyId
        AND a.created_at >= DATE_TRUNC('week', CURRENT_DATE)
        GROUP BY DATE(a.created_at)
        ORDER BY date
      `, {
        replacements: { companyId: req.companyId },
        type: sequelize.QueryTypes.SELECT
      }),

      // Estadísticas médicas
      sequelize.query(`
        SELECT
          COUNT(CASE WHEN mc.certificate_type = 'medical_leave' THEN 1 END) as medical_leaves,
          COUNT(CASE WHEN mc.certificate_type = 'fitness_certificate' THEN 1 END) as fitness_certificates,
          COUNT(CASE WHEN mp.id IS NOT NULL THEN 1 END) as active_prescriptions
        FROM users u
        LEFT JOIN medical_certificates mc ON u.id = mc.user_id AND mc.status = 'active'
        LEFT JOIN medical_prescriptions mp ON u.id = mp.user_id AND mp.end_date >= CURRENT_DATE
        WHERE u.company_id = :companyId
      `, {
        replacements: { companyId: req.companyId },
        type: sequelize.QueryTypes.SELECT
      }),

      // Estadísticas por departamento
      sequelize.query(`
        SELECT
          d.name as department_name,
          COUNT(u.id) as employee_count
        FROM departments d
        LEFT JOIN users u ON d.id = u.department_id AND u.company_id = :companyId AND u.is_active = true
        WHERE d.company_id = :companyId
        GROUP BY d.id, d.name
        ORDER BY employee_count DESC
      `, {
        replacements: { companyId: req.companyId },
        type: sequelize.QueryTypes.SELECT
      })
    ]);

    res.json({
      success: true,
      stats: {
        employees: employeeStats[0],
        attendanceToday: attendanceToday[0],
        attendanceWeek,
        medical: medicalStats[0],
        departments: departmentStats
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 📄 GET /documents - Obtener documentos de empleados
router.get('/documents', authenticateCompany, async (req, res) => {
  try {
    const { page = 1, limit = 20, employee_id = null, document_type = null } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = ['u.company_id = :companyId'];
    let replacements = { companyId: req.companyId };

    if (employee_id) {
      whereConditions.push('u.id = :employeeId');
      replacements.employeeId = employee_id;
    }

    if (document_type) {
      whereConditions.push('ed.document_type = :documentType');
      replacements.documentType = document_type;
    }

    const documents = await sequelize.query(`
      SELECT
        ed.id, ed.document_type, ed.document_name, ed.file_path,
        ed.upload_date, ed.expiry_date, ed.status,
        u.first_name, u.last_name, u.employee_id,
        d.name as department_name,
        ed.created_at, ed.updated_at
      FROM employee_documents ed
      INNER JOIN users u ON ed.user_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY ed.created_at DESC
      LIMIT :limit OFFSET :offset
    `, {
      replacements: { ...replacements, limit: parseInt(limit), offset },
      type: sequelize.QueryTypes.SELECT
    });

    const totalResult = await sequelize.query(`
      SELECT COUNT(*) as total
      FROM employee_documents ed
      INNER JOIN users u ON ed.user_id = u.id
      WHERE ${whereConditions.join(' AND ')}
    `, {
      replacements,
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      documents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(totalResult[0].total),
        pages: Math.ceil(totalResult[0].total / limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo documentos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 🏖️ GET /vacations - Obtener solicitudes de vacaciones
router.get('/vacations', authenticateCompany, async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'all', employee_id = null } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = ['u.company_id = :companyId'];
    let replacements = { companyId: req.companyId };

    if (status !== 'all') {
      whereConditions.push('vr.status = :status');
      replacements.status = status;
    }

    if (employee_id) {
      whereConditions.push('u.id = :employeeId');
      replacements.employeeId = employee_id;
    }

    const vacations = await sequelize.query(`
      SELECT
        vr.id, vr.start_date, vr.end_date, vr.days_requested,
        vr.status, vr.reason, vr.created_at,
        u.first_name, u.last_name, u.employee_id,
        d.name as department_name,
        approver.first_name as approver_first_name,
        approver.last_name as approver_last_name
      FROM vacation_requests vr
      INNER JOIN users u ON vr.user_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN users approver ON vr.approved_by = approver.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY vr.created_at DESC
      LIMIT :limit OFFSET :offset
    `, {
      replacements: { ...replacements, limit: parseInt(limit), offset },
      type: sequelize.QueryTypes.SELECT
    });

    const totalResult = await sequelize.query(`
      SELECT COUNT(*) as total
      FROM vacation_requests vr
      INNER JOIN users u ON vr.user_id = u.id
      WHERE ${whereConditions.join(' AND ')}
    `, {
      replacements,
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      vacations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(totalResult[0].total),
        pages: Math.ceil(totalResult[0].total / limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo solicitudes de vacaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;