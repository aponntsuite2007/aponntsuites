const { Sequelize, Op } = require('sequelize');
const {
  sequelize,
  AttendanceProfile,
  AttendancePattern,
  ScoringHistory,
  AttendanceAnalyticsCache,
  ComparativeAnalytics,
  User,
  Company,
  Department,
  Shift,
  Branch
} = require('../config/database');

const AttendanceScoringEngine = require('./AttendanceScoringEngine');
const PatternDetectionService = require('./PatternDetectionService');
const ConsentFilterService = require('./ConsentFilterService');

/**
 * AttendanceAnalyticsService
 *
 * Servicio orquestador del sistema de Analytics de Asistencia
 *
 * Responsabilidades:
 * - Coordinar scoring + detección de patrones
 * - Generar cubos OLAP para comparativas
 * - Gestionar rankings y leaderboards
 * - Manejar caching de métricas pesadas
 * - Generar snapshots históricos
 */
class AttendanceAnalyticsService {

  /**
   * Análisis completo de un empleado (scoring + patrones)
   * @param {UUID} userId - ID del usuario
   * @param {Integer} companyId - ID de la empresa
   * @returns {Object} - Análisis completo
   */
  static async analyzeEmployee(userId, companyId) {
    try {
      console.log(`📊 [ANALYTICS] Análisis completo para user ${userId}`);

      // 0. Verificar consentimiento biométrico
      const consentCheck = await ConsentFilterService.checkUserConsent(userId, companyId);

      if (!consentCheck.hasConsent) {
        console.log(`🔒 [ANALYTICS] Usuario ${userId} sin consentimiento válido: ${consentCheck.details.reason}`);
        return {
          success: false,
          error: 'CONSENT_REQUIRED',
          message: 'El usuario no tiene consentimiento biométrico válido para análisis',
          consentStatus: consentCheck.details,
          legal: {
            regulation: 'Ley 25.326 / GDPR / BIPA',
            note: 'Se requiere consentimiento explícito para análisis biométrico'
          }
        };
      }

      // 1. Calcular scoring
      const scoringResult = await AttendanceScoringEngine.calculateUserScoring(userId, companyId);

      // 2. Detectar patrones
      const patterns = await PatternDetectionService.detectUserPatterns(userId, companyId);

      // 3. Obtener profile actualizado
      const profile = await AttendanceProfile.findOne({
        where: { user_id: userId, company_id: companyId },
        include: [
          { model: User, as: 'user', attributes: ['user_id', 'firstName', 'lastName', 'employeeId'] },
          { model: Department, as: 'department', attributes: ['id', 'name'] },
          { model: Shift, as: 'shift', attributes: ['id', 'name'] }
        ]
      });

      // 4. Obtener patrones activos
      const activePatterns = await AttendancePattern.findAll({
        where: {
          user_id: userId,
          company_id: companyId,
          status: 'active'
        },
        order: [['severity', 'DESC'], ['detection_date', 'DESC']]
      });

      // 5. Obtener historial de scoring (últimos 6 snapshots)
      const scoringHistory = await ScoringHistory.findAll({
        where: { user_id: userId, company_id: companyId },
        order: [['snapshot_date', 'DESC']],
        limit: 6
      });

      return {
        success: true,
        profile: profile ? profile.toJSON() : null,
        scoring: scoringResult.scoring,
        patterns: {
          total: activePatterns.length,
          negative: activePatterns.filter(p => p.pattern_category === 'negative').length,
          positive: activePatterns.filter(p => p.pattern_category === 'positive').length,
          neutral: activePatterns.filter(p => p.pattern_category === 'neutral').length,
          list: activePatterns.map(p => p.toJSON())
        },
        history: scoringHistory.map(h => ({
          date: h.snapshot_date,
          scoring_total: parseFloat(h.scoring_total),
          change: parseFloat(h.change_from_previous || 0),
          trend: h.trend
        })),
        metrics: scoringResult.metrics,
        period: scoringResult.period
      };

    } catch (error) {
      console.error(`❌ [ANALYTICS] Error en análisis completo:`, error);
      throw error;
    }
  }

