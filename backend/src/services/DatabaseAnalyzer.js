/**
 * ============================================================================
 * DATABASE ANALYZER - ANÁLISIS AUTOMÁTICO DE SCHEMA + DEPENDENCIAS
 * ============================================================================
 *
 * PROPÓSITO CRÍTICO:
 * "Instructivo precioso con reglas claras" para coordinar 10 sesiones de Claude Code
 * trabajando en paralelo sin interferencias ni rupturas.
 *
 * FUNCIONALIDADES:
 * 1. Analiza schema completo de PostgreSQL (todas las tablas + campos)
 * 2. Detecta QUÉ MÓDULOS usan CADA CAMPO específico
 * 3. Identifica dependencias cruzadas (campo usado por múltiples módulos)
 * 4. Genera REGLAS DE MODIFICACIÓN SEGURA
 * 5. Auto-actualiza cuando se completan tareas
 *
 * OBJETIVO FINAL:
 * Permitir que 10 sesiones de Claude Code trabajen simultáneamente siguiendo
 * un plan maestro sin interferirse ni romper el sistema.
 *
 * ============================================================================
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

class DatabaseAnalyzer {
  constructor() {
    this.backendRoot = path.join(__dirname, '../..');
    this.metadataPath = path.join(this.backendRoot, 'engineering-metadata.js');

    // Pool de conexiones PostgreSQL (usar mismas credenciales que database.js)
    this.pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || 'attendance_system',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'Aedr15150302'
    });
  }

  /**
   * ============================================================================
   * ANÁLISIS COMPLETO DEL SCHEMA
   * ============================================================================
   */

  async analyzeCompleteSchema() {
    console.log('\n🔍 [DATABASE ANALYZER] Iniciando análisis completo del schema...\n');

    const result = {
      timestamp: new Date().toISOString(),
      tables: {},
      totalTables: 0,
      totalFields: 0,
      dependencies: {},
      modificationRules: []
    };

    try {
      // PASO 1: Obtener todas las tablas
      const tables = await this.getAllTables();
      console.log(`   📊 Tablas encontradas: ${tables.length}`);

      // PASO 2: Analizar cada tabla
      for (const tableName of tables) {
        console.log(`\n   🔍 Analizando tabla: ${tableName}...`);

        const tableInfo = await this.analyzeTable(tableName);
        result.tables[tableName] = tableInfo;
        result.totalFields += tableInfo.fields.length;

        console.log(`      ✅ ${tableInfo.fields.length} campos analizados`);
      }

      result.totalTables = tables.length;

      // PASO 3: Analizar dependencias cruzadas
      console.log('\n   🔗 Analizando dependencias cruzadas...');
      result.dependencies = await this.analyzeCrossDependencies(result.tables);
      console.log(`      ✅ ${Object.keys(result.dependencies).length} dependencias detectadas`);

      // PASO 4: Generar reglas de modificación segura
      console.log('\n   📋 Generando reglas de modificación segura...');
      result.modificationRules = this.generateModificationRules(result.tables, result.dependencies);
      console.log(`      ✅ ${result.modificationRules.length} reglas generadas`);

      // PASO 5: Guardar en metadata
      await this.saveToMetadata(result);

      console.log('\n' + '='.repeat(80));
      console.log('✅ ANÁLISIS COMPLETADO');
      console.log(`📊 Estadísticas:`);
      console.log(`   - Tablas: ${result.totalTables}`);
      console.log(`   - Campos totales: ${result.totalFields}`);
      console.log(`   - Dependencias cruzadas: ${Object.keys(result.dependencies).length}`);
      console.log(`   - Reglas de seguridad: ${result.modificationRules.length}`);
      console.log('='.repeat(80) + '\n');

      return result;

    } catch (error) {
      console.error(`\n❌ Error: ${error.message}`);
      throw error;
    }
  }

  /**
   * ============================================================================
   * OBTENER TODAS LAS TABLAS
   * ============================================================================
   */

  async getAllTables() {
    const query = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    const result = await this.pool.query(query);
    return result.rows.map(row => row.table_name);
  }

  /**
   * ============================================================================
   * ANALIZAR UNA TABLA ESPECÍFICA
   * ============================================================================
   */

  async analyzeTable(tableName) {
    const tableInfo = {
      name: tableName,
      fields: [],
      primaryKey: null,
      foreignKeys: [],
      indexes: [],
      totalFields: 0
    };

    try {
      // Obtener campos de la tabla
      const fieldsQuery = `
        SELECT
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position;
      `;

      const fieldsResult = await this.pool.query(fieldsQuery, [tableName]);

      // Analizar cada campo
      for (const row of fieldsResult.rows) {
        const fieldName = row.column_name;

        // Detectar en qué módulos se usa este campo
        const usedBy = await this.detectFieldUsage(tableName, fieldName);

        const fieldInfo = {
          name: fieldName,
          type: row.data_type,
          maxLength: row.character_maximum_length,
          nullable: row.is_nullable === 'YES',
          default: row.column_default,
          usedBy: usedBy.modules,
          locations: usedBy.locations,
          queryTypes: usedBy.queryTypes,
          riskLevel: usedBy.modules.length > 3 ? 'HIGH' : usedBy.modules.length > 1 ? 'MEDIUM' : 'LOW'
        };

        tableInfo.fields.push(fieldInfo);
      }

      tableInfo.totalFields = tableInfo.fields.length;

      // Obtener primary key
      tableInfo.primaryKey = await this.getPrimaryKey(tableName);

      // Obtener foreign keys
      tableInfo.foreignKeys = await this.getForeignKeys(tableName);

      return tableInfo;

    } catch (error) {
      console.error(`      ❌ Error analizando tabla ${tableName}: ${error.message}`);
      return tableInfo;
    }
  }

  /**
   * ============================================================================
   * DETECTAR DÓNDE SE USA UN CAMPO (QUÉ MÓDULOS)
   * ============================================================================
   * Esta es la función CRÍTICA para coordinar múltiples sesiones de Claude
   */

  async detectFieldUsage(tableName, fieldName) {
    const usage = {
      modules: [],
      locations: [],
      queryTypes: []
    };

    try {
      const searchDirs = [
        path.join(this.backendRoot, 'src/routes'),
        path.join(this.backendRoot, 'src/models'),
        path.join(this.backendRoot, 'src/services'),
        path.join(this.backendRoot, 'public/js/modules')
      ];

      for (const dir of searchDirs) {
        if (!fs.existsSync(dir)) continue;

        const files = fs.readdirSync(dir);

        for (const file of files) {
          if (!file.endsWith('.js')) continue;

          const filePath = path.join(dir, file);
          const content = fs.readFileSync(filePath, 'utf8');

          // Buscar referencias al campo
          const fieldPattern = new RegExp(`['"\`]${fieldName}['"\`]`, 'gi');
          const tableFieldPattern = new RegExp(`${tableName}\\.${fieldName}`, 'gi');

          if (fieldPattern.test(content) || tableFieldPattern.test(content)) {
            // Determinar módulo relacionado
            const moduleName = this.inferModuleFromFile(filePath);

            if (moduleName && !usage.modules.includes(moduleName)) {
              usage.modules.push(moduleName);
            }

            // Guardar ubicación
            const location = filePath.replace(this.backendRoot, '');
            if (!usage.locations.includes(location)) {
              usage.locations.push(location);
            }

            // Detectar tipo de query (SELECT, UPDATE, INSERT, DELETE)
            if (content.match(/SELECT.*?${fieldName}/i)) {
              if (!usage.queryTypes.includes('SELECT')) usage.queryTypes.push('SELECT');
            }
            if (content.match(/UPDATE.*?${fieldName}/i)) {
              if (!usage.queryTypes.includes('UPDATE')) usage.queryTypes.push('UPDATE');
            }
            if (content.match(/INSERT.*?${fieldName}/i)) {
              if (!usage.queryTypes.includes('INSERT')) usage.queryTypes.push('INSERT');
            }
            if (content.match(/DELETE.*?${fieldName}/i)) {
              if (!usage.queryTypes.includes('DELETE')) usage.queryTypes.push('DELETE');
            }
          }
        }
      }

    } catch (error) {
      console.warn(`         ⚠️  Error detectando uso de ${tableName}.${fieldName}: ${error.message}`);
    }

    return usage;
  }

  /**
   * Inferir módulo desde path de archivo
   */
  inferModuleFromFile(filePath) {
    const fileName = path.basename(filePath, '.js').toLowerCase();

    // Extraer nombre base
    const baseName = fileName
      .replace(/routes|model|service|-postgresql/gi, '')
      .replace(/[-_]/g, '');

    // Mapeo común
    const moduleMap = {
      'user': 'users',
      'attendance': 'attendance',
      'department': 'departments',
      'shift': 'shifts',
      'kiosk': 'kiosks',
      'company': 'companies',
      'vacation': 'vacation',
      'medical': 'medical',
      'partner': 'partners',
      'biometric': 'biometric-dashboard',
      'auth': 'authentication',
      'notification': 'notifications'
    };

    for (const [key, module] of Object.entries(moduleMap)) {
      if (baseName.includes(key)) {
        return module;
      }
    }

    return baseName || 'unknown';
  }

  /**
   * ============================================================================
   * OBTENER PRIMARY KEY DE UNA TABLA
   * ============================================================================
   */

  async getPrimaryKey(tableName) {
    const query = `
      SELECT column_name
      FROM information_schema.key_column_usage
      WHERE table_name = $1
        AND constraint_name = $1 || '_pkey';
    `;

    try {
      const result = await this.pool.query(query, [tableName]);
      return result.rows.length > 0 ? result.rows[0].column_name : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * ============================================================================
   * OBTENER FOREIGN KEYS DE UNA TABLA
   * ============================================================================
   */

  async getForeignKeys(tableName) {
    const query = `
      SELECT
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = $1;
    `;

    try {
      const result = await this.pool.query(query, [tableName]);
      return result.rows;
    } catch (error) {
      return [];
    }
  }

  /**
   * ============================================================================
   * ANALIZAR DEPENDENCIAS CRUZADAS
   * ============================================================================
   */

  async analyzeCrossDependencies(tables) {
    const dependencies = {};

    for (const [tableName, tableInfo] of Object.entries(tables)) {
      for (const field of tableInfo.fields) {
        // Solo analizar campos usados por múltiples módulos
        if (field.usedBy.length > 1) {
          const key = `${tableName}.${field.name}`;

          dependencies[key] = {
            table: tableName,
            field: field.name,
            type: field.type,
            usedBy: field.usedBy,
            locations: field.locations,
            riskLevel: field.riskLevel,
            warning: `⚠️ Campo usado por ${field.usedBy.length} módulos. Modificar con precaución.`
          };
        }
      }
    }

    return dependencies;
  }

  /**
   * ============================================================================
   * GENERAR REGLAS DE MODIFICACIÓN SEGURA
   * ============================================================================
   */

  generateModificationRules(tables, dependencies) {
    const rules = [];

    // REGLA 1: Campos de múltiples módulos
    for (const [key, dep] of Object.entries(dependencies)) {
      rules.push({
        id: `RULE-${rules.length + 1}`,
        type: 'MULTI_MODULE_FIELD',
        severity: dep.riskLevel,
        field: key,
        rule: `Antes de modificar ${key}, coordinar con: ${dep.usedBy.join(', ')}`,
        affectedModules: dep.usedBy,
        action: 'COORDINATE_FIRST'
      });
    }

    // REGLA 2: Campos NOT NULL
    for (const [tableName, tableInfo] of Object.entries(tables)) {
      for (const field of tableInfo.fields) {
        if (!field.nullable && field.usedBy.length > 0) {
          rules.push({
            id: `RULE-${rules.length + 1}`,
            type: 'NOT_NULL_CONSTRAINT',
            severity: 'HIGH',
            field: `${tableName}.${field.name}`,
            rule: `Campo NOT NULL. Nunca eliminar sin migración. Afecta: ${field.usedBy.join(', ')}`,
            affectedModules: field.usedBy,
            action: 'MIGRATION_REQUIRED'
          });
        }
      }
    }

    // REGLA 3: Foreign Keys
    for (const [tableName, tableInfo] of Object.entries(tables)) {
      for (const fk of tableInfo.foreignKeys) {
        const affectedModules = tableInfo.fields
          .find(f => f.name === fk.column_name)?.usedBy || [];

        rules.push({
          id: `RULE-${rules.length + 1}`,
          type: 'FOREIGN_KEY',
          severity: 'CRITICAL',
          field: `${tableName}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`,
          rule: `FK constraint. Eliminar/modificar rompe relación. Coordinar modificación en ambas tablas.`,
          affectedModules,
          action: 'DUAL_TABLE_COORDINATION'
        });
      }
    }

    return rules;
  }

  /**
   * ============================================================================
   * GUARDAR EN METADATA
   * ============================================================================
   */

  async saveToMetadata(analysisResult) {
    try {
      // Leer metadata actual
      delete require.cache[require.resolve(this.metadataPath)];
      const metadata = require(this.metadataPath);

      // Agregar análisis de base de datos
      metadata.database = {
        schema: analysisResult.tables,
        dependencies: analysisResult.dependencies,
        modificationRules: analysisResult.modificationRules,
        statistics: {
          totalTables: analysisResult.totalTables,
          totalFields: analysisResult.totalFields,
          crossDependencies: Object.keys(analysisResult.dependencies).length,
          safetyRules: analysisResult.modificationRules.length
        },
        lastAnalyzed: analysisResult.timestamp
      };

      // Guardar archivo
      const content = `/**\n * ENGINEERING METADATA - AUTO-UPDATED\n * Last database analysis: ${analysisResult.timestamp}\n */\n\nmodule.exports = ${JSON.stringify(metadata, null, 2)};\n`;
      fs.writeFileSync(this.metadataPath, content, 'utf8');

      console.log(`   💾 Metadata actualizado con análisis de BD`);

    } catch (error) {
      console.error(`   ❌ Error guardando metadata: ${error.message}`);
      throw error;
    }
  }

  /**
   * ============================================================================
   * VERIFICAR SI ES SEGURO MODIFICAR UN CAMPO
   * ============================================================================
   */

  async isSafeToModify(tableName, fieldName) {
    const metadata = require(this.metadataPath);
    const database = metadata.database;

    if (!database) {
      return {
        safe: false,
        reason: 'No hay análisis de BD disponible. Ejecutar DatabaseAnalyzer primero.',
        suggestedAction: 'RUN_ANALYSIS'
      };
    }

    const table = database.schema[tableName];
    if (!table) {
      return {
        safe: false,
        reason: `Tabla ${tableName} no encontrada en análisis.`,
        suggestedAction: 'UPDATE_ANALYSIS'
      };
    }

    const field = table.fields.find(f => f.name === fieldName);
    if (!field) {
      return {
        safe: false,
        reason: `Campo ${fieldName} no encontrado en tabla ${tableName}.`,
        suggestedAction: 'UPDATE_ANALYSIS'
      };
    }

    // Verificar nivel de riesgo
    if (field.riskLevel === 'HIGH') {
      return {
        safe: false,
        reason: `Campo de ALTO RIESGO. Usado por ${field.usedBy.length} módulos: ${field.usedBy.join(', ')}`,
        suggestedAction: 'COORDINATE_WITH_MODULES',
        affectedModules: field.usedBy,
        locations: field.locations
      };
    }

    if (field.riskLevel === 'MEDIUM') {
      return {
        safe: true,
        warning: `Campo de RIESGO MEDIO. Usado por ${field.usedBy.length} módulos: ${field.usedBy.join(', ')}`,
        suggestedAction: 'REVIEW_BEFORE_MODIFY',
        affectedModules: field.usedBy,
        locations: field.locations
      };
    }

    return {
      safe: true,
      reason: `Campo de BAJO RIESGO. Usado solo por: ${field.usedBy.join(', ') || 'ningún módulo'}`,
      suggestedAction: 'SAFE_TO_MODIFY',
      affectedModules: field.usedBy
    };
  }

  /**
   * Cerrar pool de conexiones
   */
  async close() {
    await this.pool.end();
  }
}

module.exports = new DatabaseAnalyzer();
