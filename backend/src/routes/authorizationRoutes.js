/**
 * Rutas de Autorización de Llegadas Tardías
 * Endpoints para aprobar/rechazar autorizaciones vía token
 */

const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database-postgresql');
const { QueryTypes } = require('sequelize');
const authorizationService = require('../services/LateArrivalAuthorizationService');

/**
 * GET /api/v1/authorization/status/:token
 * Consultar estado de una solicitud de autorización (polling desde APK)
 */
router.get('/status/:token', async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Authorization token is required'
      });
    }

    // Buscar registro de asistencia con este token
    const attendance = await sequelize.query(
      `SELECT
        id,
        "UserId",
        authorization_status,
        authorized_by_user_id,
        authorized_at,
        authorization_notes,
        "checkInTime"
      FROM attendances
      WHERE authorization_token = $1`,
      {
        bind: [token],
        type: QueryTypes.SELECT,
        plain: true
      }
    );

    if (!attendance) {
      return res.status(404).json({
        success: false,
        error: 'Authorization request not found'
      });
    }

    // Si todavía está pendiente
    if (attendance.authorization_status === 'pending') {
      return res.json({
        success: true,
        status: 'pending',
        message: 'Waiting for authorization'
      });
    }

    // Si fue aprobado o rechazado
    let authorizerName = 'Sistema';
    if (attendance.authorized_by_user_id) {
      const authorizer = await sequelize.query(
        `SELECT first_name, last_name FROM users WHERE user_id = $1`,
        {
          bind: [attendance.authorized_by_user_id],
          type: QueryTypes.SELECT,
          plain: true
        }
      );
      if (authorizer) {
        authorizerName = `${authorizer.first_name} ${authorizer.last_name}`;
      }
    }

    return res.json({
      success: true,
      status: attendance.authorization_status,
      authorizedBy: authorizerName,
      authorizedAt: attendance.authorized_at,
      notes: attendance.authorization_notes,
      checkInTime: attendance.checkInTime
    });

  } catch (error) {
    console.error('❌ Error checking authorization status:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/v1/authorization/approve/:token
 * Aprobar una llegada tardía
 */
router.post('/approve/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { notes = '', authorizerId } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Authorization token is required'
      });
    }

    // Buscar registro de asistencia con este token
    const attendance = await sequelize.query(
      `SELECT
        id,
        "UserId",
        authorization_status,
        company_id
      FROM attendances
      WHERE authorization_token = $1`,
      {
        bind: [token],
        type: QueryTypes.SELECT,
        plain: true
      }
    );

    if (!attendance) {
      return res.status(404).json({
        success: false,
        error: 'Authorization request not found'
      });
    }

    if (attendance.authorization_status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Request already ${attendance.authorization_status}`,
        currentStatus: attendance.authorization_status
      });
    }

    // Obtener información del autorizador desde token o desde parámetro
    let authorizerData;
    if (authorizerId) {
      authorizerData = await sequelize.query(
        `SELECT user_id, first_name, last_name, email
         FROM users
         WHERE user_id = $1 AND can_authorize_late_arrivals = true`,
        {
          bind: [authorizerId],
          type: QueryTypes.SELECT,
          plain: true
        }
      );
    } else {
      // Si no viene authorizerId, intentar extraer del autorizador que abrió el link
      // Por ahora usamos el primer autorizador notificado
      const notifiedAuthorizers = await sequelize.query(
        `SELECT notified_authorizers FROM attendances WHERE id = $1`,
        {
          bind: [attendance.id],
          type: QueryTypes.SELECT,
          plain: true
        }
      );

      if (notifiedAuthorizers?.notified_authorizers?.length > 0) {
        const firstAuthorizerId = notifiedAuthorizers.notified_authorizers[0];
        authorizerData = await sequelize.query(
          `SELECT user_id, first_name, last_name, email
           FROM users
           WHERE user_id = $1`,
          {
            bind: [firstAuthorizerId],
            type: QueryTypes.SELECT,
            plain: true
          }
        );
      }
    }

    if (!authorizerData) {
      return res.status(400).json({
        success: false,
        error: 'Authorizer not found or not authorized'
      });
    }

    // Actualizar registro como APROBADO
    await sequelize.query(
      `UPDATE attendances
       SET authorization_status = 'approved',
           authorized_by_user_id = $1,
           authorized_at = NOW(),
           authorization_notes = $2
       WHERE id = $3`,
      {
        bind: [authorizerData.user_id, notes, attendance.id],
        type: QueryTypes.UPDATE
      }
    );

    // Obtener datos del empleado para notificación
    const employeeData = await sequelize.query(
      `SELECT
        u.user_id,
        u.first_name,
        u.last_name,
        u.legajo,
        d.name as department_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.user_id = $1`,
      {
        bind: [attendance.UserId],
        type: QueryTypes.SELECT,
        plain: true
      }
    );

    // Enviar notificación de resultado via WebSocket
    await authorizationService.notifyAuthorizationResult({
      attendanceId: attendance.id,
      employeeData,
      authorizerData,
      status: 'approved',
      notes,
      companyId: attendance.company_id  // 🔥 NCE: Pasar companyId
    });

    console.log(`✅ Late arrival APPROVED by ${authorizerData.first_name} ${authorizerData.last_name} for employee ${employeeData.first_name} ${employeeData.last_name}`);

    // Retornar página HTML de confirmación
    return res.send(`
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Autorización Aprobada</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 40px;
      max-width: 500px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      text-align: center;
    }
    .icon {
      font-size: 64px;
      margin-bottom: 20px;
    }
    h1 {
      color: #28a745;
      margin: 0 0 10px 0;
      font-size: 28px;
    }
    p {
      color: #666;
      font-size: 16px;
      line-height: 1.6;
      margin: 10px 0;
    }
    .employee-info {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
      text-align: left;
    }
    .employee-info strong {
      color: #333;
    }
    .timestamp {
      font-size: 12px;
      color: #999;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">✅</div>
    <h1>Autorización Aprobada</h1>
    <p>Has autorizado exitosamente la llegada tardía del empleado.</p>

    <div class="employee-info">
      <p><strong>Empleado:</strong> ${employeeData.first_name} ${employeeData.last_name}</p>
      <p><strong>Legajo:</strong> ${employeeData.legajo}</p>
      <p><strong>Departamento:</strong> ${employeeData.department_name || 'N/A'}</p>
      <p><strong>Autorizado por:</strong> ${authorizerData.first_name} ${authorizerData.last_name}</p>
      ${notes ? `<p><strong>Notas:</strong> ${notes}</p>` : ''}
    </div>

    <p style="font-size: 14px; color: #28a745; font-weight: 600;">
      El empleado ha sido notificado y su ingreso ha sido registrado.
    </p>

    <p class="timestamp">
      Autorizado el ${new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}
    </p>

    <p style="margin-top: 30px; font-size: 13px; color: #999;">
      Puedes cerrar esta ventana de forma segura.
    </p>
  </div>
</body>
</html>
    `);

  } catch (error) {
    console.error('❌ Error approving authorization:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/v1/authorization/reject/:token
 * Rechazar una llegada tardía
 */
router.post('/reject/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { notes = '', authorizerId } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Authorization token is required'
      });
    }

    // Buscar registro de asistencia con este token
    const attendance = await sequelize.query(
      `SELECT
        id,
        "UserId",
        authorization_status,
        company_id
      FROM attendances
      WHERE authorization_token = $1`,
      {
        bind: [token],
        type: QueryTypes.SELECT,
        plain: true
      }
    );

    if (!attendance) {
      return res.status(404).json({
        success: false,
        error: 'Authorization request not found'
      });
    }

    if (attendance.authorization_status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Request already ${attendance.authorization_status}`,
        currentStatus: attendance.authorization_status
      });
    }

    // Obtener información del autorizador
    let authorizerData;
    if (authorizerId) {
      authorizerData = await sequelize.query(
        `SELECT user_id, first_name, last_name, email
         FROM users
         WHERE user_id = $1 AND can_authorize_late_arrivals = true`,
        {
          bind: [authorizerId],
          type: QueryTypes.SELECT,
          plain: true
        }
      );
    } else {
      // Si no viene authorizerId, usar el primer autorizador notificado
      const notifiedAuthorizers = await sequelize.query(
        `SELECT notified_authorizers FROM attendances WHERE id = $1`,
        {
          bind: [attendance.id],
          type: QueryTypes.SELECT,
          plain: true
        }
      );

      if (notifiedAuthorizers?.notified_authorizers?.length > 0) {
        const firstAuthorizerId = notifiedAuthorizers.notified_authorizers[0];
        authorizerData = await sequelize.query(
          `SELECT user_id, first_name, last_name, email
           FROM users
           WHERE user_id = $1`,
          {
            bind: [firstAuthorizerId],
            type: QueryTypes.SELECT,
            plain: true
          }
        );
      }
    }

    if (!authorizerData) {
      return res.status(400).json({
        success: false,
        error: 'Authorizer not found or not authorized'
      });
    }

    // Actualizar registro como RECHAZADO
    await sequelize.query(
      `UPDATE attendances
       SET authorization_status = 'rejected',
           authorized_by_user_id = $1,
           authorized_at = NOW(),
           authorization_notes = $2
       WHERE id = $3`,
      {
        bind: [authorizerData.user_id, notes, attendance.id],
        type: QueryTypes.UPDATE
      }
    );

    // Obtener datos del empleado para notificación
    const employeeData = await sequelize.query(
      `SELECT
        u.user_id,
        u.first_name,
        u.last_name,
        u.legajo,
        d.name as department_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.user_id = $1`,
      {
        bind: [attendance.UserId],
        type: QueryTypes.SELECT,
        plain: true
      }
    );

    // Enviar notificación de resultado via WebSocket
    await authorizationService.notifyAuthorizationResult({
      attendanceId: attendance.id,
      employeeData,
      authorizerData,
      status: 'rejected',
      notes,
      companyId: attendance.company_id  // 🔥 NCE: Pasar companyId
    });

    console.log(`❌ Late arrival REJECTED by ${authorizerData.first_name} ${authorizerData.last_name} for employee ${employeeData.first_name} ${employeeData.last_name}`);

    // Retornar página HTML de confirmación
    return res.send(`
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Autorización Rechazada</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 40px;
      max-width: 500px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      text-align: center;
    }
    .icon {
      font-size: 64px;
      margin-bottom: 20px;
    }
    h1 {
      color: #dc3545;
      margin: 0 0 10px 0;
      font-size: 28px;
    }
    p {
      color: #666;
      font-size: 16px;
      line-height: 1.6;
      margin: 10px 0;
    }
    .employee-info {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
      text-align: left;
    }
    .employee-info strong {
      color: #333;
    }
    .timestamp {
      font-size: 12px;
      color: #999;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">❌</div>
    <h1>Autorización Rechazada</h1>
    <p>Has rechazado la llegada tardía del empleado.</p>

    <div class="employee-info">
      <p><strong>Empleado:</strong> ${employeeData.first_name} ${employeeData.last_name}</p>
      <p><strong>Legajo:</strong> ${employeeData.legajo}</p>
      <p><strong>Departamento:</strong> ${employeeData.department_name || 'N/A'}</p>
      <p><strong>Rechazado por:</strong> ${authorizerData.first_name} ${authorizerData.last_name}</p>
      ${notes ? `<p><strong>Motivo:</strong> ${notes}</p>` : ''}
    </div>

    <p style="font-size: 14px; color: #dc3545; font-weight: 600;">
      El empleado ha sido notificado y su ingreso NO ha sido registrado.
    </p>

    <p class="timestamp">
      Rechazado el ${new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}
    </p>

    <p style="margin-top: 30px; font-size: 13px; color: #999;">
      Puedes cerrar esta ventana de forma segura.
    </p>
  </div>
</body>
</html>
    `);

  } catch (error) {
    console.error('❌ Error rejecting authorization:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/v1/authorization/approve/:token
 * Versión GET para que funcione con links de email
 */
router.get('/approve/:token', async (req, res) => {
  // Convertir GET a POST internamente
  req.body = { notes: 'Aprobado vía email', authorizerId: null };
  return router.post('/approve/:token')(req, res);
});

/**
 * GET /api/v1/authorization/reject/:token
 * Versión GET para que funcione con links de email
 */
router.get('/reject/:token', async (req, res) => {
  // Convertir GET a POST internamente
  req.body = { notes: 'Rechazado vía email', authorizerId: null };
  return router.post('/reject/:token')(req, res);
});

/**
 * GET /api/v1/authorization/pending
 * Obtener autorizaciones pendientes para un kiosko (polling endpoint)
 * Query params: kioskId (optional), companyId (optional)
 */
router.get('/pending', async (req, res) => {
  try {
    const { kioskId, companyId } = req.query;

    // Buscar attendances con authorization_status = 'pending' del día actual
    const today = new Date().toISOString().split('T')[0];

    let whereClause = `WHERE a.authorization_status = 'pending' AND DATE(a."checkInTime") = $1`;
    const bindings = [today];
    let bindIndex = 2;

    if (companyId) {
      whereClause += ` AND u.company_id = $${bindIndex}`;
      bindings.push(parseInt(companyId));
      bindIndex++;
    }

    const pendingAuthorizations = await sequelize.query(
      `SELECT
        a.id,
        a."UserId" as "employeeId",
        a.authorization_token as token,
        a.authorization_status as status,
        a."checkInTime" as "requestedAt",
        u.first_name || ' ' || u.last_name as "employeeName",
        u.employee_id as legajo,
        u.department_id,
        EXTRACT(EPOCH FROM (a."checkInTime" - CURRENT_DATE)) / 60 as "lateMinutes"
      FROM attendances a
      JOIN users u ON a."UserId" = u.user_id
      ${whereClause}
      ORDER BY a."checkInTime" DESC
      LIMIT 50`,
      {
        bind: bindings,
        type: QueryTypes.SELECT
      }
    );

    return res.json({
      success: true,
      authorizations: pendingAuthorizations.map(auth => ({
        id: auth.id,
        attendanceId: auth.id,
        employeeId: auth.employeeId,
        employeeName: auth.employeeName || 'Empleado',
        legajo: auth.legajo,
        lateMinutes: Math.max(0, Math.round(auth.lateMinutes || 0)),
        requestedAt: auth.requestedAt,
        status: auth.status,
        token: auth.token
      }))
    });

  } catch (error) {
    console.error('❌ Error fetching pending authorizations:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      authorizations: []
    });
  }
});

/**
 * GET /api/v1/authorization/:authorizationId/status
 * Consultar estado de autorización por ID (formato esperado por Flutter APK)
 * Este endpoint es llamado por Flutter en authorization_polling_service.dart:329
 */
router.get('/:authorizationId/status', async (req, res) => {
  try {
    const { authorizationId } = req.params;

    if (!authorizationId) {
      return res.status(400).json({
        success: false,
        error: 'Authorization ID is required'
      });
    }

    // Buscar registro de asistencia con este token (authorizationId es el token)
    const attendance = await sequelize.query(
      `SELECT
        id,
        "UserId",
        authorization_status,
        authorized_by_user_id,
        authorized_at,
        authorization_notes,
        "checkInTime"
      FROM attendances
      WHERE authorization_token = $1`,
      {
        bind: [authorizationId],
        type: QueryTypes.SELECT,
        plain: true
      }
    );

    if (!attendance) {
      return res.status(404).json({
        success: false,
        error: 'Authorization request not found'
      });
    }

    // Si todavía está pendiente
    if (attendance.authorization_status === 'pending') {
      return res.json({
        success: true,
        status: 'pending',
        message: 'Waiting for authorization'
      });
    }

    // Si fue aprobado o rechazado
    let authorizerName = 'Sistema';
    if (attendance.authorized_by_user_id) {
      const authorizer = await sequelize.query(
        `SELECT first_name, last_name FROM users WHERE user_id = $1`,
        {
          bind: [attendance.authorized_by_user_id],
          type: QueryTypes.SELECT,
          plain: true
        }
      );
      if (authorizer) {
        authorizerName = `${authorizer.first_name} ${authorizer.last_name}`;
      }
    }

    return res.json({
      success: true,
      status: attendance.authorization_status,
      authorizedBy: authorizerName,
      authorizedAt: attendance.authorized_at,
      notes: attendance.authorization_notes,
      checkInTime: attendance.checkInTime
    });

  } catch (error) {
    console.error('❌ Error checking authorization status:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/v1/authorization/request
 * Solicitar autorización de llegada tardía (desde APK Kiosk/Mobile)
 * Este endpoint es llamado por Flutter en authorization_polling_service.dart
 */
router.post('/request', async (req, res) => {
  try {
    const {
      attendanceId,
      employeeId,
      employeeName,
      lateMinutes,
      kioskId,
      companyId
    } = req.body;

    // Validar campos requeridos
    if (!attendanceId || !employeeId) {
      return res.status(400).json({
        success: false,
        error: 'attendanceId y employeeId son requeridos'
      });
    }

    console.log(`📨 [AUTHORIZATION] Request received: employee=${employeeName}, late=${lateMinutes}min`);

    // Generar token único para esta solicitud
    const crypto = require('crypto');
    const authorizationToken = crypto.randomBytes(32).toString('hex');

    // Actualizar el registro de asistencia con el token y estado pendiente
    await sequelize.query(
      `UPDATE attendances
       SET authorization_status = 'pending',
           authorization_token = $1,
           authorization_requested_at = NOW()
       WHERE id = $2`,
      {
        bind: [authorizationToken, attendanceId],
        type: QueryTypes.UPDATE
      }
    );

    // Obtener datos del empleado y supervisores
    const employeeData = await sequelize.query(
      `SELECT
        u.user_id,
        u.first_name,
        u.last_name,
        u.email,
        u.legajo,
        u.department_id,
        u.company_id,
        d.name as department_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.user_id = $1`,
      {
        bind: [employeeId],
        type: QueryTypes.SELECT,
        plain: true
      }
    );

    // Usar el servicio de autorización para notificar supervisores
    const authResult = await authorizationService.requestAuthorization({
      attendanceId,
      employeeId,
      employeeName: employeeName || `${employeeData?.first_name} ${employeeData?.last_name}`,
      lateMinutes: lateMinutes || 0,
      companyId: companyId || employeeData?.company_id,
      departmentId: employeeData?.department_id,
      authorizationToken
    });

    console.log(`✅ [AUTHORIZATION] Request created: token=${authorizationToken.substring(0, 8)}...`);

    return res.json({
      success: true,
      message: 'Solicitud de autorización enviada',
      authorizationId: authorizationToken,
      token: authorizationToken,
      status: 'pending',
      notifiedSupervisors: authResult?.notifiedSupervisors || 0
    });

  } catch (error) {
    console.error('❌ Error creating authorization request:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al crear solicitud de autorización',
      details: error.message
    });
  }
});

module.exports = router;
