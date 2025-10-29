/**
 * Configuración y manejo de WebSocket
 */

let io;

/**
 * Inicializar WebSocket
 */
const initialize = (socketIo) => {
  io = socketIo;
  
  io.on('connection', (socket) => {
    console.log(`Cliente conectado: ${socket.id}`);
    
    // Autenticación del socket
    socket.on('authenticate', (data) => {
      try {
        const { token, userId } = data;
        
        // TODO: Verificar JWT token
        // Por ahora solo guardamos el userId
        socket.userId = userId;
        socket.join(`user_${userId}`);
        
        socket.emit('authenticated', { success: true });
        console.log(`Usuario ${userId} autenticado en socket ${socket.id}`);
        
      } catch (error) {
        socket.emit('authentication_error', { error: 'Token inválido' });
      }
    });
    
    // Registro de entrada/salida en tiempo real
    socket.on('attendance_checkin', (data) => {
      // Emitir a administradores y supervisores
      socket.broadcast.to('supervisors').emit('new_checkin', data);
      socket.broadcast.to('admins').emit('new_checkin', data);
    });
    
    socket.on('attendance_checkout', (data) => {
      // Emitir a administradores y supervisores
      socket.broadcast.to('supervisors').emit('new_checkout', data);
      socket.broadcast.to('admins').emit('new_checkout', data);
    });
    
    // Unirse a grupos por rol
    socket.on('join_role_room', (role) => {
      if (['admin', 'supervisor'].includes(role)) {
        socket.join(`${role}s`);
        console.log(`Socket ${socket.id} se unió a sala ${role}s`);
      }
    });
    
    // Manejo de desconexión
    socket.on('disconnect', () => {
      console.log(`Cliente desconectado: ${socket.id}`);
    });
    
    // Ping/Pong para mantener conexión
    socket.on('ping', () => {
      socket.emit('pong');
    });
  });
};

/**
 * Enviar notificación a usuario específico
 */
const sendToUser = (userId, event, data) => {
  if (io) {
    io.to(`user_${userId}`).emit(event, data);
  }
};

/**
 * Enviar notificación a todos los administradores
 */
const sendToAdmins = (event, data) => {
  if (io) {
    io.to('admins').emit(event, data);
  }
};

/**
 * Enviar notificación a supervisores y administradores
 */
const sendToSupervisors = (event, data) => {
  if (io) {
    io.to('supervisors').emit(event, data);
    io.to('admins').emit(event, data);
  }
};

/**
 * Enviar notificación broadcast
 */
const broadcast = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

/**
 * Obtener número de clientes conectados
 */
const getConnectedClients = () => {
  return io ? io.engine.clientsCount : 0;
};

/**
 * Enviar notificación de nueva asistencia
 */
const notifyNewAttendance = (attendanceData, type = 'checkin') => {
  const event = type === 'checkin' ? 'new_checkin' : 'new_checkout';
  
  // Enviar a supervisores y admins
  sendToSupervisors(event, {
    ...attendanceData,
    timestamp: new Date()
  });
  
  // Enviar al usuario específico
  sendToUser(attendanceData.UserId, 'attendance_updated', {
    type,
    data: attendanceData,
    timestamp: new Date()
  });
};

/**
 * Enviar notificación de nuevo mensaje
 */
const notifyNewMessage = (messageData) => {
  sendToUser(messageData.recipientId, 'new_message', {
    ...messageData,
    timestamp: new Date()
  });
};

/**
 * Enviar alerta del sistema
 */
const sendSystemAlert = (alert, targetUsers = null) => {
  const alertData = {
    ...alert,
    timestamp: new Date()
  };

  if (targetUsers && Array.isArray(targetUsers)) {
    // Enviar a usuarios específicos
    targetUsers.forEach(userId => {
      sendToUser(userId, 'system_alert', alertData);
    });
  } else {
    // Broadcast a todos
    broadcast('system_alert', alertData);
  }
};

/**
 * FUNCIONES DE AUDITORÍA PARA DASHBOARD
 */

/**
 * Enviar error detectado en auditoría
 */
const sendAuditError = (errorData) => {
  if (io) {
    io.to('auditor-updates').emit('error-detected', {
      ...errorData,
      timestamp: new Date()
    });
  }
};

/**
 * Enviar fix aplicado en auditoría
 */
const sendAuditFix = (fixData) => {
  if (io) {
    io.to('auditor-updates').emit('fix-applied', {
      ...fixData,
      timestamp: new Date()
    });
  }
};

/**
 * Enviar progreso de auditoría
 */
const sendAuditProgress = (progressData) => {
  if (io) {
    io.to('auditor-updates').emit('audit-progress', {
      ...progressData,
      timestamp: new Date()
    });
  }
};

/**
 * Enviar resumen final de auditoría
 */
const sendAuditSummary = (summaryData) => {
  if (io) {
    io.to('auditor-updates').emit('audit-summary', {
      ...summaryData,
      timestamp: new Date()
    });
  }
};

/**
 * ═══════════════════════════════════════════════════════════════
 * FUNCIONES PARA SISTEMA DE TICKETS (OLLAMA ↔ CLAUDE CODE)
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Ollama notifica que creó tickets (solicita reparación a Claude Code)
 */
const notifyTicketsCreated = (ticketsData) => {
  if (io) {
    // Enviar a Claude Code listeners
    io.to('claude-code-bridge').emit('tickets:created', {
      ...ticketsData,
      action: 'repair_requested',
      timestamp: new Date()
    });

    console.log(`🎫 [WEBSOCKET] Notificando ${ticketsData.count} tickets creados a Claude Code`);
  }
};

/**
 * Claude Code notifica que reparó tickets (solicita re-test a Ollama)
 */
const notifyTicketsFixed = (fixedData) => {
  if (io) {
    // Enviar a Ollama listeners
    io.to('ollama-testing-bridge').emit('tickets:fixed', {
      ...fixedData,
      action: 'retest_requested',
      timestamp: new Date()
    });

    console.log(`✅ [WEBSOCKET] Notificando ${fixedData.count} tickets reparados a Ollama`);
  }
};

/**
 * Ollama notifica resultados de re-test
 */
const notifyRetestCompleted = (resultsData) => {
  if (io) {
    // Enviar a Claude Code y Dashboard
    io.to('claude-code-bridge').emit('tickets:retested', {
      ...resultsData,
      timestamp: new Date()
    });

    io.to('auditor-updates').emit('retest-completed', {
      ...resultsData,
      timestamp: new Date()
    });

    console.log(`🔄 [WEBSOCKET] Re-test completado: ${resultsData.passed} pasaron, ${resultsData.failed} fallaron`);
  }
};

/**
 * Solicitar diagnóstico de módulo
 */
const requestModuleDiagnostic = (moduleName, requestedBy) => {
  if (io) {
    io.to('ollama-testing-bridge').emit('diagnostic:requested', {
      module: moduleName,
      requested_by: requestedBy,
      action: 'run_diagnostic',
      timestamp: new Date()
    });

    console.log(`🔍 [WEBSOCKET] Diagnóstico solicitado para: ${moduleName}`);
  }
};

/**
 * ═══════════════════════════════════════════════════════════════
 * MEGA-UPGRADE: NOTIFICACIONES EN TIEMPO REAL DE ERRORES
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Notificar error detectado en tiempo real con clasificación completa
 * Formato compatible con el MEGA-UPGRADE de detección de 100+ tipos de errores
 */
const notifyErrorDetected = (errorData) => {
  if (io) {
    const payload = {
      event: 'error_detected',
      timestamp: new Date().toISOString(),
      error: {
        type: errorData.type || 'unknown',
        category: errorData.category || 'unknown-error',
        message: errorData.message || 'Sin mensaje de error',
        file: errorData.file || 'unknown',
        line: errorData.line || null,
        column: errorData.column || null,
        stackTrace: errorData.stackTrace || errorData.stack || null,
        severity: errorData.severity || 'medium',
        canAutoFix: errorData.canAutoFix || false,
        suggestedFix: errorData.suggestedFix || null,
        context: errorData.context || {}
      }
    };

    // Enviar a Claude Code bridge
    io.to('claude-code-bridge').emit('error:detected', payload);

    // Enviar a dashboard de auditoría
    io.to('auditor-updates').emit('error-detected', payload);

    console.log(`❌ [WEBSOCKET] Error detectado: ${payload.error.category} (${payload.error.severity})`);
  }
};

/**
 * Notificar múltiples errores en lote (para 60s post-login listener)
 */
const notifyErrorsBatch = (errors, context = {}) => {
  if (io && Array.isArray(errors) && errors.length > 0) {
    const payload = {
      event: 'errors_batch_detected',
      timestamp: new Date().toISOString(),
      count: errors.length,
      errors: errors.map(err => ({
        type: err.type || 'unknown',
        category: err.category || 'unknown-error',
        message: err.message || 'Sin mensaje',
        file: err.file || 'unknown',
        line: err.line || null,
        severity: err.severity || 'medium',
        canAutoFix: err.canAutoFix || false
      })),
      context: {
        phase: context.phase || 'unknown',
        duration_ms: context.duration_ms || null,
        ...context
      }
    };

    // Enviar a Claude Code bridge
    io.to('claude-code-bridge').emit('errors:batch', payload);

    // Enviar a dashboard
    io.to('auditor-updates').emit('errors-batch', payload);

    console.log(`📦 [WEBSOCKET] Batch de ${payload.count} errores notificados`);
  }
};

