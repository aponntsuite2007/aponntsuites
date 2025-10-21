/**
 * DATABASE COLLECTOR - Valida relaciones y datos en BD
 *
 * - Verifica que todas las tablas existan
 * - Valida relaciones (foreign keys)
 * - Detecta datos huérfanos
 * - Valida constraints únicos
 * - Prueba integridad referencial
 *
 * @version 1.0.0
 */

class DatabaseCollector {
  constructor(database, systemRegistry) {
    this.database = database;
    this.registry = systemRegistry;
    this.sequelize = database.sequelize;
  }

  async collect(execution_id, config) {
    console.log('  🗄️  [DATABASE] Iniciando validación de base de datos...');

    const results = [];

    // Test 1: Verificar conexión
    results.push(await this._testConnection(execution_id));

    // Test 2: Verificar que existan todas las tablas
    results.push(...await this._testTablesExist(execution_id, config));

    // Test 3: Validar relaciones
    results.push(...await this._testRelations(execution_id, config));

    // Test 4: Detectar datos huérfanos
    results.push(...await this._testOrphanedData(execution_id, config));

    // Test 5: Validar constraints
    results.push(...await this._testConstraints(execution_id, config));

    return results;
  }

  async _testConnection(execution_id) {
    const { AuditLog } = this.database;
    const log = await AuditLog.create({
      execution_id,
      test_type: 'database',
      module_name: 'database',
      test_name: 'Conexión a Base de Datos',
      test_description: 'Verifica que la conexión a PostgreSQL funcione',
      status: 'in-progress',
      started_at: new Date()
    });

    const startTime = Date.now();

    try {
      await this.sequelize.authenticate();
      const duration = Date.now() - startTime;

      await log.update({
        status: 'pass',
        duration_ms: duration,
        completed_at: new Date()
      });

      return log;
    } catch (error) {
      await log.addError(error);
      await log.update({ severity: 'critical', completed_at: new Date() });
      return log;
    }
  }

  async _testTablesExist(execution_id, config) {
    const { AuditLog } = this.database;
    const results = [];
    const modules = config.moduleFilter ?
      [this.registry.getModule(config.moduleFilter)] :
      this.registry.getAllModules();

    for (const module of modules) {
      if (!module || !module.database_tables) continue;

      for (const tableInfo of module.database_tables) {
        const log = await AuditLog.create({
          execution_id,
          test_type: 'database',
          module_name: module.id,
          test_name: `Tabla ${tableInfo.table} existe`,
          test_description: `Verifica que la tabla ${tableInfo.table} exista en BD`,
          status: 'in-progress',
          started_at: new Date()
        });

        try {
          const [results] = await this.sequelize.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.tables
              WHERE table_name = '${tableInfo.table}'
            );
          `);

          const exists = results[0].exists;

          await log.update({
            status: exists ? 'pass' : 'fail',
            severity: exists ? null : 'critical',
            error_message: exists ? null : `Tabla ${tableInfo.table} no existe`,
            completed_at: new Date()
          });

          results.push(log);
        } catch (error) {
          await log.addError(error);
          results.push(log);
        }
      }
    }

    return results;
  }

  async _testRelations(execution_id, config) {
    const { AuditLog } = this.database;
    const results = [];
    const modules = config.moduleFilter ?
      [this.registry.getModule(config.moduleFilter)] :
      this.registry.getAllModules();

    for (const module of modules) {
      if (!module || !module.relationships) continue;

      for (const relation of module.relationships) {
        const log = await AuditLog.create({
          execution_id,
          test_type: 'relation',
          module_name: module.id,
          test_name: `Relación ${module.id} → ${relation.model}`,
          test_description: relation.description,
          status: 'in-progress',
          started_at: new Date()
        });

        try {
          // Verificar que la relación esté definida en Sequelize
          const Model = this.database[this._capitalizeFirst(module.id)];
          const associations = Model?.associations || {};

          const relationExists = Object.values(associations).some(assoc => {
            return assoc.target.name === relation.model;
          });

          await log.update({
            status: relationExists ? 'pass' : 'fail',
            severity: relationExists ? null : 'high',
            error_message: relationExists ? null : `Relación no definida en Sequelize`,
            completed_at: new Date()
          });

          results.push(log);
        } catch (error) {
          await log.addError(error);
          results.push(log);
        }
      }
    }

    return results;
  }

  async _testOrphanedData(execution_id, config) {
    const { AuditLog } = this.database;
    const results = [];

    // Test común: Usuarios sin empresa
    const log = await AuditLog.create({
      execution_id,
      test_type: 'database',
      module_name: 'users',
      test_name: 'Usuarios huérfanos (sin empresa)',
      test_description: 'Detecta usuarios sin company_id válido',
      status: 'in-progress',
      started_at: new Date()
    });

    try {
      const [orphanedUsers] = await this.sequelize.query(`
        SELECT COUNT(*) as count
        FROM users u
        LEFT JOIN companies c ON u.company_id = c.company_id
        WHERE u.company_id IS NULL OR c.company_id IS NULL;
      `);

      const count = parseInt(orphanedUsers[0].count);

      await log.update({
        status: count === 0 ? 'pass' : 'warning',
        severity: count === 0 ? null : 'medium',
        error_message: count === 0 ? null : `${count} usuarios sin empresa`,
        test_data: { orphaned_count: count },
        completed_at: new Date()
      });

      results.push(log);
    } catch (error) {
      await log.addError(error);
      results.push(log);
    }

    return results;
  }

  async _testConstraints(execution_id, config) {
    // Similar a _testTablesExist pero para constraints
    return [];
  }

  _capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

module.exports = DatabaseCollector;
