const express = require('express');
const router = express.Router();
const { Sequelize } = require('sequelize');

// Crear conexión directa a PostgreSQL sin modelos
const sequelize = new Sequelize(
  process.env.POSTGRES_DB || 'attendance_system',
  process.env.POSTGRES_USER || 'postgres',
  process.env.POSTGRES_PASSWORD || 'Aedr15150302',
  {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    dialect: 'postgres',
    logging: false
  }
);

/**
 * @route GET /api/v1/users-simple
 * @desc Obtener lista de usuarios usando SQL raw
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build WHERE clause for search (exclude system users)
    let whereClause = "WHERE notes IS DISTINCT FROM 'SYSTEM_USER_TESTING_ONLY'";
    let replacements = [];

    if (search) {
      whereClause += " AND (first_name ILIKE ? OR last_name ILIKE ? OR email ILIKE ? OR employee_id ILIKE ?)";
      const searchPattern = `%${search}%`;
      replacements.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM users ${whereClause}`;
    const countResult = await sequelize.query(countQuery, {
      replacements,
      type: sequelize.QueryTypes.SELECT
    });
    const totalUsers = parseInt(countResult[0].total);

    // Get users
    const usersQuery = `
      SELECT
        id,
        employee_id,
        first_name,
        last_name,
        email,
        role,
        is_active,
        created_at,
        updated_at
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    replacements.push(parseInt(limit), offset);

    const users = await sequelize.query(usersQuery, {
      replacements,
      type: sequelize.QueryTypes.SELECT
    });

    // Format users for frontend
    const formattedUsers = users.map(user => ({
      id: user.user_id,
      employeeId: user.employee_id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      role: user.role,
      isActive: user.is_active,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      name: `${user.first_name} ${user.last_name}`,
      fullName: `${user.first_name} ${user.last_name}`,
      // Default values for missing fields
      phone: null,
      department: null,
      position: null,
      lastAccess: 'Nunca',
      status: user.is_active ? 'Activo' : 'Inactivo',
      biometric: '⚠️ Pendiente'
    }));

    res.json({
      users: formattedUsers,
      totalPages: Math.ceil(totalUsers / parseInt(limit)),
      currentPage: parseInt(page),
      totalUsers: totalUsers
    });

  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

/**
 * @route GET /api/v1/users-simple/:id
 * @desc Obtener usuario por ID usando SQL raw
 */
router.get('/:id', async (req, res) => {
  try {
    const userId = req.params.id;

    // Get user by ID using raw SQL
    const userQuery = `
      SELECT
        id,
        employee_id,
        first_name,
        last_name,
        email,
        role,
        is_active,
        created_at,
        updated_at,
        biometric_photo_url,
        biometric_photo_date,
        biometric_photo_expiration
      FROM users
      WHERE id = ?
    `;

    const users = await sequelize.query(userQuery, {
      replacements: [userId],
      type: sequelize.QueryTypes.SELECT
    });

    if (!users.length) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    const user = users[0];

    // Format user for frontend
    const formattedUser = {
      id: user.user_id,
      employeeId: user.employee_id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      role: user.role,
      isActive: user.is_active,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      name: `${user.first_name} ${user.last_name}`,
      fullName: `${user.first_name} ${user.last_name}`,
      // Biometric photo fields
      biometric_photo_url: user.biometric_photo_url,
      biometric_photo_date: user.biometric_photo_date,
      biometric_photo_expiration: user.biometric_photo_expiration,
      // Default values for missing fields
      phone: null,
      department: { name: 'Sin departamento' },
      position: null,
      hireDate: null,
      birthDate: null,
      address: null,
      emergencyContact: null,
      emergencyPhone: null,
      permissions: {},
      settings: {},
      allowOutsideRadius: false
    };

    res.json(formattedUser);

  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

module.exports = router;