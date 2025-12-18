/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HSE CASE SERVICE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Gestión de casos HSE: accidentes de trabajo y enfermedades laborales.
 * Integra: Módulo Médico -> HSE -> Capacitaciones -> Sanciones
 *
 * Funcionalidades:
 * - Crear casos desde certificados médicos
 * - Correlacionar con detecciones IA previas
 * - Investigación y dictamen
 * - Escalamiento a capacitaciones/sanciones
 */

class HSECaseService {
  constructor(database) {
    this.db = database;

    // Servicios dependientes
    this.violationCatalog = null;
    this.notificationService = null;
  }

  /**
   * Inyectar servicios dependientes
   */
  setDependencies({ violationCatalog, notificationService }) {
    this.violationCatalog = violationCatalog;
    this.notificationService = notificationService;
  }

  /**
   * Crear caso desde certificado médico
   */
  async createFromMedicalCertificate(certificate, createdBy = null) {
    // 1. Obtener company_id desde branch
    const branchQuery = `SELECT company_id FROM branches WHERE id = $1`;
    const branchResult = await this.db.query(branchQuery, [certificate.branchId]);
    const companyId = branchResult.rows[0]?.company_id;

    // 2. Calcular correlación con detecciones IA
    let correlationData = {
      total_detections: 0,
      matching_detections: 0,
      correlation_score: 0,
      detection_ids: []
    };

    if (certificate.possibleViolations?.length > 0) {
      correlationData = await this.calculateCorrelation(
        certificate.employeeId,
        certificate.possibleViolations,
        30
      );
    }

    // 3. Determinar severidad basada en días de baja
    const severity = this.determineSeverity(certificate.daysOff);

    // 4. Crear caso HSE
    const insertQuery = `
      INSERT INTO hse_cases (
        company_id, branch_id, employee_id,
        source_type, medical_certificate_id,
        case_type, case_subtype,
        cie10_code, cie10_description, body_location,
        severity, days_off,
        indicated_violations, violation_notes,
        correlated_detections, correlation_score,
        investigation_status, created_by
      ) VALUES ($1, $2, $3, 'MEDICAL_CERTIFICATE', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'PENDING', $16)
      RETURNING *
    `;

    const result = await this.db.query(insertQuery, [
      companyId,
      certificate.branchId,
      certificate.employeeId,
      certificate.id,
      certificate.absenceType,
      certificate.absenceSubtype,
      certificate.cie10Code,
      certificate.cie10Description,
      certificate.bodyLocation,
      severity,
      certificate.daysOff,
      certificate.possibleViolations,
      certificate.violationNotes,
      correlationData.detection_ids,
      correlationData.correlation_score,
      createdBy
    ]);

    const hseCase = result.rows[0];

    // 5. Notificar a responsable HSE
    await this.notifyHSEResponsible(hseCase);

    // 6. Si requiere reporte externo (ART), marcarlo
    if (certificate.absenceType === 'ACCIDENTE_TRABAJO' || certificate.absenceType === 'ENFERMEDAD_PROFESIONAL') {
      await this.db.query(
        'UPDATE hse_cases SET external_report_required = true WHERE id = $1',
        [hseCase.id]
      );
    }

    return {
      ...hseCase,
      correlation: correlationData
    };
  }

  /**
   * Calcular correlación con detecciones IA previas
   */
  async calculateCorrelation(employeeId, violations, daysPeriod = 30) {
    const query = `
      SELECT * FROM calculate_violation_correlation($1, $2, $3)
    `;
    const result = await this.db.query(query, [employeeId, violations, daysPeriod]);

    if (result.rows.length === 0) {
      return {
        total_detections: 0,
        matching_detections: 0,
        correlation_score: 0,
        detection_ids: []
      };
    }

    return result.rows[0];
  }

  /**
   * Determinar severidad según días de baja
   */
  determineSeverity(daysOff) {
    if (!daysOff || daysOff <= 0) return 'LEVE';
    if (daysOff <= 3) return 'LEVE';
    if (daysOff <= 15) return 'MODERADO';
    if (daysOff <= 60) return 'GRAVE';
    return 'MUY_GRAVE';
  }

