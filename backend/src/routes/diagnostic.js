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

module.exports = router;
