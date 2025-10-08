const express = require('express');
const router = express.Router();

/**
 * DEBUG ENDPOINT - Ver configuración de base de datos
 * BORRAR DESPUÉS DE DEBUGGEAR
 */
router.get('/debug-database-config', (req, res) => {
  const config = {
    DATABASE_URL_exists: !!process.env.DATABASE_URL,
    DATABASE_URL_prefix: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 40) + '...' : 'NOT SET',
    NODE_ENV: process.env.NODE_ENV,
    POSTGRES_HOST: process.env.POSTGRES_HOST || 'NOT SET',
    POSTGRES_DB: process.env.POSTGRES_DB || 'NOT SET',
    POSTGRES_USER: process.env.POSTGRES_USER ? 'SET' : 'NOT SET'
  };

  res.json(config);
});

module.exports = router;
