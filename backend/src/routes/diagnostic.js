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

    console.log('📄 [FIX-SCHEMA] Script SQL cargado, ejecutando...');

    // Ejecutar el script completo
    await sequelize.query(sqlScript, {
      type: QueryTypes.RAW
    });

    console.log('✅ [FIX-SCHEMA] Script ejecutado exitosamente');

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

module.exports = router;
