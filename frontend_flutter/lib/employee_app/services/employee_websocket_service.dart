/*
 * 🔌 EMPLOYEE WEBSOCKET SERVICE
 * ==============================
 * Servicio de WebSocket para la APP DEL EMPLEADO
 * Mismo protocolo que el kiosk pero para uso individual
 *
 * Eventos soportados:
 * - Autorizaciones de llegadas tardías
 * - Actualizaciones de asistencia
 * - Alertas del sistema
 * - Notificaciones médicas
 *
 * Fecha: 2025-11-29
 * Versión: 1.0.0
 *
 * ⚠️ ESTE ARCHIVO ES INDEPENDIENTE - NO MODIFICA NADA DEL KIOSK
 */

import 'dart:async';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// 🔌 Estado de conexión del WebSocket
enum EmployeeConnectionState {
  disconnected,
  connecting,
  connected,
  authenticated,
  authFailed,
  error,
  failed,
}

/// 📩 Tipo de evento recibido
enum EmployeeWsEventType {
  authorization,
  attendance,
  medical,
  system,
  notification,
}

/// 📦 Evento WebSocket
class EmployeeWsEvent {
  final EmployeeWsEventType type;
  final Map<String, dynamic> data;
  final DateTime timestamp;

  EmployeeWsEvent({
    required this.type,
    required this.data,
    DateTime? timestamp,
  }) : timestamp = timestamp ?? DateTime.now();
}

/// 🔌 EMPLOYEE WEBSOCKET SERVICE
class EmployeeWebSocketService {
  static final EmployeeWebSocketService _instance =
      EmployeeWebSocketService._internal();
  factory EmployeeWebSocketService() => _instance;
  EmployeeWebSocketService._internal();

  IO.Socket? _socket;
  bool _isConnected = false;
  bool _isAuthenticated = false;
  String? _serverUrl;
  String? _authToken;
  String? _userId;
  String? _companyId;
  Timer? _reconnectTimer;
  Timer? _heartbeatTimer;
  int _reconnectAttempts = 0;

  static const int _maxReconnectAttempts = 10;
  static const Duration _reconnectDelay = Duration(seconds: 5);
  static const Duration _heartbeatInterval = Duration(seconds: 30);

  // 📡 Stream Controllers para eventos reactivos
  final StreamController<Map<String, dynamic>> _authorizationRequestController =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Map<String, dynamic>> _attendanceUpdateController =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Map<String, dynamic>> _medicalAlertController =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Map<String, dynamic>> _systemAlertController =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<EmployeeConnectionState> _connectionStateController =
      StreamController<EmployeeConnectionState>.broadcast();

  // Getters públicos
  bool get isConnected => _isConnected;
  bool get isAuthenticated => _isAuthenticated;

  Stream<Map<String, dynamic>> get authorizationRequests =>
      _authorizationRequestController.stream;
  Stream<Map<String, dynamic>> get attendanceUpdates =>
      _attendanceUpdateController.stream;
  Stream<Map<String, dynamic>> get medicalAlerts =>
      _medicalAlertController.stream;
  Stream<Map<String, dynamic>> get systemAlerts => _systemAlertController.stream;
  Stream<EmployeeConnectionState> get connectionState =>
      _connectionStateController.stream;

  /// 🚀 Inicializar con URL del servidor
  Future<void> initialize(String serverUrl, {String? authToken}) async {
    debugPrint('🔌 [EMPLOYEE-WS] Inicializando con servidor: $serverUrl');

    _serverUrl = serverUrl;
    if (authToken != null) {
      _authToken = authToken;
    }

    // Cargar credenciales guardadas
    if (_authToken == null) {
      final prefs = await SharedPreferences.getInstance();
      _authToken = prefs.getString('auth_token');
      _userId = prefs.getString('user_id');
      _companyId = prefs.getString('config_company_id');
    }

    _connectionStateController.add(EmployeeConnectionState.connecting);
  }

  /// 🔗 Conectar al servidor Socket.IO
  void connect() {
    if (_socket != null && _isConnected) {
      debugPrint('⚠️ [EMPLOYEE-WS] Ya conectado');
      return;
    }

    if (_serverUrl == null) {
      debugPrint('❌ [EMPLOYEE-WS] URL no configurada. Llama initialize() primero');
      return;
    }

    debugPrint('🔗 [EMPLOYEE-WS] Conectando a $_serverUrl...');
    _connectionStateController.add(EmployeeConnectionState.connecting);

    try {
      // Construir URL de Socket.IO (remover /api si está presente)
      String socketUrl = _serverUrl!;
      if (socketUrl.endsWith('/api')) {
        socketUrl = socketUrl.substring(0, socketUrl.length - 4);
      }

      _socket = IO.io(
        socketUrl,
        IO.OptionBuilder()
            .setTransports(['websocket', 'polling'])
            .enableAutoConnect()
            .enableReconnection()
            .setReconnectionAttempts(_maxReconnectAttempts)
            .setReconnectionDelay(5000)
            .setExtraHeaders({'Authorization': 'Bearer $_authToken'})
            .build(),
      );

      _setupEventListeners();
      _socket!.connect();
    } catch (e) {
      debugPrint('❌ [EMPLOYEE-WS] Error de conexión: $e');
      _connectionStateController.add(EmployeeConnectionState.disconnected);
      _scheduleReconnect();
    }
  }