  /**
   * Análisis completo de una empresa (todos los empleados)
   * @param {Integer} companyId - ID de la empresa
   * @returns {Object} - Análisis agregado de la empresa
   */
  static async analyzeCompany(companyId) {
    try {
      console.log(`🏢 [ANALYTICS] Análisis completo de empresa ${companyId}`);

      // Verificar cache
      const cacheKey = `company_analysis_${companyId}`;
      const cached = await AttendanceAnalyticsCache.getCached(companyId, cacheKey);
      if (cached) {
        console.log(`   ✅ Datos obtenidos desde cache`);
        return cached;
      }

      // 1. Recalcular scoring de todos los empleados
      const scoringResults = await AttendanceScoringEngine.recalculateCompanyScoring(companyId);

      // 2. Obtener estadísticas agregadas
      const stats = await AttendanceScoringEngine.getCompanyScoringStats(companyId);

      // 3. Obtener top performers
      const topPerformers = await AttendanceProfile.findAll({
        where: { company_id: companyId },
        include: [
          { model: User, as: 'user', attributes: ['user_id', 'firstName', 'lastName', 'employeeId'] }
        ],
        order: [['scoring_total', 'DESC']],
        limit: 10
      });

      // 4. Obtener bottom performers (necesitan atención)
      const bottomPerformers = await AttendanceProfile.findAll({
        where: { company_id: companyId },
        include: [
          { model: User, as: 'user', attributes: ['user_id', 'firstName', 'lastName', 'employeeId'] }
        ],
        order: [['scoring_total', 'ASC']],
        limit: 10
      });

      // 5. Obtener patrones críticos activos
      const criticalPatterns = await AttendancePattern.findAll({
        where: {
          company_id: companyId,
          severity: 'critical',
          status: 'active'
        },
        include: [
          { model: User, as: 'user', attributes: ['user_id', 'firstName', 'lastName', 'employeeId'] }
        ],
        order: [['detection_date', 'DESC']]
      });

      // 6. Generar distribución por departamento
      const departmentStats = await this._generateDepartmentStats(companyId);

      // 7. Generar distribución por turno
      const shiftStats = await this._generateShiftStats(companyId);

      // 8. Obtener metadata de consentimiento biométrico
      let consentMetadata = null;
      try {
        const consentStats = await ConsentFilterService.getConsentStats(companyId);
        consentMetadata = {
          totalUsers: consentStats.totalUsers,
          withConsent: consentStats.withConsent,
          withoutConsent: consentStats.withoutConsent,
          complianceRate: consentStats.complianceRate,
          excludedFromStats: consentStats.excludedUsers.slice(0, 5),
          warning: consentStats.withoutConsent > 0
            ? `${consentStats.withoutConsent} empleados sin consentimiento biométrico - estadísticas pueden ser parciales`
            : null
        };
      } catch (err) {
        console.warn('⚠️  [ANALYTICS] No se pudo obtener stats de consent:', err.message);
      }

      const result = {
        success: true,
        company_id: companyId,
        consent_compliance: consentMetadata,
        summary: {
          total_employees: stats.totalEmployees,
          averages: stats.averages,
          range: stats.range,
          distribution: stats.distribution
        },
        recalculation: {
          processed: scoringResults.processed,
          success: scoringResults.success.length,
          errors: scoringResults.errors.length
        },
        rankings: {
          top_performers: topPerformers.map(p => ({
            user: p.user,
            scoring_total: parseFloat(p.scoring_total),
            category: p.profile_category
          })),
          bottom_performers: bottomPerformers.map(p => ({
            user: p.user,
            scoring_total: parseFloat(p.scoring_total),
            category: p.profile_category
          }))
        },
        patterns: {
          critical_count: criticalPatterns.length,
          critical_list: criticalPatterns.map(p => ({
            user: p.user,
            pattern_name: p.pattern_name,
            severity: p.severity,
            detection_date: p.detection_date
          }))
        },
        by_department: departmentStats,
        by_shift: shiftStats,
        generated_at: new Date()
      };

      // Cachear resultado (24 horas)
      await AttendanceAnalyticsCache.setCached(companyId, cacheKey, result, 24);

      return result;

    } catch (error) {
      console.error(`❌ [ANALYTICS] Error en análisis de empresa:`, error);
      throw error;
    }
  }

