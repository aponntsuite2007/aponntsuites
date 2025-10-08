const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

/**
 * Endpoint de diagnóstico para verificar columnas de tablas en producción
 */
router.get('/table-columns/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;

    // Validar nombre de tabla (seguridad)
    const allowedTables = ['users', 'departments', 'attendances', 'companies'];
    if (!allowedTables.includes(tableName)) {
      return res.status(400).json({ error: 'Tabla no permitida' });
    }

    const columns = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = :tableName
      ORDER BY ordinal_position
    `, {
      replacements: { tableName },
      type: QueryTypes.SELECT
    });

    res.json({
      success: true,
      table: tableName,
      columns: columns,
      totalColumns: columns.length
    });

  } catch (error) {
    console.error('Error obteniendo columnas:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Verificar estado de migraciones ejecutadas
 */
router.get('/migrations-status', async (req, res) => {
  try {
    const migrations = await sequelize.query(`
      SELECT * FROM "SequelizeMeta" ORDER BY name
    `, {
      type: QueryTypes.SELECT
    });

    res.json({
      success: true,
      migrations: migrations,
      totalMigrations: migrations.length
    });

  } catch (error) {
    console.error('Error obteniendo migraciones:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * ENDPOINT TEMPORAL - Ejecutar script SQL de corrección
 * USAR SOLO UNA VEZ PARA CORREGIR SCHEMA EN PRODUCCIÓN
 * ELIMINAR DESPUÉS DE EJECUTAR
 */
router.post('/execute-fix-schema', async (req, res) => {
  try {
    console.log('🔧 [FIX-SCHEMA] Iniciando corrección de schema...');

    const fs = require('fs');
    const path = require('path');

    // Leer el script SQL minimal (sin transacciones explícitas)
    const sqlPath = path.join(__dirname, '../../migrations/fix-schema-minimal.sql');
    const sqlScript = fs.readFileSync(sqlPath, 'utf8');

    console.log('📄 [FIX-SCHEMA] Script SQL cargado, ejecutando línea por línea...');

    // Separar el script en statements individuales y ejecutar uno por uno
    const statements = sqlScript
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let executed = 0;
    for (const statement of statements) {
      if (statement.includes('ALTER TABLE') || statement.includes('DO $$')) {
        try {
          await sequelize.query(statement, {
            type: QueryTypes.RAW
          });
          executed++;
        } catch (err) {
          // Ignorar errores de columnas que ya existen
          if (!err.message.includes('already exists')) {
            console.warn('⚠️ Error ejecutando statement:', err.message);
          }
        }
      }
    }

    console.log(`✅ [FIX-SCHEMA] ${executed} statements ejecutados exitosamente`);

    // Verificar resultados
    const usersColumns = await sequelize.query(`
      SELECT COUNT(*) as count FROM information_schema.columns WHERE table_name = 'users'
    `, { type: QueryTypes.SELECT });

    const attendancesColumns = await sequelize.query(`
      SELECT COUNT(*) as count FROM information_schema.columns WHERE table_name = 'attendances'
    `, { type: QueryTypes.SELECT });

    const departmentsColumns = await sequelize.query(`
      SELECT COUNT(*) as count FROM information_schema.columns WHERE table_name = 'departments'
    `, { type: QueryTypes.SELECT });

    res.json({
      success: true,
      message: 'Schema corregido exitosamente',
      verification: {
        users_columns: usersColumns[0].count,
        attendances_columns: attendancesColumns[0].count,
        departments_columns: departmentsColumns[0].count
      }
    });

  } catch (error) {
    console.error('❌ [FIX-SCHEMA] Error ejecutando script:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.stack
    });
  }
});

/**
 * ENDPOINT TEMPORAL - Crear usuario de prueba
 * USAR SOLO PARA TESTING
 * ELIMINAR DESPUÉS DE USAR
 */
router.post('/create-test-user', async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');

    console.log('👤 [CREATE-USER] Creando usuario de prueba...');

    // Verificar si ya existe la empresa
    const [companies] = await sequelize.query(`
      SELECT company_id FROM companies WHERE slug = 'test-company' LIMIT 1
    `, { type: QueryTypes.SELECT });

    let companyId;
    if (!companies) {
      console.log('📦 Creando empresa de prueba...');
      const [result] = await sequelize.query(`
        INSERT INTO companies (name, slug, email, is_active, max_employees, contracted_employees, license_type, created_at, updated_at)
        VALUES ('Test Company', 'test-company', 'test@test.com', true, 100, 10, 'premium', NOW(), NOW())
        RETURNING company_id
      `, { type: QueryTypes.SELECT });
      companyId = result.company_id;
    } else {
      companyId = companies.company_id;
    }

    // Verificar si ya existe el usuario
    const [existingUsers] = await sequelize.query(`
      SELECT user_id, email FROM users WHERE email = 'admin@test.com' LIMIT 1
    `, { type: QueryTypes.SELECT });

    if (existingUsers) {
      return res.json({
        success: true,
        message: 'Usuario ya existe',
        credentials: {
          email: 'admin@test.com',
          password: 'admin123',
          note: 'Usuario ya creado anteriormente'
        }
      });
    }

    // Crear usuario admin
    const hashedPassword = await bcrypt.hash('admin123', 10);

    await sequelize.query(`
      INSERT INTO users (
        "employeeId",
        usuario,
        "firstName",
        "lastName",
        email,
        password,
        role,
        company_id,
        is_active,
        created_at,
        updated_at
      )
      VALUES (
        'ADMIN001',
        'admin',
        'Admin',
        'Test',
        :email,
        :password,
        'admin',
        :companyId,
        true,
        NOW(),
        NOW()
      )
    `, {
      replacements: {
        email: 'admin@test.com',
        password: hashedPassword,
        companyId: companyId
      },
      type: QueryTypes.INSERT
    });

    res.json({
      success: true,
      message: 'Usuario creado exitosamente',
      credentials: {
        email: 'admin@test.com',
        password: 'admin123',
        companyId: companyId,
        role: 'admin'
      }
    });

  } catch (error) {
    console.error('❌ [CREATE-USER] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.stack
    });
  }
});

module.exports = router;