  /// 📡 Configurar listeners de eventos
  void _setupEventListeners() {
    if (_socket == null) return;

    // Eventos de conexión
    _socket!.onConnect((_) {
      debugPrint('✅ [EMPLOYEE-WS] Conectado al servidor');
      _isConnected = true;
      _reconnectAttempts = 0;
      _connectionStateController.add(EmployeeConnectionState.connected);

      // Autenticar después de conectar
      _authenticate();

      // Iniciar heartbeat
      _startHeartbeat();
    });

    _socket!.onConnectError((error) {
      debugPrint('❌ [EMPLOYEE-WS] Error de conexión: $error');
      _isConnected = false;
      _connectionStateController.add(EmployeeConnectionState.error);
    });

    _socket!.onDisconnect((_) {
      debugPrint('🔌 [EMPLOYEE-WS] Desconectado del servidor');
      _isConnected = false;
      _isAuthenticated = false;
      _connectionStateController.add(EmployeeConnectionState.disconnected);
      _stopHeartbeat();
      _scheduleReconnect();
    });

    _socket!.onError((error) {
      debugPrint('❌ [EMPLOYEE-WS] Error: $error');
      _connectionStateController.add(EmployeeConnectionState.error);
    });

    // Respuesta de autenticación
    _socket!.on('authenticated', (data) {
      debugPrint('✅ [EMPLOYEE-WS] Autenticación exitosa');
      _isAuthenticated = true;
      _connectionStateController.add(EmployeeConnectionState.authenticated);

      // Unirse a sala del empleado
      if (_userId != null) {
        _socket!.emit('join_room', {'room': 'employee_$_userId'});
        debugPrint('📍 [EMPLOYEE-WS] Unido a sala: employee_$_userId');
      }

      // Unirse a sala de la empresa
      if (_companyId != null) {
        _socket!.emit('join_room', {'room': 'company_$_companyId'});
        debugPrint('📍 [EMPLOYEE-WS] Unido a sala: company_$_companyId');
      }
    });

    _socket!.on('authentication_error', (data) {
      debugPrint('❌ [EMPLOYEE-WS] Error de autenticación: $data');
      _isAuthenticated = false;
      _connectionStateController.add(EmployeeConnectionState.authFailed);
    });

    // 📬 AUTORIZACIÓN DE LLEGADAS TARDÍAS
    _socket!.on('authorization_request', (data) {
      debugPrint('🔔 [EMPLOYEE-WS] Solicitud de autorización recibida: $data');
      _authorizationRequestController.add(Map<String, dynamic>.from(data));
    });

    _socket!.on('authorization_response', (data) {
      debugPrint('📨 [EMPLOYEE-WS] Respuesta de autorización: $data');
      _authorizationRequestController.add({
        'type': 'response',
        ...Map<String, dynamic>.from(data)
      });
    });

    // 📋 ACTUALIZACIONES DE ASISTENCIA
    _socket!.on('attendance_updated', (data) {
      debugPrint('📋 [EMPLOYEE-WS] Asistencia actualizada: $data');
      _attendanceUpdateController.add(Map<String, dynamic>.from(data));
    });

    _socket!.on('new_checkin', (data) {
      debugPrint('✅ [EMPLOYEE-WS] Nuevo check-in: $data');
      _attendanceUpdateController.add({
        'type': 'checkin',
        ...Map<String, dynamic>.from(data)
      });
    });

    _socket!.on('new_checkout', (data) {
      debugPrint('🚪 [EMPLOYEE-WS] Nuevo check-out: $data');
      _attendanceUpdateController.add({
        'type': 'checkout',
        ...Map<String, dynamic>.from(data)
      });
    });

    // 🏥 NOTIFICACIONES MÉDICAS
    _socket!.on('medical_request', (data) {
      debugPrint('🏥 [EMPLOYEE-WS] Solicitud médica: $data');
      _medicalAlertController.add({
        'type': 'medical_request',
        ...Map<String, dynamic>.from(data)
      });
    });

    _socket!.on('medical_document_required', (data) {
      debugPrint('📄 [EMPLOYEE-WS] Documento médico requerido: $data');
      _medicalAlertController.add({
        'type': 'document_required',
        ...Map<String, dynamic>.from(data)
      });
    });

    _socket!.on('medical_response', (data) {
      debugPrint('💊 [EMPLOYEE-WS] Respuesta médica: $data');
      _medicalAlertController.add({
        'type': 'medical_response',
        ...Map<String, dynamic>.from(data)
      });
    });

    // ⚠️ ALERTAS DEL SISTEMA
    _socket!.on('system_alert', (data) {
      debugPrint('⚠️ [EMPLOYEE-WS] Alerta del sistema: $data');
      _systemAlertController.add(Map<String, dynamic>.from(data));
    });

    _socket!.on('shift_reminder', (data) {
      debugPrint('⏰ [EMPLOYEE-WS] Recordatorio de turno: $data');
      _systemAlertController.add({
        'type': 'shift_reminder',
        ...Map<String, dynamic>.from(data)
      });
    });

    // 💓 Heartbeat
    _socket!.on('pong', (_) {
      debugPrint('💓 [EMPLOYEE-WS] Pong recibido');
    });
  }

