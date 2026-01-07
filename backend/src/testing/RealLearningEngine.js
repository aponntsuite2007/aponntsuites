/**
 * ═══════════════════════════════════════════════════════════════════════════
 * REAL LEARNING ENGINE - Motor de Aprendizaje con PostgreSQL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * OBJETIVO:
 * - Guardar REALMENTE en PostgreSQL (audit_logs table)
 * - Aprender qué elementos crashean, son lentos, funcionan
 * - Proveer conocimiento para próximas ejecuciones
 * - Integrar con Brain para crear tickets automáticos
 *
 * TABLA: audit_logs
 * - execution_id
 * - module_name
 * - test_type = 'element-interaction'
 * - status = 'passed' / 'failed' / 'timeout' / 'crash'
 * - error_type, error_message
 * - duration_ms
 * - test_metadata (JSON con info del elemento)
 *
 * @version 1.0.0
 * @date 2026-01-07
 * ═══════════════════════════════════════════════════════════════════════════
 */

class RealLearningEngine {
  constructor(database, brainEscalation = null) {
    this.database = database;
    this.brainEscalation = brainEscalation;
    console.log('🧠 [LEARNING] Real Learning Engine inicializado');
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * RECORD ACTION - Guardar interacción con elemento
   * ═══════════════════════════════════════════════════════════════════════
   */
  async recordAction(actionData) {
    const { module, element, result, duration, error, timestamp } = actionData;

    try {
      const { AuditLog } = this.database;

      // Mapear result a status de audit_log
      let status = 'passed';
      if (result === 'error' || result === 'crash') status = 'fail';
      if (result === 'timeout') status = 'fail';
      if (result === 'skipped') return; // No guardar skipped

      // Crear registro en audit_logs
      const log = await AuditLog.create({
        execution_id: actionData.executionId || 'autonomous-session',
        company_id: actionData.companyId || null, // ⭐ FIX: company_id del agente
        module_name: module,
        test_type: 'element-interaction',
        test_name: `${element.type}: ${element.text}`,
        status: status,
        duration_ms: duration || 0,
        error_type: error ? 'interaction-error' : null,
        error_message: error || null,
        test_metadata: {
          element: {
            text: element.text,
            type: element.type,
            onclick: element.onclick,
            classes: element.classes
          },
          result: result,
          timestamp: timestamp
        }
      });

      // ⭐ FIX: Si crasheó, notificar a Brain Escalation Service
      if ((result === 'error' || result === 'crash') && this.brainEscalation) {
        try {
          await this.brainEscalation.onProblemDetected({
            type: 'TESTING_CRASH',
            module: module,
            severity: 'MEDIUM',
            message: `Elemento "${element.text}" (${element.type}) crashea al hacer click`,
            stack: error || 'No stack trace available',
            context: {
              element: element,
              duration: duration,
              test_log_id: log.id,
              test_metadata: {
                module_name: module,
                test_name: `${element.type}: ${element.text}`,
                error_message: error
              }
            }
          });
        } catch (brainError) {
          console.error(`⚠️  [LEARNING] Brain notification failed:`, brainError.message);
          // No bloqueamos el guardado en audit_logs si Brain falla
        }
      }

      return log;

    } catch (error) {
      console.error(`❌ [LEARNING] Error guardando acción:`, error.message);
      return null;
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET KNOWLEDGE - Obtener conocimiento previo de un módulo
   * ═══════════════════════════════════════════════════════════════════════
   */
  async getKnowledge(module) {
    try {
      const { AuditLog } = this.database;

      // Buscar últimos 100 registros del módulo
      const logs = await AuditLog.findAll({
        where: {
          module_name: module,
          test_type: 'element-interaction'
        },
        order: [['created_at', 'DESC']],
        limit: 100
      });

      // Transformar a formato de knowledge
      const knowledge = logs.map(log => {
        const metadata = log.test_metadata || {};
        const element = metadata.element || {};

        return {
          text: element.text,
          type: element.type,
          result: log.status === 'passed' ? 'success' : (log.status === 'fail' ? (log.error_type?.includes('timeout') ? 'timeout' : 'crash') : 'unknown'),
          duration: log.duration_ms,
          errorMessage: log.error_message,
          lastTested: log.created_at
        };
      });

      console.log(`   🧠 [LEARNING] Conocimiento cargado: ${knowledge.length} elementos conocidos para ${module}`);

      return knowledge;

    } catch (error) {
      console.error(`❌ [LEARNING] Error obteniendo conocimiento:`, error.message);
      return [];
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET STATS - Estadísticas de un módulo
   * ═══════════════════════════════════════════════════════════════════════
   */
  async getModuleStats(module) {
    try {
      const { AuditLog } = this.database;

      const [results] = await this.database.sequelize.query(`
        SELECT
          COUNT(*) as total_tests,
          SUM(CASE WHEN status = 'passed' THEN 1 ELSE 0 END) as successes,
          SUM(CASE WHEN status = 'fail' THEN 1 ELSE 0 END) as failures,
          AVG(duration_ms) as avg_duration,
          MAX(duration_ms) as max_duration
        FROM audit_logs
        WHERE module_name = :module
          AND test_type = 'element-interaction'
      `, {
        replacements: { module },
        type: this.database.sequelize.QueryTypes.SELECT
      });

      return results[0] || {
        total_tests: 0,
        successes: 0,
        failures: 0,
        avg_duration: 0,
        max_duration: 0
      };

    } catch (error) {
      console.error(`❌ [LEARNING] Error obteniendo stats:`, error.message);
      return null;
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET KNOWN CRASHES - Elementos que crashean
   * ═══════════════════════════════════════════════════════════════════════
   */
  async getKnownCrashes(module) {
    try {
      const { AuditLog } = this.database;

      const crashes = await AuditLog.findAll({
        where: {
          module_name: module,
          test_type: 'element-interaction',
          status: 'fail'
        },
        order: [['created_at', 'DESC']],
        limit: 50
      });

      return crashes.map(c => ({
        element: c.test_metadata?.element || {},
        error: c.error_message,
        lastOccurrence: c.created_at
      }));

    } catch (error) {
      console.error(`❌ [LEARNING] Error obteniendo crashes:`, error.message);
      return [];
    }
  }
}

module.exports = RealLearningEngine;
