/**
 * MODULE SCANNER - Auto-descubrimiento de módulos y endpoints
 *
 * Escanea automáticamente:
 * - src/routes (Routes.js) extrae endpoints
 * - public (html files) extrae módulos de frontend
 * - src/models (model files) extrae modelos de BD
 * - Introspección de PostgreSQL para foreign keys
 *
 * @version 1.0.0
 * @date 2025-01-21
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

class ModuleScanner {
  constructor(database, systemRegistry) {
    this.database = database;
    this.registry = systemRegistry;
    this.sequelize = database.sequelize;
  }

  /**
   * Escaneo completo del sistema
   */
  async scanAll() {
    console.log('🔍 [SCANNER] Iniciando escaneo completo del sistema...\n');

    const results = {
      routes: await this.scanRoutes(),
      models: await this.scanModels(),
      foreignKeys: await this.scanDatabaseForeignKeys(),
      frontendModules: await this.scanFrontendModules(),
      timestamp: new Date()
    };

    console.log('\n✅ [SCANNER] Escaneo completo finalizado');
    console.log(`   📁 Rutas encontradas: ${results.routes.length}`);
    console.log(`   🗄️  Modelos encontrados: ${results.models.length}`);
    console.log(`   🔗 Foreign keys: ${results.foreignKeys.length}`);
    console.log(`   🌐 Módulos frontend: ${results.frontendModules.length}`);

    return results;
  }

  /**
   * Escanea src/routes/*Routes.js y extrae endpoints
   */
  async scanRoutes() {
    console.log('  📂 [SCANNER] Escaneando rutas en src/routes/...');

    const routesDir = path.join(__dirname, '../../routes');
    const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('Routes.js'));

    const endpoints = [];

    for (const file of routeFiles) {
      const filePath = path.join(routesDir, file);
      const content = fs.readFileSync(filePath, 'utf8');

      // Extraer módulo name (ej: "attendanceRoutes.js" → "attendance")
      const moduleName = file.replace('Routes.js', '');

      // Regex para detectar router.get/post/put/delete/patch
      const routeRegex = /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g;

      let match;
      while ((match = routeRegex.exec(content)) !== null) {
        const [, method, route] = match;

        endpoints.push({
          module: moduleName,
          method: method.toUpperCase(),
          path: route,
          fullPath: `/api/${route.startsWith('/') ? route.slice(1) : route}`,
          source: file
        });
      }
    }

    console.log(`     ✅ ${endpoints.length} endpoints encontrados`);
    return endpoints;
  }

  /**
   * Escanea src/models/*.js y extrae modelos
   */
  async scanModels() {
    console.log('  🗄️  [SCANNER] Escaneando modelos en src/models/...');

    const modelsDir = path.join(__dirname, '../../models');

    if (!fs.existsSync(modelsDir)) {
      console.log('     ⚠️  Directorio src/models/ no encontrado');
      return [];
    }

    const modelFiles = fs.readdirSync(modelsDir).filter(f => f.endsWith('.js') && f !== 'index.js');

    const models = [];

    for (const file of modelFiles) {
      const modelName = file.replace('.js', '');
      const content = fs.readFileSync(path.join(modelsDir, file), 'utf8');

      // Intentar extraer nombre de tabla (sequelize.define('table_name', ...))
      const defineMatch = content.match(/sequelize\.define\s*\(\s*['"`]([^'"`]+)['"`]/);
      const tableName = defineMatch ? defineMatch[1] : modelName.toLowerCase();

      // Intentar extraer campos
      const fieldsMatches = [...content.matchAll(/(\w+):\s*\{\s*type:\s*DataTypes\.(\w+)/g)];
      const fields = fieldsMatches.map(m => ({ name: m[1], type: m[2] }));

      models.push({
        name: modelName,
        tableName,
        fields,
        source: file
      });
    }

    console.log(`     ✅ ${models.length} modelos encontrados`);
    return models;
  }

  /**
   * Introspección de BD - Foreign Keys (PostgreSQL)
   */
  async scanDatabaseForeignKeys() {
    console.log('  🔗 [SCANNER] Introspección de BD - Foreign Keys...');

    try {
      const [foreignKeys] = await this.sequelize.query(`
        SELECT
          tc.table_name AS from_table,
          kcu.column_name AS from_column,
          ccu.table_name AS to_table,
          ccu.column_name AS to_column,
          tc.constraint_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
        ORDER BY tc.table_name;
      `);

      console.log(`     ✅ ${foreignKeys.length} foreign keys encontradas`);
      return foreignKeys;

    } catch (error) {
      console.error('     ❌ Error escaneando foreign keys:', error.message);
      return [];
    }
  }

  /**
   * Escanea public (html files) y extrae módulos de frontend
   */
  async scanFrontendModules() {
    console.log('  🌐 [SCANNER] Escaneando módulos frontend en public/...');

    try {
      const publicDir = path.join(__dirname, '../../../public');
      const htmlFiles = await glob('**/*.html', { cwd: publicDir });

      const modules = [];

      for (const file of htmlFiles) {
        const filePath = path.join(publicDir, file);
        const content = fs.readFileSync(filePath, 'utf8');

        // Buscar funciones openModule('module-name')
        const moduleMatches = [...content.matchAll(/openModule\s*\(\s*['"`]([^'"`]+)['"`]/g)];

        for (const match of moduleMatches) {
          const moduleName = match[1];

          if (!modules.find(m => m.name === moduleName)) {
            modules.push({
              name: moduleName,
              source: file,
              type: 'frontend'
            });
          }
        }

        // Buscar data-module attributes
        const dataModuleMatches = [...content.matchAll(/data-module\s*=\s*['"`]([^'"`]+)['"`]/g)];

        for (const match of dataModuleMatches) {
          const moduleName = match[1];

          if (!modules.find(m => m.name === moduleName)) {
            modules.push({
              name: moduleName,
              source: file,
              type: 'frontend-data-attribute'
            });
          }
        }
      }

      console.log(`     ✅ ${modules.length} módulos frontend encontrados`);
      return modules;

    } catch (error) {
      console.error('     ❌ Error escaneando frontend:', error.message);
      return [];
    }
  }

  /**
   * Introspección de BD - Obtener estructura de tablas
   */
  async scanDatabaseSchema() {
    console.log('  📊 [SCANNER] Introspección de BD - Schema completo...');

    try {
      const [tables] = await this.sequelize.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `);

      const schema = [];

      for (const { table_name } of tables) {
        const [columns] = await this.sequelize.query(`
          SELECT
            column_name,
            data_type,
            is_nullable,
            column_default
          FROM information_schema.columns
          WHERE table_name = '${table_name}'
          ORDER BY ordinal_position;
        `);

        schema.push({
          table: table_name,
          columns
        });
      }

      console.log(`     ✅ ${schema.length} tablas escaneadas`);
      return schema;

    } catch (error) {
      console.error('     ❌ Error escaneando schema:', error.message);
      return [];
    }
  }

  /**
   * Sincronizar descubrimientos con SystemRegistry
   */
  async syncWithRegistry(scanResults) {
    console.log('\n🔄 [SCANNER] Sincronizando con SystemRegistry...');

    let added = 0;
    let updated = 0;

    // Agregar endpoints descubiertos a módulos existentes
    for (const endpoint of scanResults.routes) {
      const module = this.registry.getModule(endpoint.module);

      if (module) {
        // Agregar endpoint si no existe
        if (!module.api_endpoints) {
          module.api_endpoints = [];
        }

        const exists = module.api_endpoints.some(
          e => e.path === endpoint.path && e.method === endpoint.method
        );

        if (!exists) {
          module.api_endpoints.push({
            path: endpoint.path,
            method: endpoint.method,
            description: `Auto-discovered from ${endpoint.source}`
          });
          updated++;
        }
      } else {
        // Crear módulo nuevo si no existe
        console.log(`     ➕ Nuevo módulo detectado: ${endpoint.module}`);
        // (Aquí se podría crear un módulo básico auto-generado)
        added++;
      }
    }

    console.log(`✅ [SCANNER] Sincronización completada`);
    console.log(`   ➕ Módulos nuevos: ${added}`);
    console.log(`   🔄 Módulos actualizados: ${updated}`);

    return { added, updated };
  }
}

module.exports = ModuleScanner;