  /// 🔐 Autenticar con el servidor
  void _authenticate() {
    if (_socket == null || !_isConnected) return;

    debugPrint('🔐 [EMPLOYEE-WS] Autenticando...');

    _socket!.emit('authenticate', {
      'token': _authToken,
      'userId': _userId,
      'companyId': _companyId,
      'clientType': 'employee_app', // Diferencia del kiosk
      'timestamp': DateTime.now().toIso8601String()
    });
  }

  /// 💓 Heartbeat para mantener conexión viva
  void _startHeartbeat() {
    _stopHeartbeat();
    _heartbeatTimer = Timer.periodic(_heartbeatInterval, (_) {
      if (_isConnected) {
        _socket?.emit('ping');
        debugPrint('💓 [EMPLOYEE-WS] Ping enviado');
      }
    });
  }

  void _stopHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = null;
  }

  /// 🔄 Programar reconexión
  void _scheduleReconnect() {
    if (_reconnectAttempts >= _maxReconnectAttempts) {
      debugPrint('❌ [EMPLOYEE-WS] Máximo de intentos alcanzado');
      _connectionStateController.add(EmployeeConnectionState.failed);
      return;
    }

    _reconnectTimer?.cancel();
    _reconnectAttempts++;

    final delay =
        Duration(seconds: _reconnectDelay.inSeconds * _reconnectAttempts);

    debugPrint(
        '🔄 [EMPLOYEE-WS] Reconectando en ${delay.inSeconds}s (intento $_reconnectAttempts/$_maxReconnectAttempts)');

    _reconnectTimer = Timer(delay, () {
      connect();
    });
  }

  // ====== MÉTODOS DE ENVÍO ======

  /// 📤 Notificar check-in
  void sendCheckIn(Map<String, dynamic> attendanceData) {
    if (!_isConnected) {
      debugPrint(
          '⚠️ [EMPLOYEE-WS] No conectado, check-in omitido (HTTP lo manejará)');
      return;
    }

    debugPrint('📤 [EMPLOYEE-WS] Enviando check-in');
    _socket?.emit('attendance_checkin', {
      ...attendanceData,
      'userId': _userId,
      'companyId': _companyId,
      'clientType': 'employee_app',
      'timestamp': DateTime.now().toIso8601String()
    });
  }

  /// 📤 Notificar check-out
  void sendCheckOut(Map<String, dynamic> attendanceData) {
    if (!_isConnected) {
      debugPrint(
          '⚠️ [EMPLOYEE-WS] No conectado, check-out omitido (HTTP lo manejará)');
      return;
    }

    debugPrint('📤 [EMPLOYEE-WS] Enviando check-out');
    _socket?.emit('attendance_checkout', {
      ...attendanceData,
      'userId': _userId,
      'companyId': _companyId,
      'clientType': 'employee_app',
      'timestamp': DateTime.now().toIso8601String()
    });
  }

  /// 🏥 Enviar solicitud médica
  void sendMedicalRequest(Map<String, dynamic> requestData) {
    if (!_isConnected) {
      debugPrint('⚠️ [EMPLOYEE-WS] No conectado para solicitud médica');
      return;
    }

    debugPrint('🏥 [EMPLOYEE-WS] Enviando solicitud médica');
    _socket?.emit('medical_request', {
      ...requestData,
      'userId': _userId,
      'companyId': _companyId,
      'timestamp': DateTime.now().toIso8601String()
    });
  }

  /// 📤 Enviar mensaje genérico
  void sendMessage(String event, Map<String, dynamic> data) {
    if (!_isConnected || _socket == null) {
      debugPrint('⚠️ [EMPLOYEE-WS] No conectado, mensaje omitido');
      return;
    }

    _socket!.emit(event, {
      ...data,
      'userId': _userId,
      'timestamp': DateTime.now().toIso8601String()
    });
  }

  /// 🔌 Desconectar
  void disconnect() {
    debugPrint('🔌 [EMPLOYEE-WS] Desconectando...');

    _stopHeartbeat();
    _reconnectTimer?.cancel();

    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;

    _isConnected = false;
    _isAuthenticated = false;

    _connectionStateController.add(EmployeeConnectionState.disconnected);
  }

  /// 🔄 Actualizar credenciales
  Future<void> updateCredentials({
    String? authToken,
    String? userId,
    String? companyId,
  }) async {
    if (authToken != null) _authToken = authToken;
    if (userId != null) _userId = userId;
    if (companyId != null) _companyId = companyId;

    // Re-autenticar si está conectado
    if (_isConnected) {
      _authenticate();
    }
  }

  /// 🧹 Dispose
  void dispose() {
    disconnect();

    _authorizationRequestController.close();
    _attendanceUpdateController.close();
    _medicalAlertController.close();
    _systemAlertController.close();
    _connectionStateController.close();
  }
}