  /**
   * Generar cubos OLAP para comparativas multi-dimensionales
   * @param {Integer} companyId - ID de la empresa
   * @param {Object} dimensions - Dimensiones para el cubo
   * @returns {Object} - Cubo OLAP generado
   */
  static async generateOLAPCube(companyId, dimensions = {}) {
    try {
      console.log(`📊 [OLAP] Generando cubo OLAP para empresa ${companyId}`);

      const cubeId = `cube_${Date.now()}`;
      const results = [];

      // Dimensión temporal (month, quarter, year)
      const timeDimension = dimensions.time || 'month';

      // Dimensión organizacional (department, shift, branch)
      const orgDimension = dimensions.org || 'department';

      // Medida a calcular (scoring_total, scoring_punctuality, etc.)
      const measure = dimensions.measure || 'scoring_total';

      // Obtener todos los profiles de la empresa
      const profiles = await AttendanceProfile.findAll({
        where: { company_id: companyId },
        include: [
          { model: Department, as: 'department' },
          { model: Shift, as: 'shift' },
          { model: Branch, as: 'branch' }
        ]
      });

      // Agrupar por dimensiones
      const grouped = {};

      profiles.forEach(profile => {
        const timeValue = this._extractTimeDimension(profile.last_calculated_at, timeDimension);
        const orgValue = this._extractOrgDimension(profile, orgDimension);

        const key = `${timeValue}|${orgValue}`;

        if (!grouped[key]) {
          grouped[key] = {
            timeValue,
            orgValue,
            values: [],
            count: 0
          };
        }

        grouped[key].values.push(parseFloat(profile[measure]));
        grouped[key].count++;
      });

      // Calcular medidas agregadas
      for (const [key, data] of Object.entries(grouped)) {
        const measureValue = data.values.reduce((sum, v) => sum + v, 0) / data.values.length;
        const baselineValue = parseFloat(data.values[0] || 0);
        const diffAbsolute = measureValue - baselineValue;
        const diffPercent = baselineValue !== 0 ? (diffAbsolute / baselineValue) * 100 : 0;

        results.push({
          cube_id: cubeId,
          dimension_time: timeDimension,
          dimension_time_value: data.timeValue,
          dimension_org: orgDimension,
          dimension_org_value: data.orgValue,
          measure_name: measure,
          measure_value: measureValue,
          measure_unit: 'score',
          comparison_baseline_value: baselineValue,
          comparison_diff_absolute: diffAbsolute,
          comparison_diff_percent: diffPercent,
          sample_size: data.count,
          confidence_level: data.count >= 30 ? 95 : data.count >= 10 ? 80 : 60
        });
      }

      // Guardar en BD
      for (const cube of results) {
        await ComparativeAnalytics.create({
          ...cube,
          company_id: companyId,
          calculated_at: new Date()
        });
      }

      console.log(`   ✅ Cubo OLAP generado con ${results.length} celdas`);

      return {
        success: true,
        cube_id: cubeId,
        dimensions: {
          time: timeDimension,
          org: orgDimension,
          measure
        },
        cells: results.length,
        data: results
      };

    } catch (error) {
      console.error(`❌ [OLAP] Error generando cubo:`, error);
      throw error;
    }
  }

