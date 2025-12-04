import 'dart:async';
import 'dart:convert';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// 🔌 WEBSOCKET SERVICE - IMPLEMENTACIÓN REAL
/// Conecta con Socket.IO backend para:
/// - Autorizaciones de llegadas tardías en tiempo real
/// - Notificaciones de sistema
/// - Estado de kiosk
/// - Sincronización de asistencias
///
/// ACTUALIZADO: 2025-11-29 - Implementación completa (no stub)
class WebSocketService {
  static final WebSocketService _instance = WebSocketService._internal();
  factory WebSocketService() => _instance;
  WebSocketService._internal();

  IO.Socket? _socket;
  bool _isConnected = false;
  bool _isAuthenticated = false;
  String? _serverUrl;
  String? _authToken;
  String? _userId;
  String? _kioskId;
  Timer? _reconnectTimer;
  Timer? _heartbeatTimer;
  int _reconnectAttempts = 0;
  static const int _maxReconnectAttempts = 10;
  static const Duration _reconnectDelay = Duration(seconds: 5);
  static const Duration _heartbeatInterval = Duration(seconds: 30);

  // Event streams for reactive UI updates
  final StreamController<Map<String, dynamic>> _authorizationRequestController =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Map<String, dynamic>> _attendanceUpdateController =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Map<String, dynamic>> _systemAlertController =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<ConnectionState> _connectionStateController =
      StreamController<ConnectionState>.broadcast();

  // Public getters
  bool get isConnected => _isConnected;
  bool get isAuthenticated => _isAuthenticated;
  Stream<Map<String, dynamic>> get authorizationRequests =>
      _authorizationRequestController.stream;
  Stream<Map<String, dynamic>> get attendanceUpdates =>
      _attendanceUpdateController.stream;
  Stream<Map<String, dynamic>> get systemAlerts =>
      _systemAlertController.stream;
  Stream<ConnectionState> get connectionState =>
      _connectionStateController.stream;

  /// 🚀 Initialize WebSocket service with server URL
  Future<void> initialize(String serverUrl, {String? authToken}) async {
    print('🔌 [WEBSOCKET] Initializing with server: $serverUrl');

    _serverUrl = serverUrl;
    if (authToken != null) {
      _authToken = authToken;
    }

    // Load saved credentials if not provided
    if (_authToken == null) {
      final prefs = await SharedPreferences.getInstance();
      _authToken = prefs.getString('auth_token');
      _userId = prefs.getString('user_id');
      _kioskId = prefs.getString('kiosk_id');
    }

    _connectionStateController.add(ConnectionState.connecting);
  }

  /// 🔗 Connect to Socket.IO server
  void connect() {
    if (_socket != null && _isConnected) {
      print('⚠️ [WEBSOCKET] Already connected');
      return;
    }

    if (_serverUrl == null) {
      print('❌ [WEBSOCKET] Server URL not set. Call initialize() first');
      return;
    }

    print('🔗 [WEBSOCKET] Connecting to $_serverUrl...');
    _connectionStateController.add(ConnectionState.connecting);

    try {
      // Build Socket.IO URL (remove /api if present, add /socket.io)
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
      print('❌ [WEBSOCKET] Connection error: $e');
      _connectionStateController.add(ConnectionState.disconnected);
      _scheduleReconnect();
    }
  }

