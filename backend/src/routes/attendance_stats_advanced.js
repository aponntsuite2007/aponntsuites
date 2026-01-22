/**
 * 📊 ATTENDANCE STATS ADVANCED - Enterprise Professional Dashboard
 *
 * Sistema completo de estadísticas y análisis de asistencia multi-tenant
 * con métricas calculadas vs esperadas, filtros avanzados y porcentajes.
 *
 * Features:
 * - Filtros: Fecha/Rango, Department, Branch, Shift, Kiosk, Origin, Rol
 * - Métricas: Esperados, Asistieron, Tarde, Tolerancia, Fuera de hora, Ausentes
 * - Porcentajes: Todos los ratios calculados
 * - Multi-tenant: Aislamiento por empresa
 */

const express = require('express');
const router = express.Router();
const { sequelize, Sequelize } = require('../config/database');
const { QueryTypes, Op } = Sequelize;
const { auth } = require('../middleware/auth');
const ShiftCalculatorService = require('../services/ShiftCalculatorService');
const ConsentFilterService = require('../services/ConsentFilterService');

/**
 * @route GET /api/v1/attendance/stats/advanced
 * @desc Estadísticas avanzadas con filtros y métricas calculadas
 * @access Private
 *
 * Query params:
 * - startDate: Fecha inicio (YYYY-MM-DD)
 * - endDate: Fecha fin (YYYY-MM-DD)
 * - department_id: Filtrar por departamento
 * - branch_id: Filtrar por sucursal
 * - shift_id: Filtrar por turno
 * - kiosk_id: Filtrar por kiosko
 * - origin_type: Filtrar por origen (kiosk, mobile_app, web, manual)
 * - role: Filtrar por rol de usuario
 */