  /**
   * Generar snapshot semanal de scoring para historial
   * @param {Integer} companyId - ID de la empresa
   * @returns {Object} - Resultado del snapshot
   */
  static async generateWeeklySnapshot(companyId) {
    try {
      console.log(`📸 [SNAPSHOT] Generando snapshot semanal para empresa ${companyId}`);

      const today = new Date().toISOString().split('T')[0];

      // Obtener todos los profiles actuales
      const profiles = await AttendanceProfile.findAll({
        where: { company_id: companyId }
      });

      let snapshotsCreated = 0;

      for (const profile of profiles) {
        // Verificar si ya existe snapshot para hoy
        const existingSnapshot = await ScoringHistory.findOne({
          where: {
            user_id: profile.user_id,
            company_id: companyId,
            snapshot_date: today
          }
        });

        if (existingSnapshot) {
          console.log(`   ℹ️ Snapshot ya existe para user ${profile.user_id}`);
          continue;
        }

        // Obtener snapshot anterior para calcular cambio
        const previousSnapshot = await ScoringHistory.findOne({
          where: {
            user_id: profile.user_id,
            company_id: companyId
          },
          order: [['snapshot_date', 'DESC']]
        });

        const changeFromPrevious = previousSnapshot
          ? parseFloat(profile.scoring_total) - parseFloat(previousSnapshot.scoring_total)
          : 0;

        // Determinar trend
        let trend = 'stable';
        if (changeFromPrevious > 5) trend = 'improving';
        else if (changeFromPrevious < -5) trend = 'declining';

        // Crear snapshot
        await ScoringHistory.create({
          user_id: profile.user_id,
          company_id: companyId,
          snapshot_date: today,
          scoring_total: profile.scoring_total,
          scoring_punctuality: profile.scoring_punctuality,
          scoring_absence: profile.scoring_absence,
          scoring_late_arrival: profile.scoring_late_arrival,
          scoring_early_departure: profile.scoring_early_departure,
          change_from_previous: changeFromPrevious,
          change_reason: null, // Podría ser rellenado por IA después
          trend
        });

        snapshotsCreated++;
      }

      console.log(`   ✅ Snapshots creados: ${snapshotsCreated}/${profiles.length}`);

      return {
        success: true,
        company_id: companyId,
        snapshot_date: today,
        snapshots_created: snapshotsCreated,
        total_employees: profiles.length
      };

    } catch (error) {
      console.error(`❌ [SNAPSHOT] Error generando snapshot:`, error);
      throw error;
    }
  }

  /**
   * Obtener rankings por departamento/turno/sucursal
   * @param {Integer} companyId - ID de la empresa
   * @param {String} groupBy - department | shift | branch
   * @returns {Object} - Rankings generados
   */
  static async getRankings(companyId, groupBy = 'department') {
    try {
      console.log(`🏆 [RANKINGS] Generando rankings por ${groupBy}`);

      let includeModel, includeAs, groupField;

      if (groupBy === 'department') {
        includeModel = Department;
        includeAs = 'department';
        groupField = 'department_id';
      } else if (groupBy === 'shift') {
        includeModel = Shift;
        includeAs = 'shift';
        groupField = 'shift_id';
      } else if (groupBy === 'branch') {
        includeModel = Branch;
        includeAs = 'branch';
        groupField = 'branch_id';
      } else {
        throw new Error(`Invalid groupBy: ${groupBy}`);
      }

      // Obtener perfiles agrupados
      const rankings = await AttendanceProfile.findAll({
        where: {
          company_id: companyId,
          [groupField]: { [Op.ne]: null }
        },
        attributes: [
          groupField,
          [sequelize.fn('AVG', sequelize.col('scoring_total')), 'avg_scoring'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'employee_count'],
          [sequelize.fn('MIN', sequelize.col('scoring_total')), 'min_scoring'],
          [sequelize.fn('MAX', sequelize.col('scoring_total')), 'max_scoring']
        ],
        group: [groupField],
        raw: true
      });

      // Ordenar por avg_scoring
      rankings.sort((a, b) => parseFloat(b.avg_scoring) - parseFloat(a.avg_scoring));

      // Agregar nombre del grupo
      for (const ranking of rankings) {
        const group = await includeModel.findOne({
          where: { id: ranking[groupField] },
          attributes: ['id', 'name']
        });
        ranking.group_name = group ? group.name : 'Desconocido';
        ranking.avg_scoring = parseFloat(ranking.avg_scoring).toFixed(2);
        ranking.min_scoring = parseFloat(ranking.min_scoring).toFixed(2);
        ranking.max_scoring = parseFloat(ranking.max_scoring).toFixed(2);
      }

      return {
        success: true,
        group_by: groupBy,
        rankings,
        total_groups: rankings.length,
        generated_at: new Date()
      };

    } catch (error) {
      console.error(`❌ [RANKINGS] Error generando rankings:`, error);
      throw error;
    }
  }