  /// 📡 Setup Socket.IO event listeners
  void _setupEventListeners() {
    if (_socket == null) return;

    // Connection events
    _socket!.onConnect((_) {
      print('✅ [WEBSOCKET] Connected to server');
      _isConnected = true;
      _reconnectAttempts = 0;
      _connectionStateController.add(ConnectionState.connected);

      // Authenticate after connection
      _authenticate();

      // Start heartbeat
      _startHeartbeat();
    });

    _socket!.onConnectError((error) {
      print('❌ [WEBSOCKET] Connection error: $error');
      _isConnected = false;
      _connectionStateController.add(ConnectionState.error);
    });

    _socket!.onDisconnect((_) {
      print('🔌 [WEBSOCKET] Disconnected from server');
      _isConnected = false;
      _isAuthenticated = false;
      _connectionStateController.add(ConnectionState.disconnected);
      _stopHeartbeat();
      _scheduleReconnect();
    });

    _socket!.onError((error) {
      print('❌ [WEBSOCKET] Error: $error');
      _connectionStateController.add(ConnectionState.error);
    });

    // Authentication response
    _socket!.on('authenticated', (data) {
      print('✅ [WEBSOCKET] Authentication successful');
      _isAuthenticated = true;
      _connectionStateController.add(ConnectionState.authenticated);

      // Join kiosk-specific room if this is a kiosk
      if (_kioskId != null) {
        _socket!.emit('join_room', {'room': 'kiosk_$_kioskId'});
        print('📍 [WEBSOCKET] Joined kiosk room: kiosk_$_kioskId');
      }
    });

    _socket!.on('authentication_error', (data) {
      print('❌ [WEBSOCKET] Authentication failed: $data');
      _isAuthenticated = false;
      _connectionStateController.add(ConnectionState.authFailed);
    });

    // Authorization request (late arrival)
    _socket!.on('authorization_request', (data) {
      print('🔔 [WEBSOCKET] Authorization request received: $data');
      _authorizationRequestController.add(Map<String, dynamic>.from(data));
    });

    // Attendance updates
    _socket!.on('attendance_updated', (data) {
      print('📋 [WEBSOCKET] Attendance updated: $data');
      _attendanceUpdateController.add(Map<String, dynamic>.from(data));
    });

    _socket!.on('new_checkin', (data) {
      print('✅ [WEBSOCKET] New check-in notification: $data');
      _attendanceUpdateController.add({
        'type': 'checkin',
        ...Map<String, dynamic>.from(data)
      });
    });

    _socket!.on('new_checkout', (data) {
      print('🚪 [WEBSOCKET] New check-out notification: $data');
      _attendanceUpdateController.add({
        'type': 'checkout',
        ...Map<String, dynamic>.from(data)
      });
    });

    // System alerts
    _socket!.on('system_alert', (data) {
      print('⚠️ [WEBSOCKET] System alert: $data');
      _systemAlertController.add(Map<String, dynamic>.from(data));
    });

    // Kiosk-specific events
    _socket!.on('kiosk_config_updated', (data) {
      print('⚙️ [WEBSOCKET] Kiosk config updated: $data');
      _systemAlertController.add({
        'type': 'kiosk_config',
        ...Map<String, dynamic>.from(data)
      });
    });

    // Authorization response (from supervisor)
    _socket!.on('authorization_response', (data) {
      print('📨 [WEBSOCKET] Authorization response: $data');
      _authorizationRequestController.add({
        'type': 'response',
        ...Map<String, dynamic>.from(data)
      });
    });

    // Heartbeat response
    _socket!.on('pong', (_) {
      print('💓 [WEBSOCKET] Heartbeat pong received');
    });
  }

  /// 🔐 Authenticate with server
  void _authenticate() {
    if (_socket == null || !_isConnected) return;

    print('🔐 [WEBSOCKET] Authenticating...');

    _socket!.emit('authenticate', {
      'token': _authToken,
      'userId': _userId,
      'kioskId': _kioskId,
      'clientType': 'kiosk',
      'timestamp': DateTime.now().toIso8601String()
    });
  }

  /// 💓 Start heartbeat to keep connection alive
  void _startHeartbeat() {
    _stopHeartbeat();
    _heartbeatTimer = Timer.periodic(_heartbeatInterval, (_) {
      if (_isConnected) {
        _socket?.emit('ping');
        print('💓 [WEBSOCKET] Heartbeat ping sent');
      }
    });
  }

