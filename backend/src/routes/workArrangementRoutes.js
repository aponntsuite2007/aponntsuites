/**
 * ================================================================
 * RUTAS: Sistema de Modalidades de Trabajo + Control de Presencia Remota
 * ================================================================
 *
 * Gestión de:
 * - Modalidades de trabajo (presencial, remoto, híbrido, freelance, etc.)
 * - Políticas por empresa
 * - Asignación a usuarios
 * - Consentimientos de webcam
 * - Detección de presencia remota
 * - Planes de contingencia
 */

const express = require('express');
const router = express.Router();
const { auth: auth } = require('../middleware/auth');
const { sequelize } = require('../config/database');

// =====================================================
// 📋 CATÁLOGO DE MODALIDADES (GLOBAL)
// =====================================================

/**
 * GET /api/v1/work-arrangements/types
 * Lista todas las modalidades de trabajo disponibles
 */
router.get('/types', auth, async (req, res) => {
  try {
    const [types] = await sequelize.query(`
      SELECT
        id, code, name, name_en, description, icon, category,
        requires_physical_attendance, requires_gps_tracking,
        allows_flexible_hours, requires_webcam_presence_detection,
        minimum_presence_days_per_week, maximum_remote_days_per_week,
        usable_during_pandemic, usable_during_emergency,
        iso_30414_aligned, iso_30414_category, is_active
      FROM work_arrangement_types
      WHERE is_active = true
      ORDER BY
        CASE code
          WHEN 'presencial' THEN 1
          WHEN 'remoto' THEN 2
          WHEN 'hibrido' THEN 3
          ELSE 4
        END
    `);

    res.json({
      success: true,
      types,
      count: types.length
    });
  } catch (error) {
    console.error('❌ [WORK-ARRANGEMENTS] Error obteniendo tipos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// 🏢 POLÍTICAS POR EMPRESA
// =====================================================

/**
 * GET /api/v1/work-arrangements/policies/:companyId
 * Lista políticas de modalidades de una empresa
 */
router.get('/policies/:companyId', auth, async (req, res) => {
  try {
    const { companyId } = req.params;

    const [policies] = await sequelize.query(`
      SELECT
        wap.*,
        wat.code as type_code,
        wat.name as type_name,
        wat.icon as type_icon,
        wat.requires_webcam_presence_detection as type_requires_webcam
      FROM work_arrangement_policies wap
      JOIN work_arrangement_types wat ON wap.work_arrangement_type_id = wat.id
      WHERE wap.company_id = :companyId AND wap.is_active = true
      ORDER BY wat.name
    `, { replacements: { companyId } });

    res.json({
      success: true,
      policies,
      count: policies.length
    });
  } catch (error) {
    console.error('❌ [WORK-ARRANGEMENTS] Error obteniendo políticas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/work-arrangements/policies
 * Crear política de modalidad para empresa
 */
router.post('/policies', auth, async (req, res) => {
  try {
    const {
      company_id,
      work_arrangement_type_id,
      policy_name,
      description,
      min_hours_per_day,
      max_hours_per_day,
      flexible_schedule,
      core_hours_start,
      core_hours_end,
      min_office_days_per_week,
      max_remote_days_per_week,
      required_office_days,
      requires_daily_checkin,
      enable_webcam_presence_detection,
      webcam_detection_interval_minutes,
      webcam_absence_threshold_minutes,
      requires_explicit_consent,
      includes_remote_stipend,
      remote_stipend_amount
    } = req.body;

    const [result] = await sequelize.query(`
      INSERT INTO work_arrangement_policies (
        company_id, work_arrangement_type_id, policy_name, description,
        min_hours_per_day, max_hours_per_day, flexible_schedule,
        core_hours_start, core_hours_end,
        min_office_days_per_week, max_remote_days_per_week, required_office_days,
        requires_daily_checkin, enable_webcam_presence_detection,
        webcam_detection_interval_minutes, webcam_absence_threshold_minutes,
        requires_explicit_consent, includes_remote_stipend, remote_stipend_amount
      ) VALUES (
        :company_id, :work_arrangement_type_id, :policy_name, :description,
        :min_hours_per_day, :max_hours_per_day, :flexible_schedule,
        :core_hours_start, :core_hours_end,
        :min_office_days_per_week, :max_remote_days_per_week, :required_office_days,
        :requires_daily_checkin, :enable_webcam_presence_detection,
        :webcam_detection_interval_minutes, :webcam_absence_threshold_minutes,
        :requires_explicit_consent, :includes_remote_stipend, :remote_stipend_amount
      )
      ON CONFLICT (company_id, work_arrangement_type_id) DO UPDATE SET
        policy_name = EXCLUDED.policy_name,
        description = EXCLUDED.description,
        enable_webcam_presence_detection = EXCLUDED.enable_webcam_presence_detection,
        webcam_detection_interval_minutes = EXCLUDED.webcam_detection_interval_minutes,
        requires_explicit_consent = EXCLUDED.requires_explicit_consent,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, {
      replacements: {
        company_id,
        work_arrangement_type_id,
        policy_name: policy_name || null,
        description: description || null,
        min_hours_per_day: min_hours_per_day || null,
        max_hours_per_day: max_hours_per_day || null,
        flexible_schedule: flexible_schedule || false,
        core_hours_start: core_hours_start || null,
        core_hours_end: core_hours_end || null,
        min_office_days_per_week: min_office_days_per_week || null,
        max_remote_days_per_week: max_remote_days_per_week || null,
        required_office_days: required_office_days || null,
        requires_daily_checkin: requires_daily_checkin || false,
        enable_webcam_presence_detection: enable_webcam_presence_detection || false,
        webcam_detection_interval_minutes: webcam_detection_interval_minutes || 30,
        webcam_absence_threshold_minutes: webcam_absence_threshold_minutes || 10,
        requires_explicit_consent: requires_explicit_consent !== false,
        includes_remote_stipend: includes_remote_stipend || false,
        remote_stipend_amount: remote_stipend_amount || null
      }
    });

    console.log(`✅ [WORK-ARRANGEMENTS] Política creada/actualizada para empresa ${company_id}`);

    res.json({
      success: true,
      policy: result[0],
      message: 'Política guardada correctamente'
    });
  } catch (error) {
    console.error('❌ [WORK-ARRANGEMENTS] Error guardando política:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// 👤 ASIGNACIÓN A USUARIOS
// =====================================================

/**
 * GET /api/v1/work-arrangements/users/:userId
 * Obtener modalidad de trabajo de un usuario
 */
router.get('/users/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    const [arrangements] = await sequelize.query(`
      SELECT
        uwa.*,
        wat.code as type_code,
        wat.name as type_name,
        wat.icon as type_icon,
        wat.requires_webcam_presence_detection,
        wat.allows_flexible_hours,
        wap.enable_webcam_presence_detection as policy_requires_webcam,
        wap.webcam_detection_interval_minutes,
        wap.core_hours_start,
        wap.core_hours_end
      FROM user_work_arrangements uwa
      JOIN work_arrangement_types wat ON uwa.work_arrangement_type_id = wat.id
      LEFT JOIN work_arrangement_policies wap
        ON wap.company_id = uwa.company_id
        AND wap.work_arrangement_type_id = uwa.work_arrangement_type_id
      WHERE uwa.user_id = :userId
        AND uwa.is_active = true
        AND (uwa.effective_until IS NULL OR uwa.effective_until >= CURRENT_DATE)
      ORDER BY uwa.effective_from DESC
      LIMIT 1
    `, { replacements: { userId } });

    if (arrangements.length === 0) {
      return res.json({
        success: true,
        arrangement: null,
        message: 'Usuario sin modalidad asignada (presencial por defecto)'
      });
    }

    // Verificar si tiene consentimiento de webcam
    const [consents] = await sequelize.query(`
      SELECT status, consented_at
      FROM webcam_monitoring_consents
      WHERE user_id = :userId AND status = 'accepted'
      ORDER BY consented_at DESC
      LIMIT 1
    `, { replacements: { userId } });

    res.json({
      success: true,
      arrangement: arrangements[0],
      hasWebcamConsent: consents.length > 0,
      webcamConsent: consents[0] || null
    });
  } catch (error) {
    console.error('❌ [WORK-ARRANGEMENTS] Error obteniendo modalidad usuario:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/work-arrangements/company/:companyId/users
 * Lista usuarios con sus modalidades de trabajo
 */
router.get('/company/:companyId/users', auth, async (req, res) => {
  try {
    const { companyId } = req.params;

    const [users] = await sequelize.query(`
      SELECT
        u.user_id,
        u."firstName",
        u."lastName",
        u.email,
        u.position,
        uwa.id as arrangement_id,
        wat.code as arrangement_code,
        wat.name as arrangement_name,
        wat.icon as arrangement_icon,
        uwa.effective_from,
        uwa.effective_until,
        uwa.office_days,
        uwa.remote_days,
        uwa.is_contingency_mode,
        wat.requires_webcam_presence_detection,
        CASE WHEN wmc.status = 'accepted' THEN true ELSE false END as has_webcam_consent
      FROM users u
      LEFT JOIN user_work_arrangements uwa
        ON u.user_id = uwa.user_id
        AND uwa.is_active = true
        AND (uwa.effective_until IS NULL OR uwa.effective_until >= CURRENT_DATE)
      LEFT JOIN work_arrangement_types wat ON uwa.work_arrangement_type_id = wat.id
      LEFT JOIN webcam_monitoring_consents wmc
        ON u.user_id = wmc.user_id
        AND wmc.company_id = :companyId
        AND wmc.status = 'accepted'
      WHERE u.company_id = :companyId AND u.is_active = true
      ORDER BY u."lastName", u."firstName"
    `, { replacements: { companyId } });

    // Agrupar por modalidad
    const summary = {
      presencial: users.filter(u => u.arrangement_code === 'presencial' || !u.arrangement_code).length,
      remoto: users.filter(u => u.arrangement_code === 'remoto').length,
      hibrido: users.filter(u => u.arrangement_code === 'hibrido').length,
      otros: users.filter(u => u.arrangement_code && !['presencial', 'remoto', 'hibrido'].includes(u.arrangement_code)).length
    };

    res.json({
      success: true,
      users,
      summary,
      count: users.length
    });
  } catch (error) {
    console.error('❌ [WORK-ARRANGEMENTS] Error listando usuarios:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/work-arrangements/users/:userId/assign
 * Asignar modalidad de trabajo a usuario
 */
router.post('/users/:userId/assign', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      company_id,
      work_arrangement_type_id,
      effective_from,
      effective_until,
      office_days,
      remote_days,
      approval_reason
    } = req.body;

    const approvedBy = req.user?.user_id || req.user?.id;

    // Desactivar asignaciones anteriores
    await sequelize.query(`
      UPDATE user_work_arrangements
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = :userId AND is_active = true
    `, { replacements: { userId } });

    // Crear nueva asignación
    const [result] = await sequelize.query(`
      INSERT INTO user_work_arrangements (
        user_id, company_id, work_arrangement_type_id,
        effective_from, effective_until, office_days, remote_days,
        approved_by, approved_at, approval_reason, source
      ) VALUES (
        :userId, :company_id, :work_arrangement_type_id,
        :effective_from, :effective_until, :office_days, :remote_days,
        :approved_by, CURRENT_TIMESTAMP, :approval_reason, 'manual'
      )
      RETURNING *
    `, {
      replacements: {
        userId,
        company_id,
        work_arrangement_type_id,
        effective_from: effective_from || new Date().toISOString().split('T')[0],
        effective_until: effective_until || null,
        office_days: office_days ? `{${office_days.join(',')}}` : null,
        remote_days: remote_days ? `{${remote_days.join(',')}}` : null,
        approved_by: approvedBy || null,
        approval_reason: approval_reason || null
      }
    });

    // Registrar en historial
    await sequelize.query(`
      INSERT INTO work_arrangement_history (
        user_id, company_id, new_arrangement_id,
        change_reason, change_reason_detail, changed_by
      ) VALUES (
        :userId, :company_id, :work_arrangement_type_id,
        'manual_assignment', :approval_reason, :approved_by
      )
    `, {
      replacements: {
        userId,
        company_id,
        work_arrangement_type_id,
        approval_reason: approval_reason || 'Asignación manual',
        approved_by: approvedBy || null
      }
    });

    console.log(`✅ [WORK-ARRANGEMENTS] Modalidad asignada a usuario ${userId}`);

    res.json({
      success: true,
      arrangement: result[0],
      message: 'Modalidad asignada correctamente'
    });
  } catch (error) {
    console.error('❌ [WORK-ARRANGEMENTS] Error asignando modalidad:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/work-arrangements/users/bulk-assign
 * Asignar modalidad a múltiples usuarios
 */
router.post('/users/bulk-assign', auth, async (req, res) => {
  try {
    const { user_ids, company_id, work_arrangement_type_id, effective_from, office_days, remote_days } = req.body;
    const approvedBy = req.user?.user_id || req.user?.id;

    let assigned = 0;
    for (const userId of user_ids) {
      await sequelize.query(`
        UPDATE user_work_arrangements SET is_active = false WHERE user_id = :userId AND is_active = true
      `, { replacements: { userId } });

      await sequelize.query(`
        INSERT INTO user_work_arrangements (
          user_id, company_id, work_arrangement_type_id, effective_from,
          office_days, remote_days, approved_by, approved_at, source
        ) VALUES (
          :userId, :company_id, :work_arrangement_type_id, :effective_from,
          :office_days, :remote_days, :approved_by, CURRENT_TIMESTAMP, 'bulk'
        )
      `, {
        replacements: {
          userId,
          company_id,
          work_arrangement_type_id,
          effective_from: effective_from || new Date().toISOString().split('T')[0],
          office_days: office_days ? `{${office_days.join(',')}}` : null,
          remote_days: remote_days ? `{${remote_days.join(',')}}` : null,
          approved_by: approvedBy || null
        }
      });
      assigned++;
    }

    console.log(`✅ [WORK-ARRANGEMENTS] Modalidad asignada masivamente a ${assigned} usuarios`);

    res.json({
      success: true,
      assigned,
      message: `Modalidad asignada a ${assigned} usuarios`
    });
  } catch (error) {
    console.error('❌ [WORK-ARRANGEMENTS] Error en asignación masiva:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// 📝 CONSENTIMIENTOS DE WEBCAM
// =====================================================

/**
 * GET /api/v1/work-arrangements/consents/:userId
 * Obtener estado de consentimiento de webcam
 */
router.get('/consents/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    const [consents] = await sequelize.query(`
      SELECT *
      FROM webcam_monitoring_consents
      WHERE user_id = :userId
      ORDER BY created_at DESC
    `, { replacements: { userId } });

    res.json({
      success: true,
      consents,
      currentConsent: consents.find(c => c.status === 'accepted') || null,
      hasActiveConsent: consents.some(c => c.status === 'accepted')
    });
  } catch (error) {
    console.error('❌ [WORK-ARRANGEMENTS] Error obteniendo consentimientos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/work-arrangements/consents
 * Registrar consentimiento de webcam
 */
router.post('/consents', auth, async (req, res) => {
  try {
    const {
      user_id,
      company_id,
      status, // 'accepted', 'declined'
      decline_reason,
      alternative_method,
      country_code,
      legal_framework
    } = req.body;

    const ip = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const [result] = await sequelize.query(`
      INSERT INTO webcam_monitoring_consents (
        user_id, company_id, status,
        consented_at, consent_ip_address, consent_user_agent,
        declined_at, decline_reason, alternative_method,
        country_code, legal_framework
      ) VALUES (
        :user_id, :company_id, :status,
        CASE WHEN :status = 'accepted' THEN CURRENT_TIMESTAMP ELSE NULL END,
        :ip, :userAgent,
        CASE WHEN :status = 'declined' THEN CURRENT_TIMESTAMP ELSE NULL END,
        :decline_reason, :alternative_method,
        :country_code, :legal_framework
      )
      RETURNING *
    `, {
      replacements: {
        user_id,
        company_id,
        status,
        ip,
        userAgent,
        decline_reason: decline_reason || null,
        alternative_method: alternative_method || null,
        country_code: country_code || 'AR',
        legal_framework: legal_framework || 'Ley 25.326'
      }
    });

    console.log(`✅ [WORK-ARRANGEMENTS] Consentimiento ${status} registrado para usuario ${user_id}`);

    res.json({
      success: true,
      consent: result[0],
      message: status === 'accepted'
        ? 'Consentimiento aceptado correctamente'
        : 'Preferencia registrada. Se usará método alternativo.'
    });
  } catch (error) {
    console.error('❌ [WORK-ARRANGEMENTS] Error registrando consentimiento:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/work-arrangements/consents/:consentId/revoke
 * Revocar consentimiento
 */
router.post('/consents/:consentId/revoke', auth, async (req, res) => {
  try {
    const { consentId } = req.params;
    const { revoke_reason } = req.body;

    await sequelize.query(`
      UPDATE webcam_monitoring_consents
      SET status = 'revoked', revoked_at = CURRENT_TIMESTAMP, revoke_reason = :revoke_reason
      WHERE id = :consentId
    `, { replacements: { consentId, revoke_reason: revoke_reason || null } });

    console.log(`✅ [WORK-ARRANGEMENTS] Consentimiento ${consentId} revocado`);

    res.json({
      success: true,
      message: 'Consentimiento revocado. Se usará método alternativo de control de presencia.'
    });
  } catch (error) {
    console.error('❌ [WORK-ARRANGEMENTS] Error revocando consentimiento:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// 📊 DETECCIÓN DE PRESENCIA REMOTA
// =====================================================

/**
 * POST /api/v1/work-arrangements/presence/detect
 * Registrar detección de presencia (llamado por APK/Web)
 */
router.post('/presence/detect', auth, async (req, res) => {
  try {
    const {
      user_id,
      company_id,
      attendance_id,
      presence_detected,
      detection_method,
      azure_face_id,
      azure_confidence_score,
      azure_response_time_ms,
      capture_type,
      is_during_break_period,
      latitude,
      longitude
    } = req.body;

    const [result] = await sequelize.query(`
      INSERT INTO remote_presence_detections (
        user_id, company_id, attendance_id,
        presence_detected, detection_method,
        azure_face_id, azure_confidence_score, azure_response_time_ms,
        capture_type, is_during_break_period,
        latitude, longitude
      ) VALUES (
        :user_id, :company_id, :attendance_id,
        :presence_detected, :detection_method,
        :azure_face_id, :azure_confidence_score, :azure_response_time_ms,
        :capture_type, :is_during_break_period,
        :latitude, :longitude
      )
      RETURNING *
    `, {
      replacements: {
        user_id,
        company_id,
        attendance_id: attendance_id || null,
        presence_detected,
        detection_method: detection_method || 'azure_face_api',
        azure_face_id: azure_face_id || null,
        azure_confidence_score: azure_confidence_score || null,
        azure_response_time_ms: azure_response_time_ms || null,
        capture_type: capture_type || 'random',
        is_during_break_period: is_during_break_period || false,
        latitude: latitude || null,
        longitude: longitude || null
      }
    });

    // Si no detectó presencia y no es break, crear violación
    if (!presence_detected && !is_during_break_period) {
      await sequelize.query(`
        INSERT INTO remote_presence_violations (
          user_id, company_id, attendance_id,
          absence_start_timestamp, first_failed_detection_id,
          last_failed_detection_id, total_failed_attempts
        )
        SELECT :user_id, :company_id, :attendance_id, CURRENT_TIMESTAMP, :detection_id, :detection_id, 1
        WHERE NOT EXISTS (
          SELECT 1 FROM remote_presence_violations
          WHERE user_id = :user_id AND status = 'open'
            AND absence_start_timestamp > CURRENT_TIMESTAMP - INTERVAL '30 minutes'
        )
      `, {
        replacements: {
          user_id,
          company_id,
          attendance_id: attendance_id || null,
          detection_id: result[0].id
        }
      });
    }

    res.json({
      success: true,
      detection: result[0],
      presence_detected
    });
  } catch (error) {
    console.error('❌ [WORK-ARRANGEMENTS] Error registrando detección:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/work-arrangements/presence/:userId/today
 * Estadísticas de presencia del día
 */
router.get('/presence/:userId/today', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    const [stats] = await sequelize.query(`
      SELECT * FROM get_daily_presence_stats(:userId, CURRENT_DATE)
    `, { replacements: { userId } });

    const [detections] = await sequelize.query(`
      SELECT id, detection_timestamp, presence_detected, capture_type, is_during_break_period
      FROM remote_presence_detections
      WHERE user_id = :userId AND DATE(detection_timestamp) = CURRENT_DATE
      ORDER BY detection_timestamp DESC
    `, { replacements: { userId } });

    res.json({
      success: true,
      stats: stats[0] || { total_detections: 0, successful_detections: 0, failed_detections: 0, presence_percentage: 100, violation_count: 0 },
      detections,
      date: new Date().toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('❌ [WORK-ARRANGEMENTS] Error obteniendo stats presencia:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/work-arrangements/violations/:companyId
 * Lista violaciones de presencia de la empresa
 */
router.get('/violations/:companyId', auth, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { status, date_from, date_to } = req.query;

    let whereClause = 'WHERE rpv.company_id = :companyId';
    if (status) whereClause += ' AND rpv.status = :status';
    if (date_from) whereClause += ' AND DATE(rpv.absence_start_timestamp) >= :date_from';
    if (date_to) whereClause += ' AND DATE(rpv.absence_start_timestamp) <= :date_to';

    const [violations] = await sequelize.query(`
      SELECT
        rpv.*,
        u."firstName", u."lastName", u.email,
        sup."firstName" as supervisor_first_name, sup."lastName" as supervisor_last_name
      FROM remote_presence_violations rpv
      JOIN users u ON rpv.user_id = u.user_id
      LEFT JOIN users sup ON rpv.supervisor_id = sup.user_id
      ${whereClause}
      ORDER BY rpv.created_at DESC
      LIMIT 100
    `, {
      replacements: {
        companyId,
        status: status || null,
        date_from: date_from || null,
        date_to: date_to || null
      }
    });

    res.json({
      success: true,
      violations,
      count: violations.length
    });
  } catch (error) {
    console.error('❌ [WORK-ARRANGEMENTS] Error listando violaciones:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/work-arrangements/violations/:violationId/justify
 * Justificar violación
 */
router.post('/violations/:violationId/justify', auth, async (req, res) => {
  try {
    const { violationId } = req.params;
    const { justification_reason } = req.body;
    const justifiedBy = req.user?.user_id || req.user?.id;

    await sequelize.query(`
      UPDATE remote_presence_violations
      SET status = 'justified',
          justified_by = :justifiedBy,
          justification_reason = :justification_reason,
          justification_date = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = :violationId
    `, {
      replacements: {
        violationId,
        justifiedBy,
        justification_reason
      }
    });

    res.json({
      success: true,
      message: 'Violación justificada correctamente'
    });
  } catch (error) {
    console.error('❌ [WORK-ARRANGEMENTS] Error justificando violación:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// 🚨 PLANES DE CONTINGENCIA
// =====================================================

/**
 * GET /api/v1/work-arrangements/contingency/:companyId
 * Lista planes de contingencia
 */
router.get('/contingency/:companyId', auth, async (req, res) => {
  try {
    const { companyId } = req.params;

    const [plans] = await sequelize.query(`
      SELECT
        wcp.*,
        wat.name as force_arrangement_name,
        wat.icon as force_arrangement_icon
      FROM work_arrangement_contingency_plans wcp
      LEFT JOIN work_arrangement_types wat ON wcp.force_work_arrangement_id = wat.id
      WHERE wcp.company_id = :companyId
      ORDER BY wcp.created_at DESC
    `, { replacements: { companyId } });

    res.json({
      success: true,
      plans,
      activePlan: plans.find(p => p.is_active) || null
    });
  } catch (error) {
    console.error('❌ [WORK-ARRANGEMENTS] Error listando planes contingencia:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/work-arrangements/contingency/:planId/activate
 * Activar plan de contingencia
 */
router.post('/contingency/:planId/activate', auth, async (req, res) => {
  try {
    const { planId } = req.params;
    const activatedBy = req.user?.user_id || req.user?.id;

    // Obtener plan
    const [plans] = await sequelize.query(`
      SELECT * FROM work_arrangement_contingency_plans WHERE id = :planId
    `, { replacements: { planId } });

    if (plans.length === 0) {
      return res.status(404).json({ success: false, error: 'Plan no encontrado' });
    }

    const plan = plans[0];

    // Desactivar otros planes activos
    await sequelize.query(`
      UPDATE work_arrangement_contingency_plans
      SET is_active = false, deactivated_at = CURRENT_TIMESTAMP
      WHERE company_id = :companyId AND is_active = true
    `, { replacements: { companyId: plan.company_id } });

    // Activar este plan
    await sequelize.query(`
      UPDATE work_arrangement_contingency_plans
      SET is_active = true, activated_at = CURRENT_TIMESTAMP, activated_by = :activatedBy
      WHERE id = :planId
    `, { replacements: { planId, activatedBy } });

    // Actualizar modalidades de usuarios afectados
    if (plan.force_work_arrangement_id) {
      await sequelize.query(`
        UPDATE user_work_arrangements
        SET is_contingency_mode = true,
            contingency_type = :contingencyType,
            contingency_start_date = CURRENT_DATE,
            work_arrangement_type_id = :forceArrangementId,
            updated_at = CURRENT_TIMESTAMP
        WHERE company_id = :companyId AND is_active = true
      `, {
        replacements: {
          companyId: plan.company_id,
          contingencyType: plan.contingency_type,
          forceArrangementId: plan.force_work_arrangement_id
        }
      });
    }

    console.log(`🚨 [WORK-ARRANGEMENTS] Plan de contingencia ${planId} ACTIVADO`);

    res.json({
      success: true,
      message: `Plan "${plan.name}" activado. Todos los empleados afectados han sido notificados.`
    });
  } catch (error) {
    console.error('❌ [WORK-ARRANGEMENTS] Error activando plan:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// 📈 REPORTES Y DASHBOARD
// =====================================================

/**
 * GET /api/v1/work-arrangements/dashboard/:companyId
 * Dashboard de modalidades de trabajo
 */
router.get('/dashboard/:companyId', auth, async (req, res) => {
  try {
    const { companyId } = req.params;

    // Resumen por modalidad
    const [summary] = await sequelize.query(`
      SELECT * FROM v_company_work_arrangements_summary
      WHERE company_id = :companyId
    `, { replacements: { companyId } });

    // Usuarios sin modalidad asignada
    const [unassigned] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM users u
      WHERE u.company_id = :companyId AND u.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM user_work_arrangements uwa
          WHERE uwa.user_id = u.user_id AND uwa.is_active = true
        )
    `, { replacements: { companyId } });

    // Violaciones abiertas
    const [violations] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM remote_presence_violations
      WHERE company_id = :companyId AND status = 'open'
    `, { replacements: { companyId } });

    // Consentimientos pendientes
    const [pendingConsents] = await sequelize.query(`
      SELECT COUNT(DISTINCT u.user_id) as count
      FROM users u
      JOIN user_work_arrangements uwa ON u.user_id = uwa.user_id AND uwa.is_active = true
      JOIN work_arrangement_types wat ON uwa.work_arrangement_type_id = wat.id
      WHERE u.company_id = :companyId
        AND wat.requires_webcam_presence_detection = true
        AND NOT EXISTS (
          SELECT 1 FROM webcam_monitoring_consents wmc
          WHERE wmc.user_id = u.user_id AND wmc.status = 'accepted'
        )
    `, { replacements: { companyId } });

    res.json({
      success: true,
      summary,
      metrics: {
        unassignedUsers: parseInt(unassigned[0]?.count || 0),
        openViolations: parseInt(violations[0]?.count || 0),
        pendingConsents: parseInt(pendingConsents[0]?.count || 0)
      }
    });
  } catch (error) {
    console.error('❌ [WORK-ARRANGEMENTS] Error obteniendo dashboard:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/work-arrangements/history/:userId
 * Historial de cambios de modalidad de un usuario
 */
router.get('/history/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    const [history] = await sequelize.query(`
      SELECT
        wah.*,
        prev.name as previous_arrangement_name, prev.icon as previous_icon,
        curr.name as new_arrangement_name, curr.icon as new_icon,
        u."firstName" as changed_by_first_name, u."lastName" as changed_by_last_name
      FROM work_arrangement_history wah
      LEFT JOIN work_arrangement_types prev ON wah.previous_arrangement_id = prev.id
      JOIN work_arrangement_types curr ON wah.new_arrangement_id = curr.id
      LEFT JOIN users u ON wah.changed_by = u.user_id
      WHERE wah.user_id = :userId
      ORDER BY wah.changed_at DESC
    `, { replacements: { userId } });

    res.json({
      success: true,
      history,
      count: history.length
    });
  } catch (error) {
    console.error('❌ [WORK-ARRANGEMENTS] Error obteniendo historial:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// 🔍 UTILIDADES
// =====================================================

/**
 * GET /api/v1/work-arrangements/check-remote/:userId/:date
 * Verificar si usuario trabaja remoto en fecha específica
 */
router.get('/check-remote/:userId/:date', auth, async (req, res) => {
  try {
    const { userId, date } = req.params;

    const [result] = await sequelize.query(`
      SELECT * FROM is_remote_day_for_user(:userId, :date::DATE)
    `, { replacements: { userId, date } });

    res.json({
      success: true,
      isRemote: result[0]?.is_remote_day_for_user || false,
      date
    });
  } catch (error) {
    console.error('❌ [WORK-ARRANGEMENTS] Error verificando día remoto:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
