const express = require('express');
const router = express.Router();
const { Client } = require('pg');

/**
 * Endpoint para ejecutar fixes rápidos de SQL
 * POST /api/quick-fix/execute
 */
router.post('/execute', async (req, res) => {
  const apiKey = req.headers['x-migration-key'];
  const { sql } = req.body;

  if (apiKey !== 'aponnt-migrations-2026') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!sql) {
    return res.status(400).json({ error: 'SQL is required' });
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('render.com') ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    await client.query(sql);
    await client.end();

    return res.json({
      success: true,
      message: 'SQL ejecutado exitosamente',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    try { await client.end(); } catch (e) {}

    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
