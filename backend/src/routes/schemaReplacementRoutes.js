const express = require('express');
const router = express.Router();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

/**
 * Endpoint para REEMPLAZAR el schema completo de Render con el schema local
 * POST /api/schema-replacement/execute
 * Requiere API key en header: X-Migration-Key
 *
 * ADVERTENCIA: Esto BORRA todas las tablas de Render y las reemplaza con las de local
 */
router.post('/execute', async (req, res) => {
  const apiKey = req.headers['x-migration-key'];

  if (apiKey !== 'aponnt-migrations-2026') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const results = [];
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('render.com') ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    results.push({ step: 'connect', status: 'success', message: 'Conectado a PostgreSQL' });

    // PASO 1: Obtener estadísticas antes
    results.push({ step: 'stats-before', status: 'running', message: 'Obteniendo estadísticas...' });
    const tablesResult = await client.query(`
      SELECT COUNT(*) as count FROM pg_tables WHERE schemaname = 'public'
    `);
    const tableCount = parseInt(tablesResult.rows[0].count);
    results.push({
      step: 'stats-before',
      status: 'success',
      message: `Schema actual: ${tableCount} tablas`
    });

    // PASO 2: Eliminar el schema public completo y recrearlo (MÁS RÁPIDO que dropear 700+ tablas)
    results.push({ step: 'drop-schema', status: 'running', message: 'Eliminando schema public completo...' });
    await client.query('DROP SCHEMA IF EXISTS public CASCADE');
    await client.query('CREATE SCHEMA public');
    await client.query('GRANT ALL ON SCHEMA public TO public');
    await client.query('GRANT ALL ON SCHEMA public TO attendance_system_866u_user');
    results.push({ step: 'drop-schema', status: 'success', message: 'Schema public eliminado y recreado' });

    // PASO 4: Leer schema local
    results.push({ step: 'read-schema', status: 'running', message: 'Leyendo schema local...' });
    const schemaPath = path.join(__dirname, '../../migrations/LOCAL_SCHEMA_FULL.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    const lines = schema.split('\n').length;
    results.push({
      step: 'read-schema',
      status: 'success',
      message: `Schema local leído (${lines} líneas)`
    });

    // PASO 4: Ejecutar schema local en Render
    results.push({ step: 'import-schema', status: 'running', message: 'Importando schema local...' });
    await client.query(schema);
    results.push({ step: 'import-schema', status: 'success', message: 'Schema local importado exitosamente' });

    // PASO 5: Verificar tablas creadas
    const newTablesResult = await client.query(`
      SELECT COUNT(*) as count
      FROM pg_tables
      WHERE schemaname = 'public'
    `);
    const newTableCount = parseInt(newTablesResult.rows[0].count);
    results.push({
      step: 'verify',
      status: 'success',
      message: `Verificación: ${newTableCount} tablas en Render`
    });

    await client.end();
    results.push({ step: 'disconnect', status: 'success', message: 'Conexión cerrada' });

    return res.json({
      success: true,
      results,
      summary: {
        tablesDropped: tables.length,
        tablesCreated: newTableCount
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    try { await client.end(); } catch (e) {}

    results.push({
      step: 'error',
      status: 'error',
      message: error.message,
      stack: error.stack?.substring(0, 1000)
    });

    return res.status(500).json({
      success: false,
      results,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Endpoint para ver estadísticas del schema actual
 * GET /api/schema-replacement/stats
 */
router.get('/stats', async (req, res) => {
  const apiKey = req.headers['x-migration-key'];

  if (apiKey !== 'aponnt-migrations-2026') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('render.com') ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();

    const tablesResult = await client.query(`
      SELECT COUNT(*) as count FROM pg_tables WHERE schemaname = 'public'
    `);
    const columnsResult = await client.query(`
      SELECT COUNT(*) as count FROM information_schema.columns WHERE table_schema = 'public'
    `);
    const functionsResult = await client.query(`
      SELECT COUNT(*) as count FROM pg_proc WHERE pronamespace = 'public'::regnamespace
    `);

    await client.end();

    return res.json({
      stats: {
        tables: parseInt(tablesResult.rows[0].count),
        columns: parseInt(columnsResult.rows[0].count),
        functions: parseInt(functionsResult.rows[0].count)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    try { await client.end(); } catch (e) {}
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