router.get('/advanced', auth, async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      department_id,
      branch_id,
      shift_id,
      kiosk_id,
      origin_type,
      role
    } = req.query;

    const company_id = req.user.company_id;

    console.log('📊 [STATS ADVANCED] Request:', {
      company_id,
      filters: { startDate, endDate, department_id, branch_id, shift_id, kiosk_id, origin_type, role }
    });

    // Default: últimos 30 días
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const start = startDate || thirtyDaysAgo;
    const end = endDate || today;

    // ========================================
    // 1. ESTADÍSTICAS GENERALES
    // ========================================

    let attendanceWhere = `
      WHERE a.company_id = :company_id
        AND a.date >= :startDate
        AND a.date <= :endDate
    `;

    let userWhere = '';

    const replacements = {
      company_id,
      startDate: start,
      endDate: end
    };

    // Aplicar filtros
    if (department_id) {
      attendanceWhere += ' AND a.department_id = :department_id';
      userWhere += ' AND u.department_id = :department_id';
      replacements.department_id = department_id;
    }

    if (branch_id) {
      attendanceWhere += ' AND a.branch_id = :branch_id';
      userWhere += ' AND u.branch_id = :branch_id';
      replacements.branch_id = branch_id;
    }

    if (shift_id) {
      attendanceWhere += ' AND a.shift_id = :shift_id';
      userWhere += ' AND u.shift_id = :shift_id';
      replacements.shift_id = shift_id;
    }

    if (kiosk_id) {
      attendanceWhere += ' AND a.kiosk_id = :kiosk_id';
      replacements.kiosk_id = kiosk_id;
    }

    if (origin_type) {
      attendanceWhere += ' AND a.origin_type = :origin_type';
      replacements.origin_type = origin_type;
    }

    if (role) {
      userWhere += ' AND u.role = :role';
      replacements.role = role;
    }

    // ========================================
    // A) TOTAL QUE DEBÍAN ASISTIR (usando sistema de turnos rotativos)
    // ========================================

    console.log('🔄 [STATS ADVANCED] Calculando esperados con ShiftCalculatorService...');

    // Calcular esperados usando el sistema de acoplamiento de turnos rotativos
    // Para un rango de fechas, necesitamos calcular día por día
    const startDateObj = new Date(start);
    const endDateObj = new Date(end);
    const daysInRange = Math.ceil((endDateObj - startDateObj) / (1000 * 60 * 60 * 24)) + 1;

    let expected_total = 0;
    const expectedUserIdsSet = new Set(); // Para contar usuarios únicos que deberían trabajar

    // Si el rango es muy grande (> 90 días), usar método simplificado
    if (daysInRange > 90) {
      console.log('⚠️  [STATS ADVANCED] Rango muy grande (>90 días), usando cálculo simplificado');

      // Método simplificado: contar usuarios con asignaciones activas
      const [simplifiedResult] = await sequelize.query(`
        SELECT COUNT(DISTINCT usa.user_id) as expected_count
        FROM user_shift_assignments usa
        INNER JOIN users u ON usa.user_id = u.user_id
        WHERE usa.company_id = :company_id
          AND usa.is_active = true
          AND usa.join_date <= :endDate
          ${userWhere}
      `, { replacements, type: QueryTypes.SELECT });

      expected_total = parseInt(simplifiedResult?.expected_count || 0);
      console.log(`✅ [STATS ADVANCED] Esperados (simplificado): ${expected_total}`);
    } else {
      // Método preciso: calcular día por día usando ShiftCalculatorService
      console.log(`📅 [STATS ADVANCED] Calculando ${daysInRange} días con cálculo preciso...`);

      try {
        // Calcular para el día medio del rango (optimización)
        // Esto da una estimación razonable sin tener que calcular TODOS los días
        const midDate = new Date((startDateObj.getTime() + endDateObj.getTime()) / 2);

        const expectedUsers = await ShiftCalculatorService.getUsersExpectedToWork(
          company_id,
          midDate,
          {
            department_id: department_id || null,
            branch_id: branch_id || null,
            shift_id: shift_id || null
          }
        );

        expected_total = expectedUsers.length;

        console.log(`✅ [STATS ADVANCED] Esperados (día medio ${midDate.toISOString().split('T')[0]}): ${expected_total} usuarios`);
        console.log(`   Usuarios: ${expectedUsers.map(u => u.user?.usuario || u.user?.user_id?.substring(0, 8)).join(', ')}`);
      } catch (error) {
        console.error('❌ [STATS ADVANCED] Error en cálculo de esperados:', error);

        // Fallback: usar método antiguo si hay error
        const [fallbackResult] = await sequelize.query(`
          SELECT COUNT(DISTINCT u.user_id) as expected_count
          FROM users u
          WHERE u.company_id = :company_id
            AND u.is_active = true
            AND u.shift_id IS NOT NULL
            ${userWhere}
        `, { replacements, type: QueryTypes.SELECT });

        expected_total = parseInt(fallbackResult?.expected_count || 0);
        console.log(`⚠️  [STATS ADVANCED] Usando fallback: ${expected_total}`);
      }
    }

    // ========================================
    // A.2) FILTRAR POR CONSENTIMIENTO BIOMÉTRICO
    // ========================================
    // Excluir usuarios sin consentimiento válido para cumplimiento legal
    // Ley 25.326 (Argentina) / GDPR (EU) / BIPA (USA)

    let consentMetadata = null;
    try {
      const consentStats = await ConsentFilterService.getConsentStats(company_id);
      const usersWithConsent = await ConsentFilterService.getUsersWithBiometricConsent(company_id);

      // Ajustar expected_total para excluir usuarios sin consentimiento
      // Solo si hay usuarios sin consentimiento y están afectando las estadísticas
      const originalExpected = expected_total;

      if (consentStats.withoutConsent > 0) {
        // Calcular cuántos de los esperados tienen consentimiento
        const expectedWithConsent = usersWithConsent.length;

        // Ajustar expected_total solo si es relevante
        if (expectedWithConsent < expected_total) {
          expected_total = expectedWithConsent;
          console.log(`🔒 [STATS ADVANCED] Ajustado expected_total por consent: ${originalExpected} -> ${expected_total}`);
        }
      }

      // Generar metadata de consentimiento para incluir en respuesta
      consentMetadata = {
        applied: true,
        originalTotal: originalExpected,
        adjustedTotal: expected_total,
        totalUsersInCompany: consentStats.totalUsers,
        withConsent: consentStats.withConsent,
        withoutConsent: consentStats.withoutConsent,
        complianceRate: consentStats.complianceRate,
        excludedUsers: consentStats.excludedUsers.slice(0, 5), // Primeros 5
        hasMoreExcluded: consentStats.excludedUsers.length > 5,
        warning: consentStats.withoutConsent > 0
          ? `⚠️ ${consentStats.withoutConsent} empleados excluidos de estadísticas por falta de consentimiento biométrico (${100 - consentStats.complianceRate}% del total)`
          : null,
        legal: {
          regulation: 'Ley 25.326 / GDPR / BIPA',
          note: 'Usuarios sin consentimiento biométrico válido son excluidos para cumplimiento legal'
        }
      };

      console.log(`📊 [STATS ADVANCED] Consent filter: ${consentStats.withConsent}/${consentStats.totalUsers} con consent (${consentStats.complianceRate}%)`);

    } catch (consentError) {
      console.warn('⚠️  [STATS ADVANCED] Error obteniendo stats de consent:', consentError.message);
      consentMetadata = {
        applied: false,
        error: 'No se pudo obtener información de consentimiento',
        note: 'Estadísticas pueden incluir usuarios sin consentimiento válido'
      };
    }

    // ========================================
    // B) ESTADÍSTICAS DE ASISTENCIAS REALES
    // ========================================

    const [statsResult] = await sequelize.query(`
      SELECT
        COUNT(DISTINCT a.user_id) as unique_attended,
        COUNT(a.id) as total_records,

        -- Por estado
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
        COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_count,
        COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_count,

        -- Por origen
        COUNT(CASE WHEN a.origin_type = 'kiosk' THEN 1 END) as via_kiosk,
        COUNT(CASE WHEN a.origin_type = 'mobile_app' THEN 1 END) as via_mobile,
        COUNT(CASE WHEN a.origin_type = 'web' THEN 1 END) as via_web,
        COUNT(CASE WHEN a.origin_type = 'manual' THEN 1 END) as via_manual,

        -- Horas trabajadas
        SUM(COALESCE(a."workingHours", 0)) as total_hours,
        AVG(COALESCE(a."workingHours", 0)) as avg_hours_per_record,

        -- Extras
        SUM(COALESCE(a.overtime_hours, 0)) as total_overtime

      FROM attendances a
      ${attendanceWhere}
    `, { replacements, type: QueryTypes.SELECT });

    const {
      unique_attended = 0,
      total_records = 0,
      present_count = 0,
      late_count = 0,
      absent_count = 0,
      via_kiosk = 0,
      via_mobile = 0,
      via_web = 0,
      via_manual = 0,
      total_hours = 0,
      avg_hours_per_record = 0,
      total_overtime = 0
    } = statsResult || {};

    // ========================================
    // C) AUSENTES (esperados pero no asistieron)
    // ========================================

    const actual_absent = Math.max(0, expected_total - parseInt(unique_attended));

    // ========================================
    // D) ANÁLISIS DE TOLERANCIA
    // ========================================

    // Nota: Para calcular si llegó "dentro de tolerancia" necesitamos comparar
    // check_in con shift.startTime + shift.toleranceConfig.entry.after
    // Esto requiere JOIN con shifts y lógica temporal compleja

    // Por ahora usamos status='late' como proxy
    // TODO: Implementar cálculo preciso con shifts en futuras iteraciones

    const on_time = parseInt(present_count) - parseInt(late_count);
    const late_within_tolerance = parseInt(late_count); // Simplificación
    const late_unauthorized = 0; // TODO: Calcular con shift tolerances

    // ========================================
    // E) CÁLCULO DE PORCENTAJES
    // ========================================

    const attendance_rate = expected_total > 0
      ? ((parseInt(unique_attended) / expected_total) * 100).toFixed(2)
      : 0;

    const absence_rate = expected_total > 0
      ? ((actual_absent / expected_total) * 100).toFixed(2)
      : 0;

    const late_rate = parseInt(unique_attended) > 0
      ? ((parseInt(late_count) / parseInt(unique_attended)) * 100).toFixed(2)
      : 0;

    const on_time_rate = parseInt(unique_attended) > 0
      ? ((on_time / parseInt(unique_attended)) * 100).toFixed(2)
      : 0;

    // Por origen
    const kiosk_percentage = parseInt(total_records) > 0
      ? ((parseInt(via_kiosk) / parseInt(total_records)) * 100).toFixed(2)
      : 0;

    const mobile_percentage = parseInt(total_records) > 0
      ? ((parseInt(via_mobile) / parseInt(total_records)) * 100).toFixed(2)
      : 0;

    const web_percentage = parseInt(total_records) > 0
      ? ((parseInt(via_web) / parseInt(total_records)) * 100).toFixed(2)
      : 0;

    const manual_percentage = parseInt(total_records) > 0
      ? ((parseInt(via_manual) / parseInt(total_records)) * 100).toFixed(2)
      : 0;

    // ========================================
    // F) BREAKDOWN POR DEPARTAMENTO
    // ========================================

    const byDepartment = await sequelize.query(`
      SELECT
        d.id as department_id,
        d.name as department_name,
        COUNT(DISTINCT a.user_id) as attended,
        COUNT(a.id) as total_records
      FROM attendances a
      LEFT JOIN departments d ON a.department_id = d.id
      ${attendanceWhere}
      GROUP BY d.id, d.name
      ORDER BY total_records DESC
      LIMIT 10
    `, { replacements, type: QueryTypes.SELECT });

    // ========================================
    // G) BREAKDOWN POR SUCURSAL
    // ========================================

    const byBranch = await sequelize.query(`
      SELECT
        b.id as branch_id,
        b.name as branch_name,
        COUNT(DISTINCT a.user_id) as attended,
        COUNT(a.id) as total_records
      FROM attendances a
      LEFT JOIN branches b ON a.branch_id = b.id
      ${attendanceWhere}
      GROUP BY b.id, b.name
      ORDER BY total_records DESC
      LIMIT 10
    `, { replacements, type: QueryTypes.SELECT });

    // ========================================
    // H) BREAKDOWN POR TURNO
    // ========================================

    const byShift = await sequelize.query(`
      SELECT
        s.id as shift_id,
        s.name as shift_name,
        s."startTime" as shift_start,
        s."endTime" as shift_end,
        COUNT(DISTINCT a.user_id) as attended,
        COUNT(a.id) as total_records
      FROM attendances a
      LEFT JOIN shifts s ON a.shift_id = s.id
      ${attendanceWhere}
      GROUP BY s.id, s.name, s."startTime", s."endTime"
      ORDER BY total_records DESC
    `, { replacements, type: QueryTypes.SELECT });

    // ========================================
    // I) TOP 10 USUARIOS MÁS ACTIVOS
    // ========================================

    const topUsers = await sequelize.query(`
      SELECT
        u.user_id,
        u.nombre as user_name,
        u.apellido as user_lastname,
        u.legajo as employee_id,
        COUNT(a.id) as attendance_count,
        SUM(COALESCE(a."workingHours", 0)) as total_hours
      FROM attendances a
      INNER JOIN users u ON a.user_id = u.user_id
      ${attendanceWhere}
      GROUP BY u.user_id, u.nombre, u.apellido, u.legajo
      ORDER BY attendance_count DESC
      LIMIT 10
    `, { replacements, type: QueryTypes.SELECT });

    // ========================================
    // RESPUESTA FINAL
    // ========================================

    const response = {
      success: true,
      period: {
        start_date: start,
        end_date: end,
        days_count: Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1
      },
      filters_applied: {
        department: department_id || null,
        branch: branch_id || null,
        shift: shift_id || null,
        kiosk: kiosk_id || null,
        origin_type: origin_type || null,
        role: role || null
      },
      summary: {
        expected_total,           // Cuántos DEBÍAN asistir
        unique_attended: parseInt(unique_attended), // Cuántos SÍ asistieron
        actual_absent,            // Cuántos faltaron
        total_records: parseInt(total_records),     // Total de registros

        // Porcentajes principales
        attendance_rate: parseFloat(attendance_rate),
        absence_rate: parseFloat(absence_rate),
        late_rate: parseFloat(late_rate),
        on_time_rate: parseFloat(on_time_rate)
      },
      attendance_status: {
        present: parseInt(present_count),
        late: parseInt(late_count),
        absent: parseInt(absent_count),
        on_time,
        late_within_tolerance,
        late_unauthorized
      },
      by_origin: {
        kiosk: {
          count: parseInt(via_kiosk),
          percentage: parseFloat(kiosk_percentage)
        },
        mobile_app: {
          count: parseInt(via_mobile),
          percentage: parseFloat(mobile_percentage)
        },
        web: {
          count: parseInt(via_web),
          percentage: parseFloat(web_percentage)
        },
        manual: {
          count: parseInt(via_manual),
          percentage: parseFloat(manual_percentage)
        }
      },
      work_hours: {
        total_hours: parseFloat(total_hours || 0).toFixed(2),
        avg_hours_per_record: parseFloat(avg_hours_per_record || 0).toFixed(2),
        total_overtime: parseFloat(total_overtime || 0).toFixed(2)
      },
      breakdowns: {
        by_department: byDepartment,
        by_branch: byBranch,
        by_shift: byShift
      },
      top_users: topUsers,
      consent_compliance: consentMetadata
    };

    console.log('✅ [STATS ADVANCED] Response generated successfully');

    res.json(response);

  } catch (error) {
    console.error('❌ [STATS ADVANCED] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Error generando estadísticas avanzadas',
      message: error.message
    });
  }
});

module.exports = router;
