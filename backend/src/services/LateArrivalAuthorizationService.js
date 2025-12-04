/**
 * Servicio de Autorización de Llegadas Tardías
 * Sistema jerárquico multi-canal (Email, WhatsApp, WebSocket)
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { sequelize } = require('../config/database-postgresql');
const { QueryTypes } = require('sequelize');
const websocket = require('../config/websocket');
const nodemailer = require('nodemailer');

class LateArrivalAuthorizationService {
  constructor() {
    // Configuración WhatsApp Business API
    this.whatsappApiUrl = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v17.0';
    this.whatsappToken = process.env.WHATSAPP_API_TOKEN;
    this.whatsappPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    // Configuración Email (nodemailer)
    this.emailTransporter = null;
    this._initializeEmailTransporter();

    // URL base del servidor para links de autorización
    this.serverBaseUrl = process.env.SERVER_BASE_URL || 'http://localhost:3001';
  }

  /**
   * Inicializar transporter de email
   */
  _initializeEmailTransporter() {
    try {
      const emailConfig = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      };

      if (emailConfig.auth.user && emailConfig.auth.pass) {
        this.emailTransporter = nodemailer.createTransport(emailConfig);
        console.log('✅ Email transporter initialized');
      } else {
        console.log('⚠️ Email credentials not configured, email notifications disabled');
      }
    } catch (error) {
      console.error('❌ Error initializing email transporter:', error.message);
    }
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
            $2::integer AS branch_id,
            $3::integer AS department_id,
            $4::text AS sector,
            $5::uuid AS shift_id
        ),
        authorizer_scores AS (
          SELECT
            u.user_id,
            u.first_name,
            u.last_name,
            u.nombre,
            u.apellido,
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
          LEFT JOIN departments d ON u.department_id = d.department_id
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
          COALESCE(first_name, nombre) AS first_name,
          COALESCE(last_name, apellido) AS last_name,
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
          COALESCE(u.first_name, u.nombre) AS first_name,
          COALESCE(u.last_name, u.apellido) AS last_name,
          u.email,
          u.whatsapp_number,
          u.notification_preference_late_arrivals,
          u.authorized_departments,
          u.role,
          d.name AS department_name,
          CASE WHEN LOWER(d.name) LIKE '%rrhh%' OR LOWER(d.name) LIKE '%recursos humanos%'
               THEN true ELSE false END AS is_rrhh
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.department_id
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
          first_name ASC
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
   * 🔍 Buscar datos completos del empleado para lookup jerárquico
   */
  async _getEmployeeHierarchyContext(userId, companyId) {
    try {
      const query = `
        SELECT
          u.user_id,
          u.department_id,
          u.default_branch_id AS branch_id,
          d.name AS department_name,
          b.name AS branch_name,
          usa.shift_id,
          usa.sector,
          usa.assigned_phase,
          s.name AS shift_name
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.department_id
        LEFT JOIN branches b ON u.default_branch_id = b.branch_id
        LEFT JOIN user_shift_assignments usa ON u.user_id = usa.user_id AND usa.is_active = true
        LEFT JOIN shifts s ON usa.shift_id = s.id
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
   * ACTUALIZADO: Usa lookup jerárquico (branch/sector/shift) + RRHH automático
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

      // 1. Obtener contexto jerárquico completo del empleado
      const employeeContext = await this._getEmployeeHierarchyContext(
        employeeData.user_id,
        companyId
      );

      console.log(`📋 [AUTH-REQUEST] Employee hierarchy context:`);
      console.log(`   Branch: ${employeeContext.branch_name || 'N/A'} (ID: ${employeeContext.branch_id || 'N/A'})`);
      console.log(`   Department: ${employeeContext.department_name || employeeData.department_name || 'N/A'}`);
      console.log(`   Sector: ${employeeContext.sector || 'N/A'}`);
      console.log(`   Shift: ${employeeContext.shift_name || 'N/A'} (ID: ${employeeContext.shift_id || 'N/A'})`);

      // 2. Buscar autorizadores con lookup JERÁRQUICO + RRHH
      const authorizers = await this.findAuthorizersHierarchical({
        companyId,
        branchId: employeeContext.branch_id || employeeData.branch_id,
        departmentId: employeeContext.department_id || employeeData.department_id,
        sector: employeeContext.sector,
        shiftId: employeeContext.shift_id,
        includeRRHH: true  // SIEMPRE incluir RRHH
      });

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
              lateMinutes
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
              lateMinutes
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

      return {
        success: notificationResults.some(r => r.result.success || r.result.email?.success || r.result.whatsapp?.success),
        notificationResults,
        notifiedCount: notifiedUserIds.length,
        authorizationToken
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
   */
  async _sendEmailNotification({ authorizer, employeeData, authorizationToken, shiftData, lateMinutes }) {
    try {
      if (!this.emailTransporter) {
        return { success: false, error: 'Email transporter not configured' };
      }

      const approveUrl = `${this.serverBaseUrl}/api/v1/authorization/approve/${authorizationToken}`;
      const rejectUrl = `${this.serverBaseUrl}/api/v1/authorization/reject/${authorizationToken}`;

      const htmlContent = this._buildEmailHTML({
        authorizerName: authorizer.first_name,
        employeeName: `${employeeData.first_name} ${employeeData.last_name}`,
        employeeLegajo: employeeData.legajo,
        departmentName: employeeData.department_name || 'N/A',
        shiftName: shiftData.name,
        shiftStartTime: shiftData.startTime,
        lateMinutes,
        approveUrl,
        rejectUrl,
        currentTime: new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })
      });

      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: authorizer.email,
        subject: `⚠️ Autorización Requerida - Llegada Tardía ${employeeData.first_name} ${employeeData.last_name}`,
        html: htmlContent
      };

      const info = await this.emailTransporter.sendMail(mailOptions);

      console.log(`✅ Email sent to ${authorizer.email}: ${info.messageId}`);

      return {
        success: true,
        messageId: info.messageId,
        recipient: authorizer.email
      };

    } catch (error) {
      console.error('❌ Error sending email:', error);
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

      // Email fallback
      if (company.fallback_notification_email && this.emailTransporter) {
        const approveUrl = `${this.serverBaseUrl}/api/v1/authorization/approve/${authorizationToken}`;
        const rejectUrl = `${this.serverBaseUrl}/api/v1/authorization/reject/${authorizationToken}`;

        const htmlContent = this._buildEmailHTML({
          authorizerName: 'RRHH',
          employeeName: `${employeeData.first_name} ${employeeData.last_name}`,
          employeeLegajo: employeeData.legajo,
          departmentName: employeeData.department_name || 'N/A',
          shiftName: shiftData.name,
          shiftStartTime: shiftData.startTime,
          lateMinutes,
          approveUrl,
          rejectUrl,
          currentTime: new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })
        });

        const mailOptions = {
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: company.fallback_notification_email,
          subject: `⚠️ [FALLBACK] Autorización Requerida - Llegada Tardía ${employeeData.first_name} ${employeeData.last_name}`,
          html: htmlContent
        };

        const info = await this.emailTransporter.sendMail(mailOptions);
        results.push({ type: 'email', success: true, messageId: info.messageId });
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
   */
  _buildEmailHTML({ authorizerName, employeeName, employeeLegajo, departmentName, shiftName, shiftStartTime, lateMinutes, approveUrl, rejectUrl, currentTime }) {
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
   */
  async notifyAuthorizationResult({
    attendanceId,
    employeeData,
    authorizerData,
    status,
    notes = ''
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
        notes
      });

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
   */
  async sendEmployeeNotificationEmail({
    employeeData,
    lateMinutes,
    shiftData,
    authorizationToken
  }) {
    try {
      if (!this.emailTransporter || !employeeData.email) {
        console.log('⚠️ Cannot send employee email: no transporter or email address');
        return { success: false, error: 'Email not configured or employee has no email' };
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

      await this.emailTransporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: employeeData.email,
        subject: `⏳ Solicitud de Autorización Enviada - ${lateMinutes} min de retraso`,
        html: htmlContent
      });

      console.log(`✅ [EMPLOYEE-EMAIL] Notification sent to ${employeeData.email}`);
      return { success: true };

    } catch (error) {
      console.error('❌ Error sending employee notification email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 🆕 Enviar email al empleado con el RESULTADO de la autorización
   */
  async _sendEmployeeResultEmail({
    employeeData,
    authorizerData,
    status,
    authorizationWindow,
    notes
  }) {
    try {
      if (!this.emailTransporter || !employeeData.email) {
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

      await this.emailTransporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: employeeData.email,
        subject: `${isApproved ? '✅ APROBADA' : '❌ RECHAZADA'} - Tu solicitud de autorización`,
        html: htmlContent
      });

      console.log(`✅ [EMPLOYEE-RESULT-EMAIL] ${status} notification sent to ${employeeData.email}`);
      return { success: true };

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
}

module.exports = new LateArrivalAuthorizationService();
