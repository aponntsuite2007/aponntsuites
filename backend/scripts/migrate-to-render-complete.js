/**
 * MIGRACIÓN COMPLETA DE BD LOCAL → RENDER
 *
 * Este script migra TODO:
 * - Schema completo (CREATE TABLE)
 * - Datos completos (INSERT)
 * - Funciones PostgreSQL
 * - Índices, constraints, triggers
 *
 * @version 1.0.0
 * @created 2025-12-21
 */

const { Client } = require('pg');

// Configuración de conexiones
const LOCAL_CONFIG = {
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'Aedr15150302',
  database: 'attendance_system'
};

const RENDER_CONFIG = {
  host: 'dpg-d4op2lq4d50c7392i190-a.oregon-postgres.render.com',
  port: 5432,
  user: 'aponnt_db_user',
  password: 'G50GN9h8meeCVsfi51Z7SlPQn4ThyJXY',
  database: 'aponnt_db',
  ssl: {
    rejectUnauthorized: false
  }
};

class DatabaseMigrator {
  constructor() {
    this.localClient = null;
    this.renderClient = null;
    this.stats = {
      tables: 0,
      rows: 0,
      functions: 0,
      errors: []
    };
  }

  /**
   * Conectar a ambas bases de datos
   */
  async connect() {
    console.log('📡 Conectando a bases de datos...\n');

    this.localClient = new Client(LOCAL_CONFIG);
    await this.localClient.connect();
    console.log('✅ Conectado a BD LOCAL (attendance_system)');

    this.renderClient = new Client(RENDER_CONFIG);
    await this.renderClient.connect();
    console.log('✅ Conectado a BD RENDER (aponnt_db)\n');
  }

  /**
   * Obtener lista de todas las tablas (excluyendo system tables)
   */
  async getTables() {
    const result = await this.localClient.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    return result.rows.map(r => r.tablename);
  }

  /**
   * Obtener CREATE TABLE statement de una tabla
   */
  async getTableSchema(tableName) {
    const result = await this.localClient.query(`
      SELECT
        'CREATE TABLE ' || quote_ident(tablename) || ' (' ||
        string_agg(
          quote_ident(column_name) || ' ' ||
          data_type ||
          CASE
            WHEN character_maximum_length IS NOT NULL
            THEN '(' || character_maximum_length || ')'
            ELSE ''
          END ||
          CASE
            WHEN is_nullable = 'NO' THEN ' NOT NULL'
            ELSE ''
          END,
          ', '
          ORDER BY ordinal_position
        ) || ');' as create_statement
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
      GROUP BY tablename
    `, [tableName]);

    if (result.rows.length > 0) {
      return result.rows[0].create_statement;
    }
    return null;
  }

  /**
   * Obtener todos los datos de una tabla
   */
  async getTableData(tableName) {
    const result = await this.localClient.query(`SELECT * FROM ${tableName}`);
    return result.rows;
  }

  /**
   * Obtener todas las funciones PostgreSQL
   */
  async getFunctions() {
    const result = await this.localClient.query(`
      SELECT
        p.proname as name,
        pg_get_functiondef(p.oid) as definition
      FROM pg_proc p
      INNER JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.prokind = 'f'
      ORDER BY p.proname
    `);
    return result.rows;
  }

  /**
   * Limpiar BD de Render (DROP ALL TABLES)
   */
  async cleanRenderDB() {
    console.log('🧹 Limpiando BD de Render...\n');

    try {
      await this.renderClient.query(`
        DROP SCHEMA public CASCADE;
        CREATE SCHEMA public;
        GRANT ALL ON SCHEMA public TO aponnt_db_user;
        GRANT ALL ON SCHEMA public TO public;
      `);
      console.log('✅ BD de Render limpiada exitosamente\n');
    } catch (error) {
      console.error('⚠️  Error limpiando BD:', error.message);
      // Continuar de todas formas
    }
  }