  /**
   * Notificar a responsable HSE
   */
  async notifyHSEResponsible(hseCase) {
    if (!this.notificationService) return;

    // Obtener nombre del empleado
    const empQuery = `
      SELECT first_name, last_name FROM employees WHERE id = $1
    `;
    const empResult = await this.db.query(empQuery, [hseCase.employee_id]);
    const employee = empResult.rows[0];
    const employeeName = employee ? `${employee.first_name} ${employee.last_name}` : 'Empleado';

    const notification = {
      type: 'HSE_CASE_NEW',
      priority: hseCase.severity === 'GRAVE' || hseCase.severity === 'MUY_GRAVE' ? 'URGENT' : 'HIGH',
      recipientRole: 'HSE_RESPONSIBLE',
      companyId: hseCase.company_id,
      title: `Nuevo Caso HSE: ${hseCase.case_number}`,
      message: `${hseCase.case_type === 'ACCIDENTE_TRABAJO' ? 'Accidente de trabajo' : 'Enfermedad laboral'} - ${employeeName}. Severidad: ${hseCase.severity}. Requiere investigación.`,
      data: {
        caseId: hseCase.id,
        caseNumber: hseCase.case_number,
        caseType: hseCase.case_type,
        severity: hseCase.severity,
        employeeId: hseCase.employee_id,
        correlationScore: hseCase.correlation_score
      },
      actionUrl: `/hse/cases/${hseCase.id}`
    };

    await this.notificationService.send(notification);
  }

  /**
   * Asignar caso a responsable HSE
   */
  async assignCase(caseId, assignedTo, assignedBy) {
    const query = `
      UPDATE hse_cases
      SET
        assigned_to = $1,
        assigned_at = NOW(),
        investigation_status = 'ASSIGNED',
        investigation_deadline = CURRENT_DATE + INTERVAL '7 days',
        updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    const result = await this.db.query(query, [assignedTo, caseId]);

    if (result.rows.length === 0) {
      throw new Error(`Caso no encontrado: ${caseId}`);
    }

    // Notificar al asignado
    if (this.notificationService) {
      await this.notificationService.send({
        type: 'HSE_CASE_ASSIGNED',
        priority: 'HIGH',
        recipientId: assignedTo,
        title: `Caso HSE asignado: ${result.rows[0].case_number}`,
        message: 'Se le ha asignado un caso para investigación. Plazo: 7 días.',
        data: { caseId, caseNumber: result.rows[0].case_number }
      });
    }

    return result.rows[0];
  }

  /**
   * Registrar dictamen de investigación
   */
  async registerVerdict(caseId, verdictData, userId) {
    const {
      verdict,
      verdictNotes,
      confirmedViolations,
      correctiveActions,
      preventiveActions,
      assignTraining,
      createSanction,
      followUpRequired,
      followUpDate,
      followUpNotes
    } = verdictData;

    // 1. Actualizar caso con dictamen
    const updateQuery = `
      UPDATE hse_cases
      SET
        investigation_status = 'COMPLETED',
        verdict = $1,
        verdict_notes = $2,
        verdict_by = $3,
        verdict_at = NOW(),
        confirmed_violations = $4,
        corrective_actions = $5,
        preventive_actions = $6,
        follow_up_required = $7,
        follow_up_date = $8,
        follow_up_notes = $9,
        updated_at = NOW()
      WHERE id = $10
      RETURNING *
    `;

    const result = await this.db.query(updateQuery, [
      verdict,
      verdictNotes,
      userId,
      confirmedViolations,
      JSON.stringify(correctiveActions || []),
      JSON.stringify(preventiveActions || []),
      followUpRequired,
      followUpDate,
      followUpNotes,
      caseId
    ]);

    if (result.rows.length === 0) {
      throw new Error(`Caso no encontrado: ${caseId}`);
    }

    const hseCase = result.rows[0];

    // 2. Asignar capacitación si corresponde
    if (assignTraining && verdict === 'CONFIRMED_VIOLATION') {
      await this.assignTraining(hseCase, confirmedViolations, userId);
    }

    // 3. Crear sanción si corresponde
    if (createSanction && verdict === 'CONFIRMED_VIOLATION') {
      await this.createSanction(hseCase, verdictData, userId);
    }

    // 4. Notificar al empleado
    await this.notifyEmployee(hseCase, verdict);

    return hseCase;
  }

  /**
   * Asignar capacitación desde caso HSE
   */
  async assignTraining(hseCase, violations, userId) {
    if (!violations || violations.length === 0) return;

    // Obtener templates de capacitación
    const violationData = await this.violationCatalog.getByCodes(violations);
    const trainingIds = violationData
      .filter(v => v.default_training_template_id)
      .map(v => v.default_training_template_id);

    if (trainingIds.length === 0) return;

    // TODO: Integrar con training-management
    // Por ahora solo actualizamos el caso
    await this.db.query(
      'UPDATE hse_cases SET training_assigned = true, training_ids = $1 WHERE id = $2',
      [trainingIds, hseCase.id]
    );

    console.log(`[HSE] Capacitaciones asignadas para caso ${hseCase.case_number}:`, trainingIds);
  }

  /**
   * Crear sanción desde caso HSE
   */
  async createSanction(hseCase, verdictData, userId) {
    // TODO: Integrar con sanctions-management
    // Por ahora solo actualizamos el caso
    await this.db.query(
      'UPDATE hse_cases SET sanction_created = true WHERE id = $1',
      [hseCase.id]
    );

    console.log(`[HSE] Sanción creada para caso ${hseCase.case_number}`);
  }

  /**
   * Notificar al empleado del resultado
   */
  async notifyEmployee(hseCase, verdict) {
    if (!this.notificationService) return;

    const verdictMessages = {
      'CONFIRMED_VIOLATION': 'Se han confirmado incumplimientos de normas de seguridad.',
      'NOT_CONFIRMED': 'No se han confirmado incumplimientos de normas de seguridad.',
      'UNSAFE_CONDITION': 'Se identificaron condiciones inseguras que serán corregidas.',
      'THIRD_PARTY': 'El incidente fue causado por acción de terceros.',
      'MIXED_CAUSES': 'Se identificaron múltiples causas que serán evaluadas.',
      'UNDETERMINED': 'No se pudo determinar la causa del incidente.'
    };

    await this.notificationService.send({
      type: 'HSE_CASE_VERDICT',
      priority: 'MEDIUM',
      recipientId: hseCase.employee_id,
      title: `Resultado de investigación: ${hseCase.case_number}`,
      message: verdictMessages[verdict] || 'La investigación ha concluido.',
      data: {
        caseId: hseCase.id,
        caseNumber: hseCase.case_number,
        verdict,
        trainingAssigned: hseCase.training_assigned,
        sanctionCreated: hseCase.sanction_created
      }
    });
  }

  /**
   * Cerrar caso HSE
   */
  async closeCase(caseId, closingNotes, userId) {
    const query = `
      UPDATE hse_cases
      SET
        investigation_status = 'CLOSED',
        closed_at = NOW(),
        investigation_notes = COALESCE(investigation_notes, '') || E'\n\n[CIERRE] ' || $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    const result = await this.db.query(query, [closingNotes, caseId]);

    if (result.rows.length === 0) {
      throw new Error(`Caso no encontrado: ${caseId}`);
    }

    return result.rows[0];
  }

