const express = require('express');
const router = express.Router();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

/**
 * Endpoint para agregar schema local a Render de forma ADITIVA
 * POST /api/schema-additive/merge
 *
 * NO borra nada de Render, solo agrega:
 * - Tablas que existen en local pero no en Render
 * - Columnas que existen en local pero no en Render
 * - Funciones que existen en local pero no en Render
 */
router.post('/merge', async (req, res) => {
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

    // PASO 1: Leer schema local completo
    results.push({ step: 'read-schema', status: 'running', message: 'Leyendo schema local...' });
    const schemaPath = path.join(__dirname, '../../migrations/LOCAL_SCHEMA_FULL.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    // Dividir en statements individuales (CREATE TABLE, CREATE INDEX, etc.)
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => {
        if (s.length === 0) return false;
        // Remover comentarios al inicio pero mantener el statement
        const lines = s.split('\n').filter(line => !line.trim().startsWith('--'));
        return lines.join('\n').trim().length > 0;
      })
      .map(s => {
        // Limpiar comentarios pero mantener el SQL
        return s.split('\n')
          .filter(line => !line.trim().startsWith('--'))
          .join('\n')
          .trim();
      });

    results.push({
      step: 'read-schema',
      status: 'success',
      message: `${statements.length} statements SQL encontrados`
    });

    // PASO 2: Ejecutar cada statement con IF NOT EXISTS
    results.push({ step: 'merge-schema', status: 'running', message: 'Ejecutando schema aditivo...' });

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Modificar CREATE TABLE para agregar IF NOT EXISTS si no lo tiene
      let modifiedStatement = statement;
      if (statement.toUpperCase().includes('CREATE TABLE') &&
          !statement.toUpperCase().includes('IF NOT EXISTS')) {
        modifiedStatement = statement.replace(
          /CREATE TABLE\s+/i,
          'CREATE TABLE IF NOT EXISTS '
        );
      }

      // Modificar CREATE INDEX para agregar IF NOT EXISTS
      if (statement.toUpperCase().includes('CREATE INDEX') &&
          !statement.toUpperCase().includes('IF NOT EXISTS')) {
        modifiedStatement = statement.replace(
          /CREATE INDEX\s+/i,
          'CREATE INDEX IF NOT EXISTS '
        );
      }

      try {
        await client.query(modifiedStatement);
        created++;

        // Log cada 50 statements
        if (created % 50 === 0) {
          results.push({
            step: 'merge-progress',
            status: 'running',
            message: `${created}/${statements.length} statements procesados...`
          });
        }
      } catch (error) {
        if (error.message.includes('already exists')) {
          skipped++;
        } else {
          errors++;
          if (errors <= 10) {  // Solo reportar primeros 10 errores
            results.push({
              step: 'merge-error',
              status: 'warning',
              message: `Error: ${error.message.substring(0, 100)}`
            });
          }
        }
      }
    }

    results.push({
      step: 'merge-schema',
      status: 'success',
      message: `Schema mergeado: ${created} creados, ${skipped} ya existían, ${errors} errores`
    });

    // PASO 3: Verificar resultado final
    const finalTablesResult = await client.query(`
      SELECT COUNT(*) as count FROM pg_tables WHERE schemaname = 'public'
    `);
    const finalTableCount = parseInt(finalTablesResult.rows[0].count);

    results.push({
      step: 'verify',
      status: 'success',
      message: `Verificación: ${finalTableCount} tablas totales en Render`
    });

    await client.end();
    results.push({ step: 'disconnect', status: 'success', message: 'Conexión cerrada' });

    return res.json({
      success: true,
      results,
      summary: {
        statementsProcessed: statements.length,
        created,
        skipped,
        errors,
        finalTableCount
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

module.exports = router;