  /**
   * Invalidar cache de una empresa
   * @param {Integer} companyId - ID de la empresa
   */
  static async invalidateCache(companyId) {
    try {
      const deleted = await AttendanceAnalyticsCache.destroy({
        where: { company_id: companyId }
      });

      console.log(`🗑️ [CACHE] ${deleted} entradas de cache eliminadas para empresa ${companyId}`);

      return { success: true, deleted };
    } catch (error) {
      console.error(`❌ [CACHE] Error invalidando cache:`, error);
      throw error;
    }
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  /**
   * Generar estadísticas por departamento
   * @private
   */
  static async _generateDepartmentStats(companyId) {
    try {
      const stats = await AttendanceProfile.findAll({
        where: {
          company_id: companyId,
          department_id: { [Op.ne]: null }
        },
        attributes: [
          'department_id',
          [sequelize.fn('AVG', sequelize.col('scoring_total')), 'avg_scoring'],
          [sequelize.fn('COUNT', sequelize.col('AttendanceProfile.id')), 'employee_count']
        ],
        include: [
          { model: Department, as: 'department', attributes: ['id', 'name'], required: false }
        ],
        group: ['department_id', 'department.id', 'department.name'],
        raw: false
      });

      return stats.map(s => ({
        department_id: s.department_id,
        department_name: s.department ? s.department.name : 'Desconocido',
        avg_scoring: parseFloat(s.get('avg_scoring') || 0).toFixed(2),
        employee_count: parseInt(s.get('employee_count') || 0)
      }));
    } catch (error) {
      console.warn(`⚠️ [ANALYTICS] Error en _generateDepartmentStats: ${error.message}`);
      return [];
    }
  }

  /**
   * Generar estadísticas por turno
   * @private
   */
  static async _generateShiftStats(companyId) {
    try {
      const stats = await AttendanceProfile.findAll({
        where: {
          company_id: companyId,
          shift_id: { [Op.ne]: null }
        },
        attributes: [
          'shift_id',
          [sequelize.fn('AVG', sequelize.col('scoring_total')), 'avg_scoring'],
          [sequelize.fn('COUNT', sequelize.col('AttendanceProfile.id')), 'employee_count']  // FIX: Qualify column
        ],
        include: [
          { model: Shift, as: 'shift', attributes: ['id', 'name'], required: false }
        ],
        group: ['shift_id', 'shift.id', 'shift.name'],
        raw: false
      });

      return stats.map(s => ({
        shift_id: s.shift_id,
        shift_name: s.shift ? s.shift.name : 'Desconocido',
        avg_scoring: parseFloat(s.get('avg_scoring') || 0).toFixed(2),
        employee_count: parseInt(s.get('employee_count') || 0)
      }));
    } catch (error) {
      // Si hay error de tipos incompatibles (bigint vs uuid), retornar array vacío
      console.warn(`⚠️ [ANALYTICS] Error en _generateShiftStats (posible mismatch de tipos): ${error.message}`);
      return [];
    }
  }

  /**
   * Extraer dimensión temporal
   * @private
   */
  static _extractTimeDimension(date, dimension) {
    const d = new Date(date);
    if (dimension === 'month') {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    } else if (dimension === 'quarter') {
      const quarter = Math.floor(d.getMonth() / 3) + 1;
      return `${d.getFullYear()}-Q${quarter}`;
    } else if (dimension === 'year') {
      return String(d.getFullYear());
    }
    return 'unknown';
  }

  /**
   * Extraer dimensión organizacional
   * @private
   */
  static _extractOrgDimension(profile, dimension) {
    if (dimension === 'department' && profile.department) {
      return profile.department.name;
    } else if (dimension === 'shift' && profile.shift) {
      return profile.shift.name;
    } else if (dimension === 'branch' && profile.branch) {
      return profile.branch.name;
    }
    return 'Sin asignar';
  }
}

module.exports = AttendanceAnalyticsService;