/**
 * Claude Code aprueba/rechaza la aplicación de un fix
 */
const sendFixApproval = (approvalData) => {
  if (io) {
    const payload = {
      event: 'fix_approval',
      timestamp: new Date().toISOString(),
      error_id: approvalData.error_id || approvalData.errorId,
      action: approvalData.action || 'skip', // 'apply_fix', 'skip', 'manual_review'
      reason: approvalData.reason || null
    };

    // Enviar a Ollama testing bridge
    io.to('ollama-testing-bridge').emit('fix:approval', payload);

    console.log(`${payload.action === 'apply_fix' ? '✅' : '⏭️'} [WEBSOCKET] Fix ${payload.action} para error ${payload.error_id}`);
  }
};

/**
 * Notificar que un fix fue aplicado correctamente
 */
const notifyFixApplied = (fixData) => {
  if (io) {
    const payload = {
      event: 'fix_applied_success',
      timestamp: new Date().toISOString(),
      error_id: fixData.error_id || fixData.errorId,
      fix_strategy: fixData.strategy || fixData.fix_strategy,
      files_modified: fixData.files_modified || [],
      success: true
    };

    // Enviar a Claude Code bridge
    io.to('claude-code-bridge').emit('fix:applied', payload);

    // Enviar a dashboard
    io.to('auditor-updates').emit('fix-applied-success', payload);

    console.log(`✅ [WEBSOCKET] Fix aplicado correctamente: ${payload.fix_strategy}`);
  }
};

/**
 * Notificar que un fix falló al aplicarse
 */
const notifyFixFailed = (failData) => {
  if (io) {
    const payload = {
      event: 'fix_applied_failed',
      timestamp: new Date().toISOString(),
      error_id: failData.error_id || failData.errorId,
      fix_strategy: failData.strategy || failData.fix_strategy,
      error_message: failData.error || failData.error_message,
      success: false
    };

    // Enviar a Claude Code bridge
    io.to('claude-code-bridge').emit('fix:failed', payload);

    // Enviar a dashboard
    io.to('auditor-updates').emit('fix-applied-failed', payload);

    console.log(`❌ [WEBSOCKET] Fix falló: ${payload.fix_strategy} - ${payload.error_message}`);
  }
};

/**
 * Heartbeat para mantener conexión con Claude Code activa
 */
let claudeCodeHeartbeatInterval = null;

const startClaudeCodeHeartbeat = () => {
  if (claudeCodeHeartbeatInterval) {
    clearInterval(claudeCodeHeartbeatInterval);
  }

  claudeCodeHeartbeatInterval = setInterval(() => {
    if (io) {
      io.to('claude-code-bridge').emit('heartbeat', {
        timestamp: new Date().toISOString(),
        server_status: 'online'
      });
    }
  }, 30000); // Cada 30 segundos

  console.log('💓 [WEBSOCKET] Heartbeat de Claude Code iniciado (30s)');
};

const stopClaudeCodeHeartbeat = () => {
  if (claudeCodeHeartbeatInterval) {
    clearInterval(claudeCodeHeartbeatInterval);
    claudeCodeHeartbeatInterval = null;
    console.log('💔 [WEBSOCKET] Heartbeat de Claude Code detenido');
  }
};

module.exports = {
  initialize,
  sendToUser,
  sendToAdmins,
  sendToSupervisors,
  broadcast,
  getConnectedClients,
  notifyNewAttendance,
  notifyNewMessage,
  sendSystemAlert,
  // Funciones de auditoría
  sendAuditError,
  sendAuditFix,
  sendAuditProgress,
  sendAuditSummary,
  // Funciones de sistema de tickets (Ollama ↔ Claude Code)
  notifyTicketsCreated,
  notifyTicketsFixed,
  notifyRetestCompleted,
  requestModuleDiagnostic,
  // MEGA-UPGRADE: Notificaciones en tiempo real de errores
  notifyErrorDetected,
  notifyErrorsBatch,
  sendFixApproval,
  notifyFixApplied,
  notifyFixFailed,
  startClaudeCodeHeartbeat,
  stopClaudeCodeHeartbeat
};