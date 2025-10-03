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

module.exports = {
  initialize,
  sendToUser,
  sendToAdmins,
  sendToSupervisors,
  broadcast,
  getConnectedClients,
  notifyNewAttendance,
  notifyNewMessage,
  sendSystemAlert
};