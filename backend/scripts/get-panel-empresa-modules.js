#!/usr/bin/env node

/**
 * Obtener módulos de panel-empresa que tienen frontend
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function main() {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'attendance_system',
    user: 'postgres',
    password: 'Aedr15150302'
  });

  console.log('🔍 Consultando system_modules...\n');

  // Primero ver qué columnas existen
  const columnsResult = await pool.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'system_modules'
    ORDER BY ordinal_position
  `);

  console.log('📋 Columnas disponibles:');
  columnsResult.rows.forEach(row => console.log(`   - ${row.column_name}`));
  console.log('');

  // Obtener módulos
  const result = await pool.query(`
    SELECT * FROM system_modules
    WHERE module_key IS NOT NULL
    ORDER BY module_key
    LIMIT 5
  `);

  console.log('📄 Ejemplo de registro:');
  console.log(JSON.stringify(result.rows[0], null, 2));

  await pool.end();
}

main().catch(console.error);