  void _stopHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = null;
  }

  /// 🔄 Schedule reconnection attempt
  void _scheduleReconnect() {
    if (_reconnectAttempts >= _maxReconnectAttempts) {
      print('❌ [WEBSOCKET] Max reconnection attempts reached');
      _connectionStateController.add(ConnectionState.failed);
      return;
    }

    _reconnectTimer?.cancel();
    _reconnectAttempts++;

    final delay = Duration(
        seconds: _reconnectDelay.inSeconds * _reconnectAttempts);

    print('🔄 [WEBSOCKET] Reconnecting in ${delay.inSeconds}s (attempt $_reconnectAttempts/$_maxReconnectAttempts)');

    _reconnectTimer = Timer(delay, () {
      connect();
    });
  }

  /// 📤 Send attendance check-in event
  void sendCheckIn(Map<String, dynamic> attendanceData) {
    if (!_isConnected) {
      print('⚠️ [WEBSOCKET] Not connected, check-in skipped (HTTP will handle)');
      return;
    }

    print('📤 [WEBSOCKET] Sending check-in event');
    _socket?.emit('attendance_checkin', {
      ...attendanceData,
      'kioskId': _kioskId,
      'timestamp': DateTime.now().toIso8601String()
    });
  }

  /// 📤 Send attendance check-out event
  void sendCheckOut(Map<String, dynamic> attendanceData) {
    if (!_isConnected) {
      print('⚠️ [WEBSOCKET] Not connected, check-out skipped (HTTP will handle)');
      return;
    }

    print('📤 [WEBSOCKET] Sending check-out event');
    _socket?.emit('attendance_checkout', {
      ...attendanceData,
      'kioskId': _kioskId,
      'timestamp': DateTime.now().toIso8601String()
    });
  }

  /// 📤 Send kiosk status update
  void sendKioskStatus(Map<String, dynamic> status) {
    if (!_isConnected) return;

    _socket?.emit('kiosk_status', {
      'kioskId': _kioskId,
      'status': status,
      'timestamp': DateTime.now().toIso8601String()
    });
  }

  /// 📤 Request authorization for late arrival
  void requestLateArrivalAuthorization({
    required String employeeId,
    required String employeeName,
    required int lateMinutes,
    required String attendanceId,
  }) {
    if (!_isConnected) {
      print('⚠️ [WEBSOCKET] Not connected, cannot request authorization');
      return;
    }

    print('📤 [WEBSOCKET] Requesting late arrival authorization');
    _socket?.emit('request_late_authorization', {
      'employeeId': employeeId,
      'employeeName': employeeName,
      'lateMinutes': lateMinutes,
      'attendanceId': attendanceId,
      'kioskId': _kioskId,
      'timestamp': DateTime.now().toIso8601String()
    });
  }

  /// 📤 Send generic message
  void sendMessage(Map<String, dynamic> message) {
    if (!_isConnected || _socket == null) {
      print('⚠️ [WEBSOCKET] Cannot send message - not connected');
      return;
    }

    final event = message.remove('event') ?? 'message';
    _socket!.emit(event, message);
  }

  /// 🔌 Disconnect from server
  void disconnect() {
    print('🔌 [WEBSOCKET] Disconnecting...');

    _stopHeartbeat();
    _reconnectTimer?.cancel();

    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;

    _isConnected = false;
    _isAuthenticated = false;

    _connectionStateController.add(ConnectionState.disconnected);
  }

  /// 🧹 Dispose service and cleanup
  void dispose() {
    disconnect();

    _authorizationRequestController.close();
    _attendanceUpdateController.close();
    _systemAlertController.close();
    _connectionStateController.close();
  }

  /// 🔄 Update credentials (after login)
  Future<void> updateCredentials({
    String? authToken,
    String? userId,
    String? kioskId,
  }) async {
    if (authToken != null) _authToken = authToken;
    if (userId != null) _userId = userId;
    if (kioskId != null) _kioskId = kioskId;

    // Re-authenticate if connected
    if (_isConnected) {
      _authenticate();
    }
  }
}

/// Connection state enum for UI updates
enum ConnectionState {
  disconnected,
  connecting,
  connected,
  authenticated,
  authFailed,
  error,
  failed,
}
