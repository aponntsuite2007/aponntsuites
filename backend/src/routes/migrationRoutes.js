const express = require('express');
const router = express.Router();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

/**
 * Endpoint para ejecutar migraciones pendientes
 * GET /api/migrations/run
 * GET /api/migrations/run?all=true (ejecuta TODAS las migraciones)
 * Requiere API key en header: X-Migration-Key
 */
router.get('/run', async (req, res) => {
  const apiKey = req.headers['x-migration-key'];

  // API key de seguridad (cambiar en producción)
  if (apiKey !== 'aponnt-migrations-2026') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Si all=true, ejecutar todas las migraciones
  const runAll = req.query.all === 'true';

  let migrations;

  if (runAll) {
    // Leer todos los archivos .sql del directorio migrations
    const migrationsDir = path.join(__dirname, '../../migrations');
    migrations = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort(); // Ordenar alfabéticamente (por fecha en nombre)
  } else {
    // Solo las 2 más recientes
    migrations = [
      '20260202_fix_manual_by_columns_to_varchar.sql',
      '20260203_create_organizational_hierarchy_functions.sql'
    ];
  }

  const results = [];

  // IMPORTANTE: Crear conexión NUEVA para cada migración (transacciones independientes)
  results.push({ step: 'start', status: 'success', message: 'Iniciando migraciones' });

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

    // Crear cliente NUEVO para esta migración (transacción independiente)
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes('render.com') ? { rejectUnauthorized: false } : false
    });

    try {
      await client.connect();
      const sql = fs.readFileSync(migrationPath, 'utf-8');
      await client.query(sql);
      await client.end();

      results.push({
        step: migrationFile,
        status: 'success',
        message: 'Ejecutada exitosamente'
      });
    } catch (error) {
      try { await client.end(); } catch (e) {}

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
          message: error.message.substring(0, 200),
          stack: error.stack?.substring(0, 500)
        });
      }
    }
  }

  results.push({ step: 'finish', status: 'success', message: 'Proceso completado' });

  return res.json({
    success: true,
    results,
    timestamp: new Date().toISOString()
  });
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