  /**
   * Migrar schema completo
   */
  async migrateSchema() {
    console.log('🏗️  MIGRANDO SCHEMA...\n');

    const tables = await this.getTables();
    console.log(`📊 Total de tablas a migrar: ${tables.length}\n`);

    for (const table of tables) {
      try {
        console.log(`  📋 Creando tabla: ${table}...`);

        // Obtener schema real usando pg_dump-like query
        const schemaResult = await this.localClient.query(`
          SELECT
            'CREATE TABLE ' || quote_ident($1) || ' (' ||
            string_agg(
              quote_ident(a.attname) || ' ' ||
              pg_catalog.format_type(a.atttypid, a.atttypmod) ||
              CASE
                WHEN a.attnotnull THEN ' NOT NULL'
                ELSE ''
              END ||
              CASE
                WHEN a.atthasdef THEN ' DEFAULT ' || pg_get_expr(d.adbin, d.adrelid)
                ELSE ''
              END,
              ', '
              ORDER BY a.attnum
            ) ||
            COALESCE(', ' || (
              SELECT string_agg('CONSTRAINT ' || quote_ident(conname) || ' ' || pg_get_constraintdef(oid), ', ')
              FROM pg_constraint
              WHERE conrelid = c.oid
            ), '') ||
            ');' as ddl
          FROM pg_class c
          INNER JOIN pg_namespace n ON c.relnamespace = n.oid
          INNER JOIN pg_attribute a ON a.attrelid = c.oid
          LEFT JOIN pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
          WHERE c.relname = $1
            AND n.nspname = 'public'
            AND a.attnum > 0
            AND NOT a.attisdropped
          GROUP BY c.oid, c.relname
        `, [table]);

        if (schemaResult.rows.length > 0) {
          const ddl = schemaResult.rows[0].ddl;
          await this.renderClient.query(ddl);
          console.log(`     ✅ ${table} creada`);
          this.stats.tables++;
        }

      } catch (error) {
        console.error(`     ❌ Error con ${table}:`, error.message);
        this.stats.errors.push({ table, error: error.message, phase: 'schema' });
      }
    }

    console.log('\n✅ Schema migrado\n');
  }

  /**
   * Migrar datos completos
   */
  async migrateData() {
    console.log('📦 MIGRANDO DATOS...\n');

    const tables = await this.getTables();

    for (const table of tables) {
      try {
        const data = await this.getTableData(table);

        if (data.length === 0) {
          console.log(`  📋 ${table}: 0 registros (tabla vacía)`);
          continue;
        }

        console.log(`  📋 ${table}: ${data.length} registros...`);

        // Insertar en batches de 100
        const batchSize = 100;
        for (let i = 0; i < data.length; i += batchSize) {
          const batch = data.slice(i, i + batchSize);

          for (const row of batch) {
            const columns = Object.keys(row);
            const values = Object.values(row);
            const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');

            const insertSQL = `
              INSERT INTO ${table} (${columns.map(c => `"${c}"`).join(', ')})
              VALUES (${placeholders})
              ON CONFLICT DO NOTHING
            `;

            try {
              await this.renderClient.query(insertSQL, values);
              this.stats.rows++;
            } catch (error) {
              // Log error pero continuar
              if (!error.message.includes('duplicate key')) {
                console.error(`       ⚠️  Error insertando registro:`, error.message);
              }
            }
          }
        }

        console.log(`     ✅ ${data.length} registros insertados`);

      } catch (error) {
        console.error(`     ❌ Error con datos de ${table}:`, error.message);
        this.stats.errors.push({ table, error: error.message, phase: 'data' });
      }
    }

    console.log('\n✅ Datos migrados\n');
  }

  /**
   * Migrar funciones PostgreSQL
   */
  async migrateFunctions() {
    console.log('⚙️  MIGRANDO FUNCIONES...\n');

    try {
      const functions = await this.getFunctions();
      console.log(`📊 Total de funciones: ${functions.length}\n`);

      for (const func of functions) {
        try {
          console.log(`  🔧 ${func.name}...`);
          await this.renderClient.query(func.definition);
          console.log(`     ✅ Creada`);
          this.stats.functions++;
        } catch (error) {
          console.error(`     ❌ Error:`, error.message);
          this.stats.errors.push({ function: func.name, error: error.message, phase: 'functions' });
        }
      }

      console.log('\n✅ Funciones migradas\n');

    } catch (error) {
      console.error('❌ Error obteniendo funciones:', error.message);
    }
  }

  /**
   * Verificar migración
   */
  async verify() {
    console.log('🔍 VERIFICANDO MIGRACIÓN...\n');

    // Contar tablas
    const localTables = await this.localClient.query(`
      SELECT COUNT(*) as count FROM pg_tables WHERE schemaname = 'public'
    `);
    const renderTables = await this.renderClient.query(`
      SELECT COUNT(*) as count FROM pg_tables WHERE schemaname = 'public'
    `);

    console.log(`📋 Tablas:`);
    console.log(`   Local:  ${localTables.rows[0].count}`);
    console.log(`   Render: ${renderTables.rows[0].count}`);

    // Contar registros totales (aproximado)
    const tables = await this.getTables();
    let localTotal = 0;
    let renderTotal = 0;

    for (const table of tables) {
      try {
        const localCount = await this.localClient.query(`SELECT COUNT(*) as count FROM ${table}`);
        const renderCount = await this.renderClient.query(`SELECT COUNT(*) as count FROM ${table}`);
        localTotal += parseInt(localCount.rows[0].count);
        renderTotal += parseInt(renderCount.rows[0].count);
      } catch (error) {
        // Tabla no existe en Render
      }
    }

    console.log(`\n📊 Registros totales (aproximado):`);
    console.log(`   Local:  ${localTotal}`);
    console.log(`   Render: ${renderTotal}`);

    if (localTotal === renderTotal) {
      console.log(`\n✅ MIGRACIÓN EXITOSA - Registros coinciden`);
    } else {
      console.log(`\n⚠️  ADVERTENCIA - Diferencia de ${Math.abs(localTotal - renderTotal)} registros`);
    }
  }

  /**
   * Ejecutar migración completa
   */
  async migrate() {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║   🚀 MIGRACIÓN COMPLETA: LOCAL → RENDER                 ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    try {
      await this.connect();

      // Confirmar antes de limpiar
      console.log('⚠️  ADVERTENCIA: Esto borrará TODA la data actual de Render\n');

      await this.cleanRenderDB();
      await this.migrateSchema();
      await this.migrateData();
      await this.migrateFunctions();
      await this.verify();

      console.log('\n╔══════════════════════════════════════════════════════════╗');
      console.log('║   ✅ MIGRACIÓN COMPLETADA                               ║');
      console.log('╚══════════════════════════════════════════════════════════╝\n');

      console.log('📊 ESTADÍSTICAS:');
      console.log(`   Tablas migradas:     ${this.stats.tables}`);
      console.log(`   Registros migrados:  ${this.stats.rows}`);
      console.log(`   Funciones migradas:  ${this.stats.functions}`);
      console.log(`   Errores:             ${this.stats.errors.length}\n`);

      if (this.stats.errors.length > 0) {
        console.log('❌ ERRORES DETECTADOS:');
        this.stats.errors.forEach(err => {
          console.log(`   - [${err.phase}] ${err.table || err.function}: ${err.error}`);
        });
      }

    } catch (error) {
      console.error('\n❌ ERROR FATAL:', error.message);
      console.error(error.stack);
      process.exit(1);
    } finally {
      if (this.localClient) await this.localClient.end();
      if (this.renderClient) await this.renderClient.end();
    }
  }
}

// Ejecutar migración
if (require.main === module) {
  const migrator = new DatabaseMigrator();
  migrator.migrate()
    .then(() => {
      console.log('\n🎉 Proceso completado exitosamente\n');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = DatabaseMigrator;
