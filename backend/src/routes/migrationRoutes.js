const express = require('express');
const router = express.Router();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

/**
 * Endpoint para ejecutar migraciones pendientes
 * GET /api/migrations/run
 * Requiere API key en header: X-Migration-Key
 */
router.get('/run', async (req, res) => {
  const apiKey = req.headers['x-migration-key'];

  // API key de seguridad (cambiar en producción)
  if (apiKey !== 'aponnt-migrations-2026') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const migrations = [
    '20260202_fix_manual_by_columns_to_varchar.sql',
    '20260203_create_organizational_hierarchy_functions.sql'
  ];

  const results = [];
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('render.com') ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    results.push({ step: 'connect', status: 'success', message: 'Conectado a PostgreSQL' });

    for (const migrationFile of migrations) {
      const migrationPath = path.join(__dirname, '../../migrations', migrationFile);

      if (!fs.existsSync(migrationPath)) {
        results.push({
          step: migrationFile,
          status: 'skipped',
          message: 'Archivo no encontrado'
        });
        continue;
      }

      const sql = fs.readFileSync(migrationPath, 'utf-8');

      try {
        await client.query(sql);
        results.push({
          step: migrationFile,
          status: 'success',
          message: 'Ejecutada exitosamente'
        });
      } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          results.push({
            step: migrationFile,
            status: 'skipped',
            message: 'Ya estaba aplicada',
            error: error.message
          });
        } else {
          results.push({
            step: migrationFile,
            status: 'error',
            message: error.message,
            stack: error.stack
          });
        }
      }
    }

    await client.end();
    results.push({ step: 'disconnect', status: 'success', message: 'Conexión cerrada' });

    return res.json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    results.push({
      step: 'global',
      status: 'error',
      message: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      success: false,
      results,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Endpoint para listar migraciones disponibles
 * GET /api/migrations/list
 */
router.get('/list', (req, res) => {
  const migrationsDir = path.join(__dirname, '../../migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));

  return res.json({
    total: files.length,
    migrations: files.sort()
  });
});

module.exports = router;
