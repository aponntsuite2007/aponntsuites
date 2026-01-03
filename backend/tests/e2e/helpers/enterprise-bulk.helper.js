/**
 * SYNAPSE Enterprise Testing - Bulk Data Helper
 * Genera datos masivos para stress testing
 */
const { faker } = require('@faker-js/faker/locale/es');
const pgp = require('pg-promise')();

class EnterpriseBulkHelper {
  constructor(dbConfig) {
    this.db = pgp(dbConfig || {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'attendance_system',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'Aedr15150302'
    });
  }

  /**
   * Genera usuarios de stress test en bulk
   * @param {string} batchId - UUID del batch
   * @param {number} totalUsers - Cantidad de usuarios (default 100000)
   * @param {number} totalCompanies - Cantidad de empresas (default 50)
   * @returns {Promise<{success: boolean, count: number, timeMs: number}>}
   */
  async generateStressUsers(batchId, totalUsers = 100000, totalCompanies = 50) {
    const startTime = Date.now();
    const BATCH_SIZE = 10000;
    const usersPerCompany = Math.floor(totalUsers / totalCompanies);

    const roles = ['employee', 'employee', 'employee', 'employee', 'employee',
                   'employee', 'employee', 'admin', 'admin', 'vendor']; // 70% employee, 20% admin, 10% vendor

    console.log(`[BULK] Generando ${totalUsers} usuarios en ${totalCompanies} empresas...`);

    let totalInserted = 0;

    for (let companyId = 1; companyId <= totalCompanies; companyId++) {
      const users = [];

      for (let i = 0; i < usersPerCompany; i++) {
        users.push({
          batch_id: batchId,
          company_id: companyId,
          user_email: faker.internet.email(),
          user_name: faker.person.fullName(),
          user_role: roles[Math.floor(Math.random() * roles.length)]
        });

        // Insert en batches de BATCH_SIZE
        if (users.length >= BATCH_SIZE) {
          await this._bulkInsertUsers(users);
          totalInserted += users.length;
          console.log(`[BULK] Insertados ${totalInserted}/${totalUsers} usuarios (${Math.round(totalInserted/totalUsers*100)}%)`);
          users.length = 0; // Clear array
        }
      }

      // Insertar restantes
      if (users.length > 0) {
        await this._bulkInsertUsers(users);
        totalInserted += users.length;
      }
    }

    const timeMs = Date.now() - startTime;
    console.log(`[BULK] Completado: ${totalInserted} usuarios en ${timeMs}ms`);

    return { success: true, count: totalInserted, timeMs };
  }

  async _bulkInsertUsers(users) {
    const cs = new pgp.helpers.ColumnSet(
      ['batch_id', 'company_id', 'user_email', 'user_name', 'user_role'],
      { table: 'e2e_stress_test_users' }
    );
    const query = pgp.helpers.insert(users, cs);
    await this.db.none(query);
  }

  /**
   * Genera datos de asistencia fake para testing
   */
  async generateAttendanceData(companyId, userCount = 1000, daysBack = 30) {
    const attendances = [];

    for (let userId = 1; userId <= userCount; userId++) {
      for (let day = 0; day < daysBack; day++) {
        const date = new Date();
        date.setDate(date.getDate() - day);

        const checkIn = new Date(date);
        checkIn.setHours(8 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60));

        const checkOut = new Date(date);
        checkOut.setHours(17 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60));

        attendances.push({
          company_id: companyId,
          user_id: userId,
          check_in: checkIn.toISOString(),
          check_out: checkOut.toISOString(),
          total_hours: (checkOut - checkIn) / (1000 * 60 * 60)
        });
      }
    }

    return attendances;
  }

  /**
   * Limpia datos de un batch
   */
  async cleanupBatch(batchId) {
    await this.db.none('DELETE FROM e2e_stress_test_users WHERE batch_id = $1', [batchId]);
    await this.db.none('DELETE FROM e2e_performance_metrics WHERE batch_id = $1', [batchId]);
    await this.db.none('DELETE FROM e2e_business_rules_violations WHERE batch_id = $1', [batchId]);
    await this.db.none('DELETE FROM e2e_security_vulnerabilities WHERE batch_id = $1', [batchId]);
    await this.db.none('DELETE FROM e2e_data_integrity_issues WHERE batch_id = $1', [batchId]);
    await this.db.none('DELETE FROM e2e_performance_degradation WHERE batch_id = $1', [batchId]);
    await this.db.none('DELETE FROM e2e_chaos_scenarios WHERE batch_id = $1', [batchId]);
    await this.db.none('DELETE FROM e2e_enterprise_test_batches WHERE id = $1', [batchId]);
    console.log(`[BULK] Batch ${batchId} limpiado`);
  }

  /**
   * Crea un nuevo batch de testing
   */
  async createBatch(name, level = 3) {
    const result = await this.db.one(`
      INSERT INTO e2e_enterprise_test_batches (batch_name, level)
      VALUES ($1, $2)
      RETURNING id
    `, [name, level]);
    return result.id;
  }

  /**
   * Actualiza el estado de un batch
   */
  async updateBatchStatus(batchId, status, phasesCompleted = []) {
    await this.db.none(`
      UPDATE e2e_enterprise_test_batches
      SET overall_status = $2,
          phases_completed = $3::jsonb,
          end_time = CASE WHEN $2 IN ('passed', 'failed') THEN NOW() ELSE end_time END
      WHERE id = $1
    `, [batchId, status, JSON.stringify(phasesCompleted)]);
  }

  async close() {
    await this.db.$pool.end();
  }
}

module.exports = { EnterpriseBulkHelper };