  /**
   * Obtener caso por ID
   */
  async getCaseById(caseId) {
    const query = `
      SELECT
        c.*,
        e.first_name || ' ' || e.last_name as employee_name,
        e.email as employee_email,
        b.name as branch_name,
        u.name as assigned_to_name,
        v.name as verdict_by_name
      FROM hse_cases c
      LEFT JOIN employees e ON c.employee_id = e.id
      LEFT JOIN branches b ON c.branch_id = b.id
      LEFT JOIN users u ON c.assigned_to = u.id
      LEFT JOIN users v ON c.verdict_by = v.id
      WHERE c.id = $1
    `;

    const result = await this.db.query(query, [caseId]);
    return result.rows[0];
  }

  /**
   * Obtener casos pendientes
   */
  async getPendingCases(companyId, filters = {}) {
    const { branchId, assignedTo, status, severity, limit = 50, offset = 0 } = filters;

    let whereClause = ['company_id = $1', "investigation_status != 'CLOSED'"];
    const params = [companyId];
    let paramIndex = 2;

    if (branchId) {
      whereClause.push(`branch_id = $${paramIndex++}`);
      params.push(branchId);
    }
    if (assignedTo) {
      whereClause.push(`assigned_to = $${paramIndex++}`);
      params.push(assignedTo);
    }
    if (status) {
      whereClause.push(`investigation_status = $${paramIndex++}`);
      params.push(status);
    }
    if (severity) {
      whereClause.push(`severity = $${paramIndex++}`);
      params.push(severity);
    }

    params.push(limit, offset);

    const query = `
      SELECT
        c.*,
        e.first_name || ' ' || e.last_name as employee_name,
        b.name as branch_name,
        u.name as assigned_to_name
      FROM hse_cases c
      LEFT JOIN employees e ON c.employee_id = e.id
      LEFT JOIN branches b ON c.branch_id = b.id
      LEFT JOIN users u ON c.assigned_to = u.id
      WHERE ${whereClause.join(' AND ')}
      ORDER BY
        CASE c.severity
          WHEN 'FATAL' THEN 1
          WHEN 'MUY_GRAVE' THEN 2
          WHEN 'GRAVE' THEN 3
          WHEN 'MODERADO' THEN 4
          ELSE 5
        END,
        c.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;

    const result = await this.db.query(query, params);
    return result.rows;
  }

  /**
   * Obtener estadísticas de casos
   */
  async getCaseStatistics(companyId, filters = {}) {
    const { startDate, endDate } = filters;

    let whereClause = ['company_id = $1'];
    const params = [companyId];
    let paramIndex = 2;

    if (startDate) {
      whereClause.push(`created_at >= $${paramIndex++}`);
      params.push(startDate);
    }
    if (endDate) {
      whereClause.push(`created_at <= $${paramIndex++}`);
      params.push(endDate);
    }

    const query = `
      SELECT
        COUNT(*) as total_cases,
        COUNT(*) FILTER (WHERE investigation_status = 'PENDING') as pending_cases,
        COUNT(*) FILTER (WHERE investigation_status IN ('ASSIGNED', 'IN_PROGRESS', 'AWAITING_INFO')) as in_progress_cases,
        COUNT(*) FILTER (WHERE investigation_status = 'CLOSED') as closed_cases,
        COUNT(*) FILTER (WHERE case_type = 'ACCIDENTE_TRABAJO') as accident_cases,
        COUNT(*) FILTER (WHERE case_type = 'ENFERMEDAD_PROFESIONAL') as illness_cases,
        COUNT(*) FILTER (WHERE severity IN ('GRAVE', 'MUY_GRAVE', 'FATAL')) as severe_cases,
        COUNT(*) FILTER (WHERE verdict = 'CONFIRMED_VIOLATION') as confirmed_violations,
        ROUND(AVG(correlation_score), 2) as avg_correlation_score,
        SUM(days_off) as total_days_lost,
        ROUND(AVG(EXTRACT(DAY FROM (closed_at - created_at))), 1) as avg_resolution_days
      FROM hse_cases
      WHERE ${whereClause.join(' AND ')}
    `;

    const result = await this.db.query(query, params);
    return result.rows[0];
  }

  /**
   * Obtener correlación entre violaciones EPP y accidentes
   */
  async getViolationAccidentCorrelation(companyId, periodDays = 90) {
    const query = `
      WITH violation_stats AS (
        SELECT
          UNNEST(indicated_violations) as violation_code,
          COUNT(*) as accident_count,
          SUM(days_off) as days_lost
        FROM hse_cases
        WHERE company_id = $1
          AND created_at >= NOW() - ($2 || ' days')::INTERVAL
          AND case_type = 'ACCIDENTE_TRABAJO'
        GROUP BY UNNEST(indicated_violations)
      ),
      detection_stats AS (
        SELECT
          UNNEST(missing_ppe) as violation_code,
          COUNT(*) as detection_count
        FROM hse_ppe_detections
        WHERE company_id = $1
          AND detection_timestamp >= NOW() - ($2 || ' days')::INTERVAL
        GROUP BY UNNEST(missing_ppe)
      )
      SELECT
        c.code,
        c.name,
        c.icon,
        COALESCE(d.detection_count, 0) as detections,
        COALESCE(v.accident_count, 0) as accidents,
        COALESCE(v.days_lost, 0) as days_lost,
        CASE
          WHEN d.detection_count > 0 AND v.accident_count > 0
          THEN ROUND((v.accident_count::DECIMAL / d.detection_count) * 100, 2)
          ELSE 0
        END as correlation_rate
      FROM hse_violation_catalog c
      LEFT JOIN violation_stats v ON c.code = v.violation_code
      LEFT JOIN detection_stats d ON c.code = d.violation_code
      WHERE c.category = 'EPP' AND c.is_active = true
      ORDER BY COALESCE(v.accident_count, 0) DESC, COALESCE(d.detection_count, 0) DESC
    `;

    const result = await this.db.query(query, [companyId, periodDays]);
    return result.rows;
  }
}

module.exports = HSECaseService;
