/**
 * Servicio de Autorización de Llegadas Tardías
 * Sistema jerárquico multi-canal (Email, WhatsApp, WebSocket)
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { sequelize } = require('../config/database-postgresql');
const { QueryTypes } = require('sequelize');
const websocket = require('../config/websocket');
// 🆕 Integración con sistema central de notificaciones
let notificationUnifiedService = null;
try {
  notificationUnifiedService = require('./NotificationUnifiedService');
  console.log('✅ [AUTH] NotificationUnifiedService integrated');
} catch (e) {
  console.log('⚠️ [AUTH] NotificationUnifiedService not available, using fallback notifications');
}

// 🔥 NCE: Central Telefónica de Notificaciones (SSOT - único canal de emails)
const NCE = require('./NotificationCentralExchange');

// 🆕 SSOT: Resolución de destinatarios de notificaciones departamentales
const NotificationRecipientResolver = require('./NotificationRecipientResolver');

class LateArrivalAuthorizationService {
  constructor() {
    // Configuración WhatsApp Business API
    this.whatsappApiUrl = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v17.0';
    this.whatsappToken = process.env.WHATSAPP_API_TOKEN;
    this.whatsappPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    // URL base del servidor para links de autorización
    this.serverBaseUrl = process.env.SERVER_BASE_URL || 'http://localhost:3001';

    // 🔥 SSOT: Emails ahora van via NCE (NotificationCentralExchange) - no más nodemailer local
    console.log('✅ LateArrivalAuthorizationService initialized (NCE para emails)');
  }

  /**
   * Buscar autorizadores disponibles para un departamento específico
   * @deprecated Usar findAuthorizersHierarchical() para lookup completo
   * @param {number} departmentId - ID del departamento del empleado
   * @param {number} companyId - ID de la empresa
   * @returns {Array} Lista de autorizadores elegibles
   */
  async findAuthorizersForDepartment(departmentId, companyId) {
    // Delegamos al nuevo método jerárquico con valores por defecto
    return this.findAuthorizersHierarchical({
      companyId,
      departmentId,
      includeRRHH: true
    });
  }

  /**
   * 🎯 NUEVO: Buscar autorizadores con filtro JERÁRQUICO COMPLETO
   * Filtra por: empresa + sucursal + departamento + sector + turno
   * SIEMPRE incluye RRHH como destinatario adicional
   *
   * @param {Object} params - Parámetros de búsqueda jerárquica
   * @param {number} params.companyId - ID de la empresa (obligatorio)
   * @param {number} params.branchId - ID de la sucursal (opcional)
   * @param {number} params.departmentId - ID del departamento (opcional)
   * @param {string} params.sector - Sector dentro del departamento (opcional)
   * @param {string} params.shiftId - ID del turno asignado (opcional)
   * @param {boolean} params.includeRRHH - Incluir siempre RRHH (default: true)
   * @returns {Array} Lista de autorizadores ordenados por jerarquía
   */
  async findAuthorizersHierarchical({
    companyId,
    branchId = null,
    departmentId = null,
    sector = null,
    shiftId = null,
    includeRRHH = true
  }) {
    try {
      console.log(`🔍 [AUTH-HIERARCHICAL] Searching authorizers with hierarchical filter:`);
      console.log(`   Company: ${companyId}, Branch: ${branchId}, Dept: ${departmentId}`);
      console.log(`   Sector: ${sector}, Shift: ${shiftId}, Include RRHH: ${includeRRHH}`);

      // Build dynamic query with hierarchical matching
      // Priority: Exact match on all criteria > Partial match > Admin fallback
      const query = `
        WITH employee_context AS (
          -- Contexto del empleado para matching
          SELECT
            $1::integer AS company_id,
            $2::uuid AS branch_id,
            $3::bigint AS department_id,
            $4::text AS sector,
            $5::uuid AS shift_id
        ),
        authorizer_scores AS (
          SELECT
            u.user_id,
            u."firstName",
            u."lastName",
            u.email,
            u.whatsapp_number,
            u.notification_preference_late_arrivals,
            u.authorized_departments,
            u.role,
            u.department_id AS auth_department_id,
            u.default_branch_id AS auth_branch_id,
            d.name AS auth_department_name,
            -- Calculate hierarchical match score (higher = better match)
            (
              CASE WHEN u.role = 'admin' THEN 100 ELSE 0 END +
              CASE WHEN u.role = 'supervisor' THEN 80 ELSE 0 END +
              CASE WHEN u.role = 'manager' THEN 60 ELSE 0 END +
              -- Branch match
              CASE WHEN u.default_branch_id = ec.branch_id THEN 50
                   WHEN u.default_branch_id IS NULL THEN 25
                   ELSE 0 END +
              -- Department match
              CASE WHEN u.department_id = ec.department_id THEN 40
                   WHEN u.authorized_departments @> to_jsonb(ec.department_id) THEN 30
                   WHEN u.authorized_departments = '[]'::jsonb THEN 20
                   ELSE 0 END +
              -- Sector match (if user has sector assignment)
              CASE WHEN EXISTS (
                SELECT 1 FROM user_shift_assignments usa
                WHERE usa.user_id = u.user_id
                  AND usa.is_active = true
                  AND usa.sector = ec.sector
              ) THEN 30 ELSE 0 END +
              -- Shift match
              CASE WHEN EXISTS (
                SELECT 1 FROM user_shift_assignments usa
                WHERE usa.user_id = u.user_id
                  AND usa.is_active = true
                  AND usa.shift_id = ec.shift_id
              ) THEN 25 ELSE 0 END
            ) AS match_score,
            -- Is this user from RRHH department?
            CASE WHEN LOWER(d.name) LIKE '%rrhh%'
                   OR LOWER(d.name) LIKE '%recursos humanos%'
                   OR LOWER(d.name) LIKE '%human resources%'
                   OR LOWER(d.name) LIKE '%hr%'
                 THEN true
                 ELSE false
            END AS is_rrhh
          FROM users u
          CROSS JOIN employee_context ec
          LEFT JOIN departments d ON u.department_id = d.id
          WHERE
            u.company_id = ec.company_id
            AND u.is_active = true
            AND u.can_authorize_late_arrivals = true
        ),
        -- Get direct authorizers (match score > 0)
        direct_authorizers AS (
          SELECT * FROM authorizer_scores
          WHERE match_score > 50  -- At least supervisor level or some context match
          ORDER BY match_score DESC
          LIMIT 10
        ),
        -- Get RRHH separately (always included if requested)
        rrhh_authorizers AS (
          SELECT * FROM authorizer_scores
          WHERE is_rrhh = true
            AND $6::boolean = true  -- includeRRHH parameter
        )
        -- Combine both, removing duplicates
        SELECT DISTINCT ON (user_id)
          user_id,
          "firstName" AS first_name,
          "lastName" AS last_name,
          email,
          whatsapp_number,
          notification_preference_late_arrivals,
          authorized_departments,
          role,
          auth_department_name AS department_name,
          match_score,
          is_rrhh,
          CASE WHEN is_rrhh THEN 'RRHH' ELSE 'SUPERVISOR' END AS authorizer_type
        FROM (
          SELECT * FROM direct_authorizers
          UNION ALL
          SELECT * FROM rrhh_authorizers
        ) combined
        ORDER BY
          user_id,
          is_rrhh DESC,  -- Prefer RRHH entry if duplicate
          match_score DESC
      `;

      const authorizers = await sequelize.query(query, {
        bind: [companyId, branchId, departmentId, sector, shiftId, includeRRHH],
        type: QueryTypes.SELECT
      });

      // Sort by match score descending
      authorizers.sort((a, b) => b.match_score - a.match_score);

      // Log results
      const rrhhCount = authorizers.filter(a => a.is_rrhh).length;
      const supervisorCount = authorizers.filter(a => !a.is_rrhh).length;

      console.log(`✅ [AUTH-HIERARCHICAL] Found ${authorizers.length} authorizers:`);
      console.log(`   - Supervisors/Managers: ${supervisorCount}`);
      console.log(`   - RRHH personnel: ${rrhhCount}`);

      if (authorizers.length > 0) {
        console.log(`   Top match: ${authorizers[0].first_name} ${authorizers[0].last_name} (score: ${authorizers[0].match_score})`);
      }

      return authorizers;

    } catch (error) {
      console.error('❌ [AUTH-HIERARCHICAL] Error finding authorizers:', error);

      // Fallback to simple query if hierarchical fails
      console.log('⚠️ [AUTH-HIERARCHICAL] Falling back to simple department query...');
      return this._findAuthorizersSimpleFallback(companyId, departmentId, includeRRHH);
    }
  }

  /**
   * 🔄 Fallback simple cuando la query jerárquica falla
   */
  async _findAuthorizersSimpleFallback(companyId, departmentId, includeRRHH) {
    try {
      const query = `
        SELECT
          u.user_id,
          u."firstName" AS first_name,
          u."lastName" AS last_name,
          u.email,
          u.whatsapp_number,
          u.notification_preference_late_arrivals,
          u.authorized_departments,
          u.role,
          d.name AS department_name,
          CASE WHEN LOWER(d.name) LIKE '%rrhh%' OR LOWER(d.name) LIKE '%recursos humanos%'
               THEN true ELSE false END AS is_rrhh
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE
          u.company_id = $1
          AND u.is_active = true
          AND u.can_authorize_late_arrivals = true
          AND (
            u.authorized_departments @> $2::jsonb
            OR u.authorized_departments = '[]'::jsonb
            OR ($3::boolean = true AND (
              LOWER(d.name) LIKE '%rrhh%'
              OR LOWER(d.name) LIKE '%recursos humanos%'
            ))
          )
        ORDER BY
          CASE
            WHEN role = 'admin' THEN 1
            WHEN role = 'supervisor' THEN 2
            ELSE 3
          END,
          "firstName" ASC
      `;

      return await sequelize.query(query, {
        bind: [companyId, JSON.stringify([departmentId]), includeRRHH],
        type: QueryTypes.SELECT
      });

    } catch (error) {
      console.error('❌ [AUTH-FALLBACK] Simple query also failed:', error);
      return [];
    }
  }

  /**
   * 🆕 NUEVO: Buscar autorizadores usando ORGANIGRAMA (parent_position_id)
   * Este es el método PRINCIPAL que reemplaza el lookup genérico por roles
   *
   * Lógica:
   * 1. Obtener organizational_position_id del empleado
   * 2. Buscar parent_position_id de esa posición (supervisor directo)
   * 3. Verificar si el supervisor directo está DISPONIBLE (trabajando hoy)
   * 4. Si NO está disponible → ESCALAR al supervisor del supervisor (grandparent_position_id)
   * 5. Reportar escalación a RRHH
   *
   * @param {Object} employeeContext - Contexto del empleado (incluye organizational_position_id y parent_position_id)
   * @param {number} companyId - ID de la empresa
   * @param {boolean} includeRRHH - Si incluir RRHH además del supervisor directo
   * @returns {Array} Lista de autorizadores (supervisor directo + RRHH si aplica)
   */
  async findAuthorizersByHierarchy(employeeContext, companyId, includeRRHH = true) {
    try {
      console.log(`🎯 [AUTH-HIERARCHY] Searching authorizers using ORGANIGRAMA...`);
      console.log(`   Employee position: ${employeeContext.position_name || 'N/A'} (ID: ${employeeContext.organizational_position_id || 'N/A'})`);
      console.log(`   Parent position ID: ${employeeContext.parent_position_id || 'N/A'}`);

      const authorizers = [];
      const escalationInfo = {
        escalated: false,
        reason: null,
        fromSupervisor: null,
        toSupervisor: null
      };

      // 1️⃣ SUPERVISOR DIRECTO: Buscar por parent_position_id
      if (employeeContext.parent_position_id) {
        const directSupervisorQuery = `
          SELECT
            u.user_id,
            u."firstName" AS first_name,
            u."lastName" AS last_name,
            u.email,
            u.whatsapp_number,
            u.notification_preference_late_arrivals,
            u.role,
            u.organizational_position_id,
            op.position_name,
            op.position_code,
            op.parent_position_id AS grandparent_position_id,
            'DIRECT_SUPERVISOR' AS authorizer_type,
            true AS is_direct_supervisor,
            false AS is_rrhh,
            999 AS match_score
          FROM users u
          JOIN organizational_positions op ON u.organizational_position_id = op.id
          WHERE u.organizational_position_id = $1
            AND u.company_id = $2
            AND u.is_active = true
            AND u.can_authorize_late_arrivals = true
        `;

        const directSupervisors = await sequelize.query(directSupervisorQuery, {
          bind: [employeeContext.parent_position_id, companyId],
          type: QueryTypes.SELECT
        });

        if (directSupervisors.length > 0) {
          console.log(`✅ [AUTH-HIERARCHY] Found ${directSupervisors.length} direct supervisor(s):`);

          // 🆕 VERIFICAR DISPONIBILIDAD Y MISMO TURNO de cada supervisor directo
          for (const supervisor of directSupervisors) {
            console.log(`   🔍 Checking supervisor: ${supervisor.first_name} ${supervisor.last_name} (${supervisor.position_name})`);

            // 1️⃣ VERIFICAR MISMO TURNO
            const shiftCheck = await this.checkSupervisorSameShift(
              supervisor.user_id,
              employeeContext.shift_id,
              companyId
            );

            if (!shiftCheck.hasSameShift) {
              // Supervisor tiene turno DIFERENTE → ESCALAR
              console.log(`   ⚠️ ${supervisor.first_name} ${supervisor.last_name} has DIFFERENT SHIFT: ${shiftCheck.supervisorShiftName}`);

              escalationInfo.escalated = true;
              escalationInfo.reason = `different_shift:${shiftCheck.supervisorShiftName}`;
              escalationInfo.fromSupervisor = `${supervisor.first_name} ${supervisor.last_name} (${supervisor.position_name})`;

              // Escalar al siguiente nivel (grandparent)
              if (supervisor.grandparent_position_id) {
                console.log(`   🔼 [SHIFT-ESCALATION] Escalating due to different shift to position: ${supervisor.grandparent_position_id}`);

                // Buscar supervisor del siguiente nivel con MISMO TURNO
                const escalatedWithSameShift = await this._findSupervisorWithSameShift(
                  supervisor.grandparent_position_id,
                  employeeContext.shift_id,
                  companyId,
                  employeeContext
                );

                if (escalatedWithSameShift) {
                  console.log(`   ✅ [SHIFT-ESCALATION] Found supervisor with same shift: ${escalatedWithSameShift.first_name} ${escalatedWithSameShift.last_name}`);
                  escalationInfo.toSupervisor = `${escalatedWithSameShift.first_name} ${escalatedWithSameShift.last_name} (${escalatedWithSameShift.position_name})`;
                  escalatedWithSameShift.authorizer_type = 'ESCALATED_SUPERVISOR_SAME_SHIFT';
                  authorizers.push(escalatedWithSameShift);
                } else {
                  console.log(`   ⚠️ [SHIFT-ESCALATION] No supervisor with same shift found in hierarchy`);
                }
              }
              continue; // Pasar al siguiente supervisor
            }

            // 2️⃣ VERIFICAR DISPONIBILIDAD (vacaciones, licencia, ausente)
            const availability = await this.checkSupervisorAvailability(supervisor.user_id, companyId);

            if (availability.isAvailable) {
              // Supervisor DISPONIBLE y MISMO TURNO → agregar a la lista
              console.log(`   ✅ ${supervisor.first_name} ${supervisor.last_name} is AVAILABLE with SAME SHIFT`);
              authorizers.push(supervisor);
            } else {
              // Supervisor NO DISPONIBLE → ESCALAR
              console.log(`   ⚠️ ${supervisor.first_name} ${supervisor.last_name} is NOT AVAILABLE: ${availability.reason}`);

              escalationInfo.escalated = true;
              escalationInfo.reason = availability.reason;
              escalationInfo.fromSupervisor = `${supervisor.first_name} ${supervisor.last_name} (${supervisor.position_name})`;

              // 🔼 ESCALACIÓN: Buscar supervisor del supervisor (grandparent position)
              if (supervisor.grandparent_position_id) {
                console.log(`   🔼 [ESCALATION] Escalating to grandparent position ID: ${supervisor.grandparent_position_id}`);

                const escalatedSupervisorQuery = `
                  SELECT
                    u.user_id,
                    u."firstName" AS first_name,
                    u."lastName" AS last_name,
                    u.email,
                    u.whatsapp_number,
                    u.notification_preference_late_arrivals,
                    u.role,
                    op.position_name,
                    op.position_code,
                    'ESCALATED_SUPERVISOR' AS authorizer_type,
                    true AS is_direct_supervisor,
                    false AS is_rrhh,
                    998 AS match_score
                  FROM users u
                  JOIN organizational_positions op ON u.organizational_position_id = op.id
                  WHERE u.organizational_position_id = $1
                    AND u.company_id = $2
                    AND u.is_active = true
                    AND u.can_authorize_late_arrivals = true
                `;

                const escalatedSupervisors = await sequelize.query(escalatedSupervisorQuery, {
                  bind: [supervisor.grandparent_position_id, companyId],
                  type: QueryTypes.SELECT
                });

                if (escalatedSupervisors.length > 0) {
                  console.log(`   ✅ [ESCALATION] Found escalated supervisor: ${escalatedSupervisors[0].first_name} ${escalatedSupervisors[0].last_name}`);
                  escalationInfo.toSupervisor = `${escalatedSupervisors[0].first_name} ${escalatedSupervisors[0].last_name} (${escalatedSupervisors[0].position_name})`;
                  authorizers.push(...escalatedSupervisors);
                } else {
                  console.log(`   ⚠️ [ESCALATION] No escalated supervisor found at grandparent position`);
                }
              } else {
                console.log(`   ⚠️ [ESCALATION] Supervisor has no grandparent position (top of hierarchy)`);
              }
            }
          }
        } else {
          console.log(`⚠️ [AUTH-HIERARCHY] No user assigned to parent position ${employeeContext.parent_position_id}`);
        }
      } else {
        console.log(`⚠️ [AUTH-HIERARCHY] Employee has no parent_position_id (no organigrama assigned)`);
      }

      // 2️⃣ RRHH: Buscar por posición específica (no por nombre de departamento)
      if (includeRRHH) {
        const rrhhUsers = await this.findRRHHByPosition(companyId);
        if (rrhhUsers.length > 0) {
          console.log(`✅ [AUTH-HIERARCHY] Found ${rrhhUsers.length} RRHH user(s):`);
          rrhhUsers.forEach(rrhh => {
            console.log(`   - ${rrhh.first_name} ${rrhh.last_name} (${rrhh.position_name})`);
          });

          // 🆕 Si hubo escalación, marcar RRHH para que reciba reporte
          if (escalationInfo.escalated) {
            rrhhUsers.forEach(rrhh => {
              rrhh.notify_escalation = true;  // Flag para incluir info de escalación en email
              rrhh.escalation_info = escalationInfo;
            });
            console.log(`📢 [ESCALATION] RRHH will be notified about escalation`);
          }

          authorizers.push(...rrhhUsers);
        } else {
          console.log(`⚠️ [AUTH-HIERARCHY] No RRHH users found by position`);
        }
      }

      // 3️⃣ FALLBACK: Si no se encontró nadie, usar método antiguo
      if (authorizers.length === 0) {
        console.log(`⚠️ [AUTH-HIERARCHY] No authorizers found via hierarchy, using fallback...`);
        return await this.findAuthorizersHierarchical({
          companyId,
          branchId: employeeContext.branch_id,
          departmentId: employeeContext.department_id,
          sector: employeeContext.sector,
          shiftId: employeeContext.shift_id,
          includeRRHH
        });
      }

      console.log(`✅ [AUTH-HIERARCHY] Total authorizers found: ${authorizers.length}`);
      if (escalationInfo.escalated) {
        console.log(`📢 [ESCALATION SUMMARY]:`);
        console.log(`   From: ${escalationInfo.fromSupervisor}`);
        console.log(`   To: ${escalationInfo.toSupervisor || 'RRHH only'}`);
        console.log(`   Reason: ${escalationInfo.reason}`);
      }
      return authorizers;

    } catch (error) {
      console.error('❌ [AUTH-HIERARCHY] Error in hierarchy lookup:', error);
      // Fallback completo al método antiguo
      return await this.findAuthorizersHierarchical({
        companyId,
        branchId: employeeContext.branch_id,
        departmentId: employeeContext.department_id,
        sector: employeeContext.sector,
        shiftId: employeeContext.shift_id,
        includeRRHH
      });
    }
  }

  /**
   * 🆕 NUEVO: Verificar si el supervisor tiene el MISMO TURNO que el empleado
   * El supervisor debe estar asignado al mismo turno para poder autorizar
   *
   * @param {number} supervisorId - ID del supervisor
   * @param {string} employeeShiftId - UUID del turno del empleado
   * @param {number} companyId - ID de la empresa
   * @returns {Object} { hasSameShift: boolean, supervisorShiftId: string, supervisorShiftName: string, reason: string }
   */
  async checkSupervisorSameShift(supervisorId, employeeShiftId, companyId) {
    try {
      console.log(`🔍 [SAME-SHIFT] Checking if supervisor ${supervisorId} has shift ${employeeShiftId}...`);

      // Si el empleado no tiene turno asignado, skip la verificación
      if (!employeeShiftId) {
        console.log(`⚠️ [SAME-SHIFT] Employee has no shift assigned, skipping check`);
        return { hasSameShift: true, reason: 'employee_no_shift' };
      }

      const query = `
        SELECT
          usa.shift_id,
          s.name AS shift_name,
          CASE WHEN usa.shift_id = $2::uuid THEN true ELSE false END AS has_same_shift
        FROM user_shift_assignments usa
        JOIN shifts s ON usa.shift_id = s.id
        WHERE usa.user_id = $1
          AND usa.is_active = true
        ORDER BY usa.created_at DESC
        LIMIT 1
      `;

      const result = await sequelize.query(query, {
        bind: [supervisorId, employeeShiftId],
        type: QueryTypes.SELECT,
        plain: true
      });

      if (!result) {
        console.log(`⚠️ [SAME-SHIFT] Supervisor ${supervisorId} has no shift assigned`);
        return {
          hasSameShift: false,
          reason: 'supervisor_no_shift',
          supervisorShiftId: null,
          supervisorShiftName: null
        };
      }

      if (result.has_same_shift) {
        console.log(`✅ [SAME-SHIFT] Supervisor HAS same shift: ${result.shift_name}`);
        return {
          hasSameShift: true,
          supervisorShiftId: result.shift_id,
          supervisorShiftName: result.shift_name
        };
      } else {
        console.log(`❌ [SAME-SHIFT] Supervisor has DIFFERENT shift: ${result.shift_name}`);
        return {
          hasSameShift: false,
          reason: 'different_shift',
          supervisorShiftId: result.shift_id,
          supervisorShiftName: result.shift_name
        };
      }

    } catch (error) {
      console.error('❌ [SAME-SHIFT] Error checking supervisor shift:', error);
      // En caso de error, no bloquear el flujo
      return { hasSameShift: true, reason: 'error_checking' };
    }
  }

  /**
   * 🆕 NUEVO: Verificar si un supervisor está DISPONIBLE para autorizar (está trabajando HOY)
   * Verifica:
   * 1. Tiene asistencia activa hoy (check-in sin check-out)
   * 2. NO está de vacaciones
   * 3. NO está con licencia médica
   *
   * @param {number} userId - ID del supervisor
   * @param {number} companyId - ID de la empresa
   * @returns {Object} { isAvailable: boolean, reason: string }
   */
  async checkSupervisorAvailability(userId, companyId) {
    try {
      const query = `
        SELECT
          u.user_id,
          u."firstName",
          u."lastName",
          -- Check attendance today
          EXISTS (
            SELECT 1 FROM attendances a
            WHERE a."UserId" = u.user_id
              AND DATE(a."checkInTime") = CURRENT_DATE
              AND a."checkInTime" IS NOT NULL
          ) AS has_attendance_today,
          -- Check vacation
          EXISTS (
            SELECT 1 FROM vacation_requests vr
            WHERE vr.user_id = u.user_id
              AND vr.status = 'approved'
              AND CURRENT_DATE BETWEEN vr.start_date AND vr.end_date
          ) AS is_on_vacation,
          -- Check sick leave (skip if table doesn't exist)
          false AS is_on_sick_leave,
          -- Check if scheduled to work today (cast JSON to JSONB for operators)
          EXISTS (
            SELECT 1 FROM user_shift_assignments usa
            JOIN shifts s ON usa.shift_id = s.id
            WHERE usa.user_id = u.user_id
              AND usa.is_active = true
              AND (
                s.days::jsonb ? EXTRACT(DOW FROM CURRENT_DATE)::text
                OR s.days::jsonb @> to_jsonb(EXTRACT(DOW FROM CURRENT_DATE)::int)
              )
          ) AS is_scheduled_today
        FROM users u
        WHERE u.user_id = $1 AND u.company_id = $2
      `;

      const result = await sequelize.query(query, {
        bind: [userId, companyId],
        type: QueryTypes.SELECT,
        plain: true
      });

      if (!result) {
        return { isAvailable: false, reason: 'Supervisor not found' };
      }

      // Si está de vacaciones
      if (result.is_on_vacation) {
        console.log(`⚠️ [AVAILABILITY] ${result.firstName} ${result.lastName} is ON VACATION`);
        return {
          isAvailable: false,
          reason: 'on_vacation',
          supervisorName: `${result.firstName} ${result.lastName}`
        };
      }

      // Si está con licencia médica
      if (result.is_on_sick_leave) {
        console.log(`⚠️ [AVAILABILITY] ${result.firstName} ${result.lastName} is ON SICK LEAVE`);
        return {
          isAvailable: false,
          reason: 'on_sick_leave',
          supervisorName: `${result.firstName} ${result.lastName}`
        };
      }

      // Si está programado para trabajar hoy pero NO tiene asistencia
      if (result.is_scheduled_today && !result.has_attendance_today) {
        console.log(`⚠️ [AVAILABILITY] ${result.firstName} ${result.lastName} is SCHEDULED but NOT AT WORK (no attendance)`);
        return {
          isAvailable: false,
          reason: 'absent_today',
          supervisorName: `${result.firstName} ${result.lastName}`
        };
      }

      // Supervisor está disponible
      console.log(`✅ [AVAILABILITY] ${result.firstName} ${result.lastName} is AVAILABLE`);
      return {
        isAvailable: true,
        supervisorName: `${result.firstName} ${result.lastName}`
      };

    } catch (error) {
      console.error('❌ [AVAILABILITY] Error checking supervisor availability:', error);
      // En caso de error, asumir que está disponible (fail-safe)
      return { isAvailable: true, reason: 'error_checking' };
    }
  }

  /**
   * 🆕 ACTUALIZADO: Buscar usuario(s) de RRHH usando NotificationRecipientResolver (SSOT)
   * Ya no usa queries directas - delega al servicio centralizado
   *
   * @param {number} companyId - ID de la empresa
   * @returns {Array} Lista de usuarios de RRHH con formato compatible
   */
  async findRRHHByPosition(companyId) {
    try {
      // Usar NotificationRecipientResolver como SSOT
      const recipients = await NotificationRecipientResolver.resolveRRHH(companyId, {
        maxRecipients: 5,
        includeUserDetails: true,
        fallbackToAdmins: true
      });

      // Mapear al formato esperado por este servicio
      return recipients.map(r => ({
        user_id: r.userId,
        first_name: r.name?.split(' ')[0] || '',
        last_name: r.name?.split(' ').slice(1).join(' ') || '',
        email: r.email,
        whatsapp_number: null, // Se obtiene si es necesario
        notification_preference_late_arrivals: 'all',
        role: r.role,
        position_name: 'RRHH',
        position_code: 'RRHH',
        level_order: 1,
        authorizer_type: 'RRHH',
        is_direct_supervisor: false,
        is_rrhh: true,
        match_score: 800
      }));

    } catch (error) {
      console.error('❌ [RRHH-POSITION] Error finding RRHH via NotificationRecipientResolver:', error);
      return [];
    }
  }

  /**
   * 🆕 NUEVO: Buscar recursivamente un supervisor en la jerarquía con el MISMO TURNO
   * Sube por la cadena de mando hasta encontrar uno disponible con mismo turno
   *
   * @param {number} positionId - ID de la posición organizacional a buscar
   * @param {string} employeeShiftId - UUID del turno del empleado
   * @param {number} companyId - ID de la empresa
   * @param {Object} employeeContext - Contexto del empleado
   * @param {number} maxLevels - Máximo de niveles a subir (default 5)
   * @returns {Object|null} Supervisor encontrado o null
   */
  async _findSupervisorWithSameShift(positionId, employeeShiftId, companyId, employeeContext, maxLevels = 5) {
    try {
      let currentPositionId = positionId;
      let level = 0;

      while (currentPositionId && level < maxLevels) {
        level++;
        console.log(`   🔼 [SHIFT-SEARCH] Level ${level}: Searching position ${currentPositionId}...`);

        // Buscar usuario en esta posición
        const query = `
          SELECT
            u.user_id,
            u."firstName" AS first_name,
            u."lastName" AS last_name,
            u.email,
            u.whatsapp_number,
            u.notification_preference_late_arrivals,
            u.role,
            op.position_name,
            op.position_code,
            op.parent_position_id AS next_position_id,
            usa.shift_id
          FROM users u
          JOIN organizational_positions op ON u.organizational_position_id = op.id
          LEFT JOIN user_shift_assignments usa ON u.user_id = usa.user_id AND usa.is_active = true
          WHERE u.organizational_position_id = $1
            AND u.company_id = $2
            AND u.is_active = true
            AND u.can_authorize_late_arrivals = true
          ORDER BY usa.is_primary DESC
          LIMIT 1
        `;

        const result = await sequelize.query(query, {
          bind: [currentPositionId, companyId],
          type: QueryTypes.SELECT,
          plain: true
        });

        if (!result) {
          console.log(`   ⚠️ [SHIFT-SEARCH] No user found at position ${currentPositionId}`);
          // Intentar subir al siguiente nivel
          const posQuery = `SELECT parent_position_id FROM organizational_positions WHERE id = $1`;
          const posResult = await sequelize.query(posQuery, {
            bind: [currentPositionId],
            type: QueryTypes.SELECT,
            plain: true
          });
          currentPositionId = posResult?.parent_position_id;
          continue;
        }

        // Verificar MISMO TURNO
        if (result.shift_id === employeeShiftId) {
          // Verificar DISPONIBILIDAD
          const availability = await this.checkSupervisorAvailability(result.user_id, companyId);

          if (availability.isAvailable) {
            console.log(`   ✅ [SHIFT-SEARCH] Found available supervisor with same shift: ${result.first_name} ${result.last_name}`);
            return result;
          } else {
            console.log(`   ⚠️ [SHIFT-SEARCH] ${result.first_name} has same shift but NOT available: ${availability.reason}`);
          }
        } else {
          console.log(`   ⚠️ [SHIFT-SEARCH] ${result.first_name} has different shift (${result.shift_id})`);
        }

        // Subir al siguiente nivel
        currentPositionId = result.next_position_id;
      }

      console.log(`   ❌ [SHIFT-SEARCH] No supervisor with same shift found after ${level} levels`);
      return null;

    } catch (error) {
      console.error('❌ [SHIFT-SEARCH] Error searching supervisor with same shift:', error);
      return null;
    }
  }

  /**
   * 🔍 Buscar datos completos del empleado para lookup jerárquico
   * 🆕 INCLUYE organizational_position_id para lookup de parent_position_id
   */
  async _getEmployeeHierarchyContext(userId, companyId) {
    try {
      const query = `
        SELECT
          u.user_id,
          u.department_id,
          u.default_branch_id AS branch_id,
          u.organizational_position_id,
          d.name AS department_name,
          b.name AS branch_name,
          usa.shift_id,
          usa.sector,
          usa.assigned_phase,
          s.name AS shift_name,
          op.position_name,
          op.parent_position_id
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        LEFT JOIN branches b ON u.default_branch_id = b.id
        LEFT JOIN user_shift_assignments usa ON u.user_id = usa.user_id AND usa.is_active = true
        LEFT JOIN shifts s ON usa.shift_id = s.id
        LEFT JOIN organizational_positions op ON u.organizational_position_id = op.id
        WHERE u.user_id = $1 AND u.company_id = $2
      `;

      const result = await sequelize.query(query, {
        bind: [userId, companyId],
        type: QueryTypes.SELECT,
        plain: true
      });

      return result || {};

    } catch (error) {
      console.error('❌ [EMPLOYEE-CONTEXT] Error getting hierarchy context:', error);
      return {};
    }
  }

  /**
   * Enviar solicitud de autorización multi-canal
   * 🆕 ACTUALIZADO: Usa ORGANIGRAMA (parent_position_id) para encontrar supervisor directo
   * @param {Object} params - Parámetros de la solicitud
   * @returns {Object} Resultado del envío
   */
  async sendAuthorizationRequest({
    employeeData,
    attendanceId,
    authorizationToken,
    shiftData,
    lateMinutes,
    companyId
  }) {
    try {
      console.log(`📤 [AUTH-REQUEST] Sending authorization request for employee:`);
      console.log(`   Name: ${employeeData.first_name} ${employeeData.last_name}`);
      console.log(`   Legajo: ${employeeData.legajo || 'N/A'}`);

      // 1. Obtener contexto jerárquico completo del empleado (incluye organizational_position_id y parent_position_id)
      const employeeContext = await this._getEmployeeHierarchyContext(
        employeeData.user_id,
        companyId
      );

      console.log(`📋 [AUTH-REQUEST] Employee hierarchy context:`);
      console.log(`   Branch: ${employeeContext.branch_name || 'N/A'} (ID: ${employeeContext.branch_id || 'N/A'})`);
      console.log(`   Department: ${employeeContext.department_name || employeeData.department_name || 'N/A'}`);
      console.log(`   Sector: ${employeeContext.sector || 'N/A'}`);
      console.log(`   Shift: ${employeeContext.shift_name || 'N/A'} (ID: ${employeeContext.shift_id || 'N/A'})`);
      console.log(`   🆕 Position: ${employeeContext.position_name || 'N/A'} (ID: ${employeeContext.organizational_position_id || 'N/A'})`);
      console.log(`   🆕 Parent Position ID: ${employeeContext.parent_position_id || 'N/A'}`);

      // 2. 🆕 BUSCAR AUTORIZADORES USANDO ORGANIGRAMA (parent_position_id)
      // Este método usa el organigrama establecido para encontrar el supervisor DIRECTO
      // Si no hay organigrama, hace fallback al método antiguo (role-based)
      const authorizers = await this.findAuthorizersByHierarchy(
        employeeContext,
        companyId,
        true  // SIEMPRE incluir RRHH
      );

      if (authorizers.length === 0) {
        // No hay autorizadores, usar fallback de empresa
        console.log('⚠️ No authorizers found, using company fallback');
        return await this._sendFallbackNotification({
          employeeData,
          attendanceId,
          authorizationToken,
          shiftData,
          lateMinutes,
          companyId
        });
      }

      // 2. Enviar notificaciones a todos los autorizadores
      const notificationResults = [];
      const notifiedUserIds = [];

      for (const authorizer of authorizers) {
        const preference = authorizer.notification_preference_late_arrivals || 'email';

        let result;
        switch (preference) {
          case 'email':
            result = await this._sendEmailNotification({
              authorizer,
              employeeData,
              authorizationToken,
              shiftData,
              lateMinutes,
              companyId  // 🔥 NCE: Pasar companyId
            });
            break;

          case 'whatsapp':
            result = await this._sendWhatsAppNotification({
              authorizer,
              employeeData,
              authorizationToken,
              shiftData,
              lateMinutes
            });
            break;

          case 'both':
            const emailResult = await this._sendEmailNotification({
              authorizer,
              employeeData,
              authorizationToken,
              shiftData,
              lateMinutes,
              companyId  // 🔥 NCE: Pasar companyId
            });
            const whatsappResult = await this._sendWhatsAppNotification({
              authorizer,
              employeeData,
              authorizationToken,
              shiftData,
              lateMinutes
            });
            result = {
              email: emailResult,
              whatsapp: whatsappResult,
              success: emailResult.success || whatsappResult.success
            };
            break;

          default:
            result = { success: false, error: 'Invalid preference' };
        }

        notificationResults.push({
          authorizerId: authorizer.user_id,
          authorizerName: `${authorizer.first_name} ${authorizer.last_name}`,
          preference,
          result
        });

        if (result.success || (result.email?.success || result.whatsapp?.success)) {
          notifiedUserIds.push(authorizer.user_id);
        }
      }

      // 3. Enviar notificación WebSocket a todos los autorizadores conectados
      await this._sendWebSocketNotification({
        authorizers,
        employeeData,
        authorizationToken,
        shiftData,
        lateMinutes,
        attendanceId
      });

      // 4. Registrar autorizadores notificados en la BD
      await this._updateNotifiedAuthorizers(attendanceId, notifiedUserIds);

      // 5. 🆕 ENVIAR VÍA SISTEMA CENTRAL DE NOTIFICACIONES (NotificationUnifiedService)
      let unifiedNotificationResult = null;
      if (notificationUnifiedService) {
        try {
          unifiedNotificationResult = await this._sendViaUnifiedNotificationSystem({
            employeeData,
            employeeContext,
            authorizers,
            authorizationToken,
            shiftData,
            lateMinutes,
            companyId,
            attendanceId
          });
          console.log(`✅ [AUTH] Unified notification sent: Thread ID ${unifiedNotificationResult?.threadId || 'N/A'}`);
        } catch (unifiedError) {
          console.error('⚠️ [AUTH] Error sending unified notification (non-blocking):', unifiedError.message);
        }
      }

      // 6. 🆕 NOTIFICAR AL EMPLEADO que su solicitud fue enviada (en tiempo real)
      await this._notifyEmployeeRequestSent({
        employeeData,
        authorizationToken,
        shiftData,
        lateMinutes,
        authorizers,
        companyId
      });

      return {
        success: notificationResults.some(r => r.result.success || r.result.email?.success || r.result.whatsapp?.success),
        notificationResults,
        notifiedCount: notifiedUserIds.length,
        authorizationToken,
        unifiedNotification: unifiedNotificationResult
      };

    } catch (error) {
      console.error('❌ Error sending authorization request:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Enviar notificación por Email con botones HTML
   * 🆕 INCLUYE información de escalación si notify_escalation=true
   * 🔥 MIGRADO A NCE (Notification Central Exchange)
   */
  async _sendEmailNotification({ authorizer, employeeData, authorizationToken, shiftData, lateMinutes, companyId }) {
    try {
      const approveUrl = `${this.serverBaseUrl}/api/v1/authorization/approve/${authorizationToken}`;
      const rejectUrl = `${this.serverBaseUrl}/api/v1/authorization/reject/${authorizationToken}`;

      // 🔥 REEMPLAZO: Email directo → NCE (Central Telefónica)
      const nceResult = await NCE.send({
        // CONTEXTO
        companyId: companyId,
        module: 'attendance',
        originType: 'late_arrival_authorization',
        originId: authorizationToken,

        // WORKFLOW (define reglas, canales, SLA, escalamiento)
        workflowKey: 'attendance.late_arrival_authorization_request',

        // DESTINATARIO
        recipientType: 'user',
        recipientId: authorizer.user_id,
        recipientEmail: authorizer.email,

        // CONTENIDO
        title: authorizer.notify_escalation
          ? `🔼 ESCALACIÓN - Autorización Requerida - Llegada Tardía ${employeeData.first_name} ${employeeData.last_name}`
          : `⚠️ Autorización Requerida - Llegada Tardía ${employeeData.first_name} ${employeeData.last_name}`,
        message: `El empleado ${employeeData.first_name} ${employeeData.last_name} (Legajo: ${employeeData.legajo || 'N/A'}) llegó ${lateMinutes} minutos tarde.`,
        metadata: {
          authorizerName: authorizer.first_name,
          employeeName: `${employeeData.first_name} ${employeeData.last_name}`,
          employeeLegajo: employeeData.legajo,
          employeeUserId: employeeData.user_id,
          departmentName: employeeData.department_name || 'N/A',
          shiftName: shiftData.name,
          shiftStartTime: shiftData.startTime,
          lateMinutes,
          approveUrl,
          rejectUrl,
          currentTime: new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }),
          escalationInfo: authorizer.notify_escalation ? authorizer.escalation_info : null,
          authorizationToken  // Para tracking
        },

        // COMPORTAMIENTO
        priority: 'critical',           // Crítico - requiere acción urgente
        requiresAction: true,           // Requiere aprobación/rechazo
        actionType: 'approval',         // Tipo de acción esperada
        slaHours: 0.25,                 // 15 minutos (0.25 horas)

        // CANALES (NCE decide según política del workflow)
        channels: ['email', 'push', 'websocket'],

        // ESCALAMIENTO (NCE maneja según política)
        escalationPolicy: {
          levels: [
            { after: '15m', escalateTo: 'manager' },
            { after: '30m', escalateTo: 'hr_manager' }
          ]
        }
      });

      console.log(`✅ [NCE] Late arrival authorization sent via NCE to ${authorizer.email}`);
      console.log(`   Notification ID: ${nceResult.notificationId}`);
      console.log(`   Channels: ${nceResult.channelsUsed?.join(', ')}`);

      return {
        success: nceResult.success,
        messageId: nceResult.notificationId,
        recipient: authorizer.email,
        channelsUsed: nceResult.channelsUsed
      };

    } catch (error) {
      console.error('❌ [NCE] Error sending late arrival authorization via NCE:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Enviar notificación por WhatsApp Business API
   */
  async _sendWhatsAppNotification({ authorizer, employeeData, authorizationToken, shiftData, lateMinutes }) {
    try {
      if (!this.whatsappToken || !this.whatsappPhoneNumberId) {
        return { success: false, error: 'WhatsApp API not configured' };
      }

      const approveUrl = `${this.serverBaseUrl}/api/v1/authorization/approve/${authorizationToken}`;
      const rejectUrl = `${this.serverBaseUrl}/api/v1/authorization/reject/${authorizationToken}`;

      const message = this._buildWhatsAppMessage({
        authorizerName: authorizer.first_name,
        employeeName: `${employeeData.first_name} ${employeeData.last_name}`,
        employeeLegajo: employeeData.legajo,
        departmentName: employeeData.department_name || 'N/A',
        shiftName: shiftData.name,
        shiftStartTime: shiftData.startTime,
        lateMinutes,
        approveUrl,
        rejectUrl
      });

      const phoneNumber = this._formatPhoneNumber(authorizer.whatsapp_number);

      const payload = {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'text',
        text: { body: message }
      };

      const response = await axios.post(
        `${this.whatsappApiUrl}/${this.whatsappPhoneNumberId}/messages`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.whatsappToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`✅ WhatsApp sent to ${phoneNumber}: ${response.data.messages?.[0]?.id}`);

      return {
        success: true,
        messageId: response.data.messages?.[0]?.id,
        recipient: phoneNumber
      };

    } catch (error) {
      console.error('❌ Error sending WhatsApp:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * Enviar notificación por WebSocket (tiempo real)
   */
  async _sendWebSocketNotification({ authorizers, employeeData, authorizationToken, shiftData, lateMinutes, attendanceId }) {
    try {
      const notificationData = {
        type: 'late_arrival_authorization_request',
        attendanceId,
        authorizationToken,
        employee: {
          name: `${employeeData.first_name} ${employeeData.last_name}`,
          legajo: employeeData.legajo,
          department: employeeData.department_name || 'N/A'
        },
        shift: {
          name: shiftData.name,
          startTime: shiftData.startTime
        },
        lateMinutes,
        timestamp: new Date().toISOString()
      };

      // Enviar a cada autorizador conectado
      for (const authorizer of authorizers) {
        websocket.sendToUser(authorizer.user_id, 'authorization_request', notificationData);
      }

      console.log(`✅ WebSocket notification sent to ${authorizers.length} authorizers`);

      return { success: true };

    } catch (error) {
      console.error('❌ Error sending WebSocket notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Enviar notificación fallback cuando no hay autorizadores
   * 🔥 MIGRADO A NCE (Notification Central Exchange)
   */
  async _sendFallbackNotification({ employeeData, authorizationToken, shiftData, lateMinutes, companyId }) {
    try {
      // Obtener datos de fallback de la empresa
      const company = await sequelize.query(
        `SELECT fallback_notification_email, fallback_notification_whatsapp, name
         FROM companies WHERE company_id = $1`,
        {
          bind: [companyId],
          type: QueryTypes.SELECT,
          plain: true
        }
      );

      if (!company) {
        return { success: false, error: 'Company not found' };
      }

      const results = [];

      // 🔥 REEMPLAZO: Email fallback directo → NCE (Central Telefónica)
      if (company.fallback_notification_email) {
        const approveUrl = `${this.serverBaseUrl}/api/v1/authorization/approve/${authorizationToken}`;
        const rejectUrl = `${this.serverBaseUrl}/api/v1/authorization/reject/${authorizationToken}`;

        const nceResult = await NCE.send({
          // CONTEXTO
          companyId: companyId,
          module: 'attendance',
          originType: 'late_arrival_authorization_fallback',
          originId: authorizationToken,

          // WORKFLOW
          workflowKey: 'attendance.late_arrival_authorization_request',

          // DESTINATARIO (fallback = role-based, no user específico)
          recipientType: 'role',
          recipientRole: 'hr_manager',
          recipientEmail: company.fallback_notification_email,

          // CONTENIDO
          title: `⚠️ [FALLBACK] Autorización Requerida - Llegada Tardía ${employeeData.first_name} ${employeeData.last_name}`,
          message: `No hay supervisores disponibles. El empleado ${employeeData.first_name} ${employeeData.last_name} (Legajo: ${employeeData.legajo || 'N/A'}) llegó ${lateMinutes} minutos tarde.`,
          metadata: {
            authorizerName: 'RRHH',
            employeeName: `${employeeData.first_name} ${employeeData.last_name}`,
            employeeLegajo: employeeData.legajo,
            employeeUserId: employeeData.user_id,
            departmentName: employeeData.department_name || 'N/A',
            shiftName: shiftData.name,
            shiftStartTime: shiftData.startTime,
            lateMinutes,
            approveUrl,
            rejectUrl,
            currentTime: new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }),
            authorizationToken,
            isFallback: true  // Marca que es fallback
          },

          // COMPORTAMIENTO
          priority: 'critical',
          requiresAction: true,
          actionType: 'approval',
          slaHours: 0.25,  // 15 minutos

          channels: ['email', 'push'],
        });

        console.log(`✅ [NCE-FALLBACK] Late arrival authorization sent via NCE to ${company.fallback_notification_email}`);
        results.push({ type: 'email', success: nceResult.success, messageId: nceResult.notificationId });
      }

      // WhatsApp fallback
      if (company.fallback_notification_whatsapp && this.whatsappToken) {
        const result = await this._sendWhatsAppNotification({
          authorizer: {
            first_name: 'RRHH',
            whatsapp_number: company.fallback_notification_whatsapp
          },
          employeeData,
          authorizationToken,
          shiftData,
          lateMinutes
        });
        results.push({ type: 'whatsapp', ...result });
      }

      return {
        success: results.some(r => r.success),
        fallback: true,
        results
      };

    } catch (error) {
      console.error('❌ Error sending fallback notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 🆕 NUEVO: Enviar notificación vía Sistema Central (NotificationUnifiedService)
   * Crea thread y envía notificaciones estructuradas para dashboard y seguimiento
   */
  async _sendViaUnifiedNotificationSystem({
    employeeData,
    employeeContext,
    authorizers,
    authorizationToken,
    shiftData,
    lateMinutes,
    companyId,
    attendanceId
  }) {
    try {
      if (!notificationUnifiedService) {
        console.log('⚠️ [UNIFIED] NotificationUnifiedService not available');
        return null;
      }

      const employeeName = `${employeeData.first_name} ${employeeData.last_name}`;
      const employeePosition = employeeContext.position_name || 'N/A';

      // 1️⃣ CREAR THREAD para esta solicitud de autorización
      const thread = await notificationUnifiedService.createThread({
        companyId,
        subject: `Llegada tardía: ${employeeName} (${lateMinutes} min)`,
        category: 'approval',
        module: 'attendance',
        threadType: 'authorization',
        initiatorType: 'employee',
        initiatorId: employeeData.user_id,
        initiatorName: employeeName,
        priority: lateMinutes > 30 ? 'high' : 'medium'
      });

      console.log(`📋 [UNIFIED] Thread created: ${thread.id || thread}`);
      const threadId = thread.id || thread;

      // 2️⃣ NOTIFICACIÓN INICIAL (al empleado - confirmación de solicitud)
      await notificationUnifiedService.send({
        companyId,
        threadId,
        originType: 'system',
        originId: 'late-arrival-service',
        originName: 'Sistema de Llegadas Tardías',
        recipientType: 'user',
        recipientId: employeeData.user_id,
        recipientName: employeeName,
        category: 'approval',
        module: 'attendance',
        notificationType: 'late_arrival_request_sent',
        priority: lateMinutes > 30 ? 'high' : 'medium',
        title: `⏳ Solicitud de autorización enviada`,
        message: `Tu solicitud de ingreso tardío (${lateMinutes} min de retraso) ha sido enviada a ${authorizers.length} supervisor(es). Te notificaremos cuando respondan.`,
        shortMessage: `Solicitud enviada a ${authorizers.length} supervisor(es)`,
        metadata: {
          attendance_id: attendanceId,
          authorization_token: authorizationToken,
          late_minutes: lateMinutes,
          shift_name: shiftData.name,
          shift_start: shiftData.startTime,
          employee_position: employeePosition,
          authorizers_count: authorizers.length
        },
        relatedEntityType: 'attendance',
        relatedEntityId: attendanceId?.toString(),
        requiresAction: false,
        channels: ['app', 'websocket']
      });

      // 3️⃣ NOTIFICACIONES A CADA AUTORIZADOR (supervisor/RRHH)
      for (const authorizer of authorizers) {
        const isRRHH = authorizer.is_rrhh || authorizer.authorizer_type === 'RRHH';
        const isEscalated = authorizer.authorizer_type?.includes('ESCALATED');

        let title = `⚠️ Autorización requerida: ${employeeName}`;
        let message = `${employeeName} llegó ${lateMinutes} minutos tarde a su turno "${shiftData.name}" (inicio: ${shiftData.startTime}).\n\nRequiere tu autorización para registrar su ingreso.`;

        // Agregar info de escalación si corresponde
        if (isEscalated) {
          title = `🔼 [ESCALADO] ${title}`;
          message = `[ESCALACIÓN AUTOMÁTICA]\n${message}`;
        }

        if (isRRHH && authorizer.notify_escalation && authorizer.escalation_info) {
          message += `\n\n📢 NOTA: Esta solicitud fue escalada porque:\n- ${this._translateEscalationReason(authorizer.escalation_info.reason)}`;
          if (authorizer.escalation_info.fromSupervisor) {
            message += `\n- Supervisor original: ${authorizer.escalation_info.fromSupervisor}`;
          }
        }

        await notificationUnifiedService.send({
          companyId,
          threadId,
          originType: 'employee',
          originId: employeeData.user_id,
          originName: employeeName,
          recipientType: 'user',
          recipientId: authorizer.user_id,
          recipientName: `${authorizer.first_name} ${authorizer.last_name}`,
          recipientRole: authorizer.role,
          recipientHierarchyLevel: isRRHH ? 3 : 2, // RRHH es nivel 3, supervisor nivel 2
          category: 'approval',
          module: 'attendance',
          notificationType: 'late_arrival_authorization',
          priority: lateMinutes > 30 ? 'high' : 'medium',
          title,
          message,
          shortMessage: `${employeeName} - ${lateMinutes}min tarde`,
          metadata: {
            attendance_id: attendanceId,
            authorization_token: authorizationToken,
            late_minutes: lateMinutes,
            shift_name: shiftData.name,
            shift_start: shiftData.startTime,
            employee_id: employeeData.user_id,
            employee_legajo: employeeData.legajo,
            employee_department: employeeData.department_name,
            employee_position: employeePosition,
            authorizer_type: authorizer.authorizer_type,
            is_escalated: isEscalated,
            is_rrhh: isRRHH
          },
          relatedEntityType: 'attendance',
          relatedEntityId: attendanceId?.toString(),
          requiresAction: true,
          actionType: 'approve_reject',
          actionOptions: [
            { label: '✅ Autorizar', value: 'approve', style: 'success' },
            { label: '❌ Rechazar', value: 'reject', style: 'danger' }
          ],
          actionDeadline: new Date(Date.now() + 30 * 60 * 1000), // 30 min para responder
          slaHours: 0.5, // 30 minutos SLA
          channels: ['app', 'websocket', 'email']
        });

        console.log(`📤 [UNIFIED] Notification sent to: ${authorizer.first_name} ${authorizer.last_name} (${authorizer.authorizer_type})`);
      }

      return {
        threadId,
        notificationsSent: authorizers.length + 1, // +1 por la del empleado
        authorizers: authorizers.map(a => ({
          id: a.user_id,
          name: `${a.first_name} ${a.last_name}`,
          type: a.authorizer_type
        }))
      };

    } catch (error) {
      console.error('❌ [UNIFIED] Error sending via unified system:', error);
      throw error;
    }
  }

  /**
   * 🆕 NUEVO: Notificar al empleado en tiempo real que su solicitud fue enviada
   * El empleado puede ver el estado en su dashboard y APK mientras espera
   */
  async _notifyEmployeeRequestSent({
    employeeData,
    authorizationToken,
    shiftData,
    lateMinutes,
    authorizers,
    companyId
  }) {
    try {
      const employeeName = `${employeeData.first_name} ${employeeData.last_name}`;
      const supervisorNames = authorizers
        .filter(a => !a.is_rrhh)
        .map(a => `${a.first_name} ${a.last_name}`)
        .join(', ');

      const notificationData = {
        type: 'authorization_request_sent',
        authorizationToken,
        employee: {
          userId: employeeData.user_id,
          name: employeeName,
          legajo: employeeData.legajo
        },
        shift: {
          name: shiftData.name,
          startTime: shiftData.startTime
        },
        lateMinutes,
        supervisors: supervisorNames,
        totalAuthorizers: authorizers.length,
        timestamp: new Date().toISOString(),
        message: `Tu solicitud ha sido enviada a ${authorizers.length} supervisor(es). Espera su respuesta.`,
        estimatedWaitMinutes: 5 // Estimado de espera
      };

      // 1️⃣ WebSocket al empleado
      websocket.sendToUser(employeeData.user_id, 'authorization_status', notificationData);
      console.log(`📱 [EMPLOYEE-NOTIFY] WebSocket sent to ${employeeName}`);

      // 2️⃣ Email de confirmación (ya existía, pero llamamos aquí para asegurar)
      await this.sendEmployeeNotificationEmail({
        employeeData,
        lateMinutes,
        shiftData,
        authorizationToken,
        companyId  // 🔥 NCE: Pasar companyId
      });

      return { success: true };

    } catch (error) {
      console.error('❌ [EMPLOYEE-NOTIFY] Error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Actualizar lista de autorizadores notificados en BD
   */
  async _updateNotifiedAuthorizers(attendanceId, userIds) {
    try {
      await sequelize.query(
        `UPDATE attendances
         SET notified_authorizers = $1,
             authorization_requested_at = NOW()
         WHERE id = $2`,
        {
          bind: [JSON.stringify(userIds), attendanceId],
          type: QueryTypes.UPDATE
        }
      );
      console.log(`✅ Updated notified authorizers for attendance ${attendanceId}`);
    } catch (error) {
      console.error('❌ Error updating notified authorizers:', error);
    }
  }

  /**
   * Construir HTML para email con botones de autorización
   * 🆕 INCLUYE bloque de escalación si escalationInfo está presente
   */
  _buildEmailHTML({ authorizerName, employeeName, employeeLegajo, departmentName, shiftName, shiftStartTime, lateMinutes, approveUrl, rejectUrl, currentTime, escalationInfo }) {
    // 🆕 Construir bloque de escalación si corresponde
    const escalationBlock = escalationInfo ? `
      <div class="escalation-box">
        <strong>🔼 ESCALACIÓN AUTOMÁTICA</strong><br><br>
        <strong>Supervisor directo NO DISPONIBLE:</strong><br>
        ${escalationInfo.fromSupervisor || 'N/A'}<br><br>
        <strong>Motivo:</strong> ${this._translateEscalationReason(escalationInfo.reason)}<br><br>
        ${escalationInfo.toSupervisor ? `<strong>Escalado a:</strong><br>${escalationInfo.toSupervisor}` : '<strong>Escalado directamente a RRHH</strong>'}
      </div>
    ` : '';

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Autorización de Llegada Tardía</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f5;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 30px 20px;
    }
    .greeting {
      font-size: 16px;
      color: #333;
      margin-bottom: 20px;
    }
    .alert-box {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin-bottom: 20px;
      border-radius: 4px;
    }
    .alert-box strong {
      color: #856404;
    }
    .escalation-box {
      background-color: #ffe0e0;
      border-left: 4px solid #ff5722;
      padding: 15px;
      margin-bottom: 20px;
      border-radius: 4px;
      font-size: 14px;
      line-height: 1.6;
    }
    .escalation-box strong {
      color: #c62828;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    .info-table td {
      padding: 10px;
      border-bottom: 1px solid #eee;
    }
    .info-table td:first-child {
      font-weight: 600;
      color: #666;
      width: 40%;
    }
    .info-table td:last-child {
      color: #333;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
      display: flex;
      gap: 15px;
      justify-content: center;
    }
    .btn {
      display: inline-block;
      padding: 14px 32px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
      transition: all 0.3s ease;
      flex: 1;
      max-width: 200px;
    }
    .btn-approve {
      background-color: #28a745;
      color: white;
    }
    .btn-approve:hover {
      background-color: #218838;
      box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
    }
    .btn-reject {
      background-color: #dc3545;
      color: white;
    }
    .btn-reject:hover {
      background-color: #c82333;
      box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
    }
    .footer {
      background-color: #f8f9fa;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
    .footer p {
      margin: 5px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Autorización de Llegada Tardía</h1>
    </div>

    <div class="content">
      <p class="greeting">Hola <strong>${authorizerName}</strong>,</p>

      ${escalationBlock}

      <div class="alert-box">
        <strong>Se requiere tu autorización para un ingreso fuera de horario</strong>
      </div>

      <p>Un empleado ha marcado ingreso fuera del horario de tolerancia de su turno y requiere autorización para registrar su asistencia.</p>

      <table class="info-table">
        <tr>
          <td>👤 Empleado:</td>
          <td><strong>${employeeName}</strong></td>
        </tr>
        <tr>
          <td>🆔 Legajo:</td>
          <td>${employeeLegajo}</td>
        </tr>
        <tr>
          <td>🏢 Departamento:</td>
          <td>${departmentName}</td>
        </tr>
        <tr>
          <td>🕐 Turno:</td>
          <td>${shiftName} (inicio: ${shiftStartTime})</td>
        </tr>
        <tr>
          <td>⏰ Retraso:</td>
          <td><strong style="color: #dc3545;">${lateMinutes} minutos</strong></td>
        </tr>
        <tr>
          <td>📅 Hora actual:</td>
          <td>${currentTime}</td>
        </tr>
      </table>

      <div class="button-container">
        <a href="${approveUrl}" class="btn btn-approve">✅ AUTORIZAR</a>
        <a href="${rejectUrl}" class="btn btn-reject">❌ RECHAZAR</a>
      </div>

      <p style="font-size: 13px; color: #666; text-align: center; margin-top: 20px;">
        Al hacer clic en uno de los botones, se registrará tu decisión con fecha y hora.
      </p>
    </div>

    <div class="footer">
      <p><strong>Sistema de Asistencia Biométrico APONNT</strong></p>
      <p>Esta es una notificación automática del sistema</p>
      <p>© 2025 - Todos los derechos reservados</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Construir mensaje para WhatsApp
   */
  _buildWhatsAppMessage({ authorizerName, employeeName, employeeLegajo, departmentName, shiftName, shiftStartTime, lateMinutes, approveUrl, rejectUrl }) {
    return `⚠️ *AUTORIZACIÓN REQUERIDA - LLEGADA TARDÍA*

Hola ${authorizerName},

Se requiere tu autorización para un ingreso fuera de horario.

👤 *Empleado:* ${employeeName}
🆔 *Legajo:* ${employeeLegajo}
🏢 *Departamento:* ${departmentName}
🕐 *Turno:* ${shiftName} (inicio: ${shiftStartTime})
⏰ *Retraso:* ${lateMinutes} minutos

*Para autorizar o rechazar, haz clic en los siguientes enlaces:*

✅ Autorizar: ${approveUrl}
❌ Rechazar: ${rejectUrl}

_Sistema de Asistencia Biométrico APONNT_`;
  }

  /**
   * Formatear número de teléfono para WhatsApp (Argentina)
   */
  _formatPhoneNumber(phoneNumber) {
    if (!phoneNumber) return '';

    let formattedNumber = phoneNumber.replace(/\D/g, '');

    if (formattedNumber.startsWith('0')) {
      formattedNumber = formattedNumber.substring(1);
    }

    if (!formattedNumber.startsWith('54')) {
      formattedNumber = '54' + formattedNumber;
    }

    return formattedNumber;
  }

  /**
   * Notificar resultado de autorización (aprobado/rechazado)
   * Envía WebSocket al kiosco y a administradores
   * NUEVO: Crea ventana de autorización de 5 minutos si aprobado
   * 🔥 NCE: Agregado companyId para notificaciones via NCE
   */
  async notifyAuthorizationResult({
    attendanceId,
    employeeData,
    authorizerData,
    status,
    notes = '',
    companyId  // 🔥 NCE: Nuevo parámetro
  }) {
    try {
      // 🎯 NUEVO: Si aprobado, crear ventana de autorización de 5 minutos
      let authorizationWindow = null;
      if (status === 'approved') {
        const windowMinutes = parseInt(process.env.AUTHORIZATION_WINDOW_MINUTES) || 5;
        const validUntil = new Date(Date.now() + windowMinutes * 60 * 1000);

        await sequelize.query(
          `UPDATE late_arrival_authorizations
           SET status = 'approved',
               authorized_by = $1,
               authorized_at = NOW(),
               authorization_valid_until = $2,
               notes = $3
           WHERE employee_id = $4
             AND status = 'pending'
             AND DATE(requested_at) = CURRENT_DATE`,
          {
            bind: [authorizerData.user_id, validUntil, notes, employeeData.user_id],
            type: QueryTypes.UPDATE
          }
        );

        authorizationWindow = {
          validUntil: validUntil.toISOString(),
          windowMinutes
        };

        console.log(`✅ [AUTH] Authorization window created: ${windowMinutes} min (until ${validUntil.toLocaleTimeString()})`);
      } else {
        // Rechazado: marcar como rechazado
        await sequelize.query(
          `UPDATE late_arrival_authorizations
           SET status = 'rejected',
               authorized_by = $1,
               authorized_at = NOW(),
               notes = $2
           WHERE employee_id = $3
             AND status = 'pending'
             AND DATE(requested_at) = CURRENT_DATE`,
          {
            bind: [authorizerData.user_id, notes, employeeData.user_id],
            type: QueryTypes.UPDATE
          }
        );
      }

      const resultData = {
        type: 'authorization_result',
        attendanceId,
        status, // 'approved' or 'rejected'
        employee: {
          userId: employeeData.user_id,
          name: `${employeeData.first_name} ${employeeData.last_name}`,
          legajo: employeeData.legajo
        },
        authorizer: {
          userId: authorizerData.user_id,
          name: `${authorizerData.first_name} ${authorizerData.last_name}`
        },
        authorizationWindow, // 🆕 Incluir ventana si aprobado
        notes,
        timestamp: new Date().toISOString()
      };

      // Enviar al empleado (si está conectado en kiosco)
      websocket.sendToUser(employeeData.user_id, 'authorization_result', resultData);

      // Enviar a administradores y supervisores
      websocket.sendToSupervisors('late_arrival_decision', resultData);

      // 🆕 ENVIAR EMAIL AL EMPLEADO con el resultado
      await this._sendEmployeeResultEmail({
        employeeData,
        authorizerData,
        status,
        authorizationWindow,
        notes,
        companyId  // 🔥 NCE: Pasar companyId
      });

      // 🆕 ENVIAR VÍA SISTEMA CENTRAL DE NOTIFICACIONES
      if (notificationUnifiedService) {
        try {
          const employeeName = `${employeeData.first_name} ${employeeData.last_name}`;
          const authorizerName = `${authorizerData.first_name} ${authorizerData.last_name}`;
          const isApproved = status === 'approved';

          // Notificación al empleado (resultado)
          await notificationUnifiedService.send({
            companyId: employeeData.company_id || authorizerData.company_id,
            originType: 'supervisor',
            originId: authorizerData.user_id,
            originName: authorizerName,
            originRole: authorizerData.role,
            recipientType: 'user',
            recipientId: employeeData.user_id,
            recipientName: employeeName,
            category: 'approval',
            module: 'attendance',
            notificationType: isApproved ? 'late_arrival_approved' : 'late_arrival_rejected',
            priority: isApproved ? 'medium' : 'high',
            title: isApproved
              ? `✅ Autorización APROBADA por ${authorizerName}`
              : `❌ Autorización RECHAZADA por ${authorizerName}`,
            message: isApproved
              ? `Tu solicitud de ingreso tardío ha sido APROBADA. Tienes ${authorizationWindow?.windowMinutes || 5} minutos para completar tu fichaje en el kiosk.`
              : `Tu solicitud de ingreso tardío ha sido RECHAZADA.${notes ? ` Motivo: ${notes}` : ''} Contacta a tu supervisor o RRHH.`,
            metadata: {
              attendance_id: attendanceId,
              status,
              authorizer_id: authorizerData.user_id,
              authorizer_name: authorizerName,
              authorization_window: authorizationWindow,
              notes
            },
            relatedEntityType: 'attendance',
            relatedEntityId: attendanceId?.toString(),
            requiresAction: isApproved, // Si aprobado, requiere acción (ir al kiosk)
            actionType: isApproved ? 'acknowledge' : null,
            channels: ['app', 'websocket', 'email']
          });

          // Notificación a RRHH (registro de la decisión)
          await notificationUnifiedService.send({
            companyId: employeeData.company_id || authorizerData.company_id,
            originType: 'supervisor',
            originId: authorizerData.user_id,
            originName: authorizerName,
            originRole: authorizerData.role,
            recipientType: 'role',
            recipientRole: 'admin',
            recipientHierarchyLevel: 3,
            category: 'info',
            module: 'attendance',
            notificationType: 'late_arrival_decision_logged',
            priority: 'low',
            title: `📝 Decisión registrada: ${employeeName} - ${isApproved ? 'APROBADO' : 'RECHAZADO'}`,
            message: `${authorizerName} ${isApproved ? 'aprobó' : 'rechazó'} la solicitud de ingreso tardío de ${employeeName}.${notes ? ` Notas: ${notes}` : ''}`,
            metadata: {
              attendance_id: attendanceId,
              employee_id: employeeData.user_id,
              employee_name: employeeName,
              authorizer_id: authorizerData.user_id,
              authorizer_name: authorizerName,
              status,
              notes,
              decision_time: new Date().toISOString()
            },
            relatedEntityType: 'attendance',
            relatedEntityId: attendanceId?.toString(),
            requiresAction: false,
            channels: ['app']
          });

          console.log(`✅ [UNIFIED] Authorization result notifications sent`);
        } catch (unifiedError) {
          console.error('⚠️ [UNIFIED] Error sending result notification (non-blocking):', unifiedError.message);
        }
      }

      console.log(`✅ Authorization result sent: ${status} by ${authorizerData.first_name} ${authorizerData.last_name}`);

      return { success: true, authorizationWindow };

    } catch (error) {
      console.error('❌ Error notifying authorization result:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 🆕 Verificar si el empleado tiene una ventana de autorización ACTIVA
   * Usado por el kiosk para permitir ingreso sin nueva solicitud
   */
  async checkActiveAuthorizationWindow(employeeId, companyId) {
    try {
      const result = await sequelize.query(
        `SELECT
           id,
           authorization_valid_until,
           authorized_by,
           authorized_at
         FROM late_arrival_authorizations
         WHERE employee_id = $1
           AND company_id = $2
           AND status = 'approved'
           AND authorization_valid_until > NOW()
           AND DATE(requested_at) = CURRENT_DATE
         ORDER BY authorized_at DESC
         LIMIT 1`,
        {
          bind: [employeeId, companyId],
          type: QueryTypes.SELECT,
          plain: true
        }
      );

      if (result) {
        const validUntil = new Date(result.authorization_valid_until);
        const remainingMinutes = Math.ceil((validUntil - new Date()) / 60000);

        console.log(`✅ [AUTH-WINDOW] Active window found for employee ${employeeId}: ${remainingMinutes} min remaining`);

        return {
          hasActiveWindow: true,
          validUntil: validUntil.toISOString(),
          remainingMinutes,
          authorizedAt: result.authorized_at,
          authorizedBy: result.authorized_by
        };
      }

      return { hasActiveWindow: false };

    } catch (error) {
      console.error('❌ Error checking authorization window:', error);
      return { hasActiveWindow: false, error: error.message };
    }
  }

  /**
   * 🆕 Enviar email al EMPLEADO cuando solicita autorización
   * Le informa que debe esperar y puede retirarse del kiosk
   * 🔥 MIGRADO A NCE (Notification Central Exchange)
   */
  async sendEmployeeNotificationEmail({
    employeeData,
    lateMinutes,
    shiftData,
    authorizationToken,
    companyId  // 🔥 NCE: Nuevo parámetro requerido
  }) {
    try {
      if (!employeeData.email) {
        console.log('⚠️ Cannot send employee email: no email address');
        return { success: false, error: 'Employee has no email' };
      }

      const windowMinutes = parseInt(process.env.AUTHORIZATION_WINDOW_MINUTES) || 5;

      const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Solicitud de Autorización Enviada</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; }
    .header { background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%); color: white; padding: 25px; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; }
    .content { padding: 25px; }
    .info-box { background: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; margin: 15px 0; border-radius: 4px; }
    .info-box strong { color: #e65100; }
    .action-box { background: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; margin: 15px 0; border-radius: 4px; }
    .action-box strong { color: #2e7d32; }
    .warning-box { background: #fce4ec; border-left: 4px solid #e91e63; padding: 15px; margin: 15px 0; border-radius: 4px; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    td { padding: 8px; border-bottom: 1px solid #eee; }
    td:first-child { font-weight: 600; color: #666; width: 40%; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏳ Solicitud de Autorización Enviada</h1>
    </div>
    <div class="content">
      <p>Hola <strong>${employeeData.first_name}</strong>,</p>

      <div class="info-box">
        <strong>Tu solicitud de ingreso ha sido enviada a tus supervisores</strong>
      </div>

      <table>
        <tr><td>📅 Turno:</td><td>${shiftData.name} (${shiftData.startTime})</td></tr>
        <tr><td>⏰ Minutos tarde:</td><td><strong style="color:#e65100">${lateMinutes} minutos</strong></td></tr>
        <tr><td>🕐 Hora actual:</td><td>${new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}</td></tr>
      </table>

      <div class="action-box">
        <strong>✅ Ya puedes retirarte del kiosk</strong><br>
        El kiosk ya está liberado para que otros empleados puedan fichar.
        Te notificaremos por email cuando tu supervisor responda.
      </div>

      <div class="warning-box">
        <strong>⚠️ Importante:</strong><br>
        Una vez aprobada, tendrás <strong>${windowMinutes} minutos</strong> para volver al kiosk y completar tu fichaje.
        Pasado ese tiempo, deberás solicitar autorización nuevamente.
      </div>

      <p style="font-size: 13px; color: #666; text-align: center;">
        Recibirás otro email cuando tu solicitud sea aprobada o rechazada.
      </p>
    </div>
    <div class="footer">
      <p><strong>Sistema de Asistencia Biométrico APONNT</strong></p>
      <p>Token: ${authorizationToken.substring(0, 8)}...</p>
    </div>
  </div>
</body>
</html>`;

      // 🔥 REEMPLAZO: Email directo → NCE (Central Telefónica)
      const nceResult = await NCE.send({
        // CONTEXTO
        companyId: companyId,
        module: 'attendance',
        originType: 'late_arrival_authorization_confirmation',
        originId: authorizationToken,

        // WORKFLOW (informativo, no requiere acción)
        workflowKey: 'attendance.late_arrival_processed',

        // DESTINATARIO (empleado que solicitó)
        recipientType: 'user',
        recipientId: employeeData.user_id,
        recipientEmail: employeeData.email,

        // CONTENIDO
        title: `⏳ Solicitud de Autorización Enviada - ${lateMinutes} min de retraso`,
        message: `Tu solicitud de ingreso ha sido enviada a tus supervisores. Recibirás una notificación cuando sea procesada.`,
        metadata: {
          employeeName: `${employeeData.first_name} ${employeeData.last_name}`,
          lateMinutes,
          shiftName: shiftData.name,
          windowMinutes,
          authorizationToken,
          canLeaveKiosk: true  // Puede retirarse del kiosk
        },

        // COMPORTAMIENTO (informativo)
        priority: 'medium',
        requiresAction: false,

        // CANALES
        channels: ['push', 'inbox'],  // Push + inbox (no email masivo al empleado)
      });

      console.log(`✅ [NCE] Employee late arrival confirmation sent via NCE to ${employeeData.email}`);
      return { success: nceResult.success, messageId: nceResult.notificationId };

    } catch (error) {
      console.error('❌ Error sending employee notification email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 🆕 Enviar email al empleado con el RESULTADO de la autorización
   * 🔥 MIGRADO A NCE (Notification Central Exchange)
   */
  async _sendEmployeeResultEmail({
    employeeData,
    authorizerData,
    status,
    authorizationWindow,
    notes,
    companyId  // 🔥 NCE: Nuevo parámetro requerido
  }) {
    try {
      if (!employeeData.email) {
        return { success: false };
      }

      const isApproved = status === 'approved';
      const windowMinutes = authorizationWindow?.windowMinutes || 5;

      const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; }
    .header { background: linear-gradient(135deg, ${isApproved ? '#4caf50, #2e7d32' : '#f44336, #c62828'}); color: white; padding: 25px; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; }
    .content { padding: 25px; }
    .result-box { background: ${isApproved ? '#e8f5e9' : '#ffebee'}; border-left: 4px solid ${isApproved ? '#4caf50' : '#f44336'}; padding: 15px; margin: 15px 0; border-radius: 4px; }
    .result-box strong { color: ${isApproved ? '#2e7d32' : '#c62828'}; }
    .action-box { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 15px 0; border-radius: 4px; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${isApproved ? '✅ Autorización APROBADA' : '❌ Autorización RECHAZADA'}</h1>
    </div>
    <div class="content">
      <p>Hola <strong>${employeeData.first_name}</strong>,</p>

      <div class="result-box">
        <strong>${isApproved
          ? `Tu solicitud de ingreso ha sido APROBADA por ${authorizerData.first_name} ${authorizerData.last_name}`
          : `Tu solicitud de ingreso ha sido RECHAZADA por ${authorizerData.first_name} ${authorizerData.last_name}`
        }</strong>
        ${notes ? `<br><br><em>Motivo: ${notes}</em>` : ''}
      </div>

      ${isApproved ? `
      <div class="action-box">
        <strong>🏃 Dirígete al kiosk AHORA</strong><br>
        Tienes <strong>${windowMinutes} minutos</strong> para completar tu fichaje.<br>
        <strong>Ventana válida hasta: ${new Date(authorizationWindow.validUntil).toLocaleTimeString('es-AR')}</strong>
      </div>
      ` : `
      <p>Por favor contacta a tu supervisor o al departamento de RRHH si consideras que esto es un error.</p>
      `}
    </div>
    <div class="footer">
      <p><strong>Sistema de Asistencia Biométrico APONNT</strong></p>
      <p>${new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}</p>
    </div>
  </div>
</body>
</html>`;

      // 🔥 REEMPLAZO: Email directo → NCE (Central Telefónica)
      const nceResult = await NCE.send({
        // CONTEXTO
        companyId: companyId,
        module: 'attendance',
        originType: 'late_arrival_authorization_result',
        originId: authorizationWindow?.authorizationToken || `result-${employeeData.user_id}`,

        // WORKFLOW (resultado de aprobación/rechazo)
        workflowKey: isApproved ? 'attendance.late_arrival_approved' : 'attendance.late_arrival_rejected',

        // DESTINATARIO (empleado)
        recipientType: 'user',
        recipientId: employeeData.user_id,
        recipientEmail: employeeData.email,

        // CONTENIDO
        title: `${isApproved ? '✅ APROBADA' : '❌ RECHAZADA'} - Tu solicitud de autorización`,
        message: isApproved
          ? `Tu solicitud de ingreso ha sido APROBADA por ${authorizerData.first_name} ${authorizerData.last_name}. Tienes ${windowMinutes} minutos para completar tu fichaje.`
          : `Tu solicitud de ingreso ha sido RECHAZADA por ${authorizerData.first_name} ${authorizerData.last_name}.${notes ? ` Motivo: ${notes}` : ''}`,
        metadata: {
          employeeName: `${employeeData.first_name} ${employeeData.last_name}`,
          authorizerName: `${authorizerData.first_name} ${authorizerData.last_name}`,
          status,
          isApproved,
          windowMinutes,
          notes,
          authorizationWindow
        },

        // COMPORTAMIENTO
        priority: 'critical',  // Crítico porque afecta el ingreso del empleado
        requiresAction: false,  // Informativo, no requiere respuesta

        // CANALES
        channels: ['email', 'push', 'websocket'],  // Multi-canal para asegurar que el empleado lo vea
      });

      console.log(`✅ [NCE] Employee authorization result (${status}) sent via NCE to ${employeeData.email}`);
      return { success: nceResult.success, messageId: nceResult.notificationId };

    } catch (error) {
      console.error('❌ Error sending employee result email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Formatear número de teléfono para WhatsApp (Argentina)
   */
  _formatPhoneNumber(phoneNumber) {
    if (!phoneNumber) return '';

    let formattedNumber = phoneNumber.replace(/\D/g, '');

    if (formattedNumber.startsWith('0')) {
      formattedNumber = formattedNumber.substring(1);
    }

    if (!formattedNumber.startsWith('54')) {
      formattedNumber = '54' + formattedNumber;
    }

    return formattedNumber;
  }

  /**
   * 🆕 Traducir razón de escalación a texto legible en español
   */
  _translateEscalationReason(reason) {
    if (!reason) return 'No especificado';

    // Manejar razón de turno diferente (formato: different_shift:NombreTurno)
    if (reason.startsWith('different_shift:')) {
      const shiftName = reason.split(':')[1] || 'otro turno';
      return `Tiene turno diferente (${shiftName})`;
    }

    const translations = {
      'on_vacation': 'Está de vacaciones',
      'on_sick_leave': 'Está con licencia médica',
      'absent_today': 'No se encuentra trabajando hoy (sin asistencia registrada)',
      'supervisor_not_found': 'Supervisor no encontrado en el sistema',
      'supervisor_no_shift': 'Supervisor sin turno asignado',
      'different_shift': 'Tiene turno diferente al empleado',
      'error_checking': 'Error al verificar disponibilidad'
    };

    return translations[reason] || reason;
  }
}

module.exports = new LateArrivalAuthorizationService();
