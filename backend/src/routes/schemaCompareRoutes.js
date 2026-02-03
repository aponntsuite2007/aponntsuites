const express = require('express');
const router = express.Router();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

/**
 * Endpoint para comparar schema completo LOCAL vs RENDER
 * y generar ALTER TABLE para todas las diferencias
 *
 * POST /api/schema-compare/analyze - Analiza diferencias
 * POST /api/schema-compare/sync - Ejecuta sincronización completa
 */

router.post('/analyze', async (req, res) => {
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

    // 1. Obtener TODAS las columnas de TODAS las tablas en Render
    const renderColumnsResult = await client.query(`
      SELECT
        table_name,
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `);

    const renderColumns = {};
    renderColumnsResult.rows.forEach(row => {
      if (!renderColumns[row.table_name]) {
        renderColumns[row.table_name] = {};
      }
      renderColumns[row.table_name][row.column_name] = row;
    });

    // 2. Leer schema local y extraer definiciones de columnas
    const schemaPath = path.join(__dirname, '../../migrations/LOCAL_SCHEMA_FULL.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    // 3. Parsear CREATE TABLE statements
    const createTableRegex = /CREATE TABLE IF NOT EXISTS (\w+)\s*\(([\s\S]*?)\);/gi;
    const localTables = {};
    let match;

    while ((match = createTableRegex.exec(schema)) !== null) {
      const tableName = match[1];
      const columnsSection = match[2];

      // Parsear columnas (líneas que no son constraints)
      const columnLines = columnsSection
        .split('\n')
        .map(line => line.trim())
        .filter(line =>
          line &&
          !line.startsWith('CONSTRAINT') &&
          !line.startsWith('PRIMARY KEY') &&
          !line.startsWith('FOREIGN KEY') &&
          !line.startsWith('UNIQUE') &&
          !line.startsWith('CHECK')
        );

      localTables[tableName] = {};

      columnLines.forEach(line => {
        // Extraer nombre de columna y tipo
        const columnMatch = line.match(/^(\w+)\s+(\w+(?:\(\d+\))?)/);
        if (columnMatch) {
          const columnName = columnMatch[1];
          const dataType = columnMatch[2];

          localTables[tableName][columnName] = {
            column_name: columnName,
            data_type: dataType.toLowerCase(),
            definition: line.replace(/,$/, '')
          };
        }
      });
    }

    // 4. Comparar y encontrar diferencias
    const missingColumns = [];
    const missingTables = [];

    Object.keys(localTables).forEach(tableName => {
      if (!renderColumns[tableName]) {
        missingTables.push(tableName);
      } else {
        Object.keys(localTables[tableName]).forEach(columnName => {
          if (!renderColumns[tableName][columnName]) {
            missingColumns.push({
              table: tableName,
              column: columnName,
              definition: localTables[tableName][columnName].definition
            });
          }
        });
      }
    });

    await client.end();

    return res.json({
      success: true,
      analysis: {
        tablesInLocal: Object.keys(localTables).length,
        tablesInRender: Object.keys(renderColumns).length,
        missingTables: missingTables.length,
        missingColumns: missingColumns.length
      },
      missingTables,
      missingColumns: missingColumns.slice(0, 100), // Primeras 100
      totalMissingColumns: missingColumns.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    try { await client.end(); } catch (e) {}

    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack?.substring(0, 1000)
    });
  }
});

router.post('/sync', async (req, res) => {
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

    // Ejecutar el análisis primero (código duplicado del endpoint /analyze)
    const renderColumnsResult = await client.query(`
      SELECT
        table_name,
        column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
    `);

    const renderColumns = {};
    renderColumnsResult.rows.forEach(row => {
      if (!renderColumns[row.table_name]) {
        renderColumns[row.table_name] = new Set();
      }
      renderColumns[row.table_name].add(row.column_name);
    });

    const schemaPath = path.join(__dirname, '../../migrations/LOCAL_SCHEMA_FULL.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    const createTableRegex = /CREATE TABLE IF NOT EXISTS (\w+)\s*\(([\s\S]*?)\);/gi;
    const alterStatements = [];
    let match;

    while ((match = createTableRegex.exec(schema)) !== null) {
      const tableName = match[1];
      const columnsSection = match[2];

      if (!renderColumns[tableName]) continue; // Tabla no existe, skip

      const columnLines = columnsSection
        .split('\n')
        .map(line => line.trim())
        .filter(line =>
          line &&
          !line.startsWith('CONSTRAINT') &&
          !line.startsWith('PRIMARY KEY') &&
          !line.startsWith('FOREIGN KEY') &&
          !line.startsWith('UNIQUE') &&
          !line.startsWith('CHECK')
        );

      columnLines.forEach(line => {
        const columnMatch = line.match(/^(\w+)\s+/);
        if (columnMatch) {
          const columnName = columnMatch[1];

          if (!renderColumns[tableName].has(columnName)) {
            // Columna falta, crear ALTER TABLE
            const definition = line.replace(/,$/, '').trim();
            alterStatements.push({
              table: tableName,
              column: columnName,
              sql: `ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS ${definition};`
            });
          }
        }
      });
    }

    // Ejecutar ALTER TABLE statements
    const results = [];
    let executed = 0;
    let errors = 0;

    for (const stmt of alterStatements) {
      try {
        await client.query(stmt.sql);
        executed++;

        if (executed % 50 === 0) {
          results.push({
            type: 'progress',
            message: `${executed}/${alterStatements.length} columnas agregadas`
          });
        }
      } catch (error) {
        errors++;
        if (errors <= 10) {
          results.push({
            type: 'error',
            table: stmt.table,
            column: stmt.column,
            error: error.message.substring(0, 100)
          });
        }
      }
    }

    await client.end();

    return res.json({
      success: true,
      summary: {
        totalAlterStatements: alterStatements.length,
        executed,
        errors
      },
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    try { await client.end(); } catch (e) {}

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
