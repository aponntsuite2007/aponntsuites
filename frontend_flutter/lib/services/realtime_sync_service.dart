// 📡 REAL-TIME SYNCHRONIZATION SERVICE - FLUTTER
// ==============================================
// Synchronizes biometric data, emotion analysis, and attendance
// between Flutter APK, Web platform, and Kiosko in real-time
// Uses WebSocket for instant data synchronization

import 'dart:async';
import 'dart:convert';
import 'dart:developer' as developer;
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:web_socket_channel/status.dart' as status;
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'morphcast_emotion_service.dart';
import 'biometric_recognition_service.dart';

class RealtimeSyncService {
  // WebSocket connection
  WebSocketChannel? _webSocketChannel;
  late Dio _dio;

  // Services
  late MorphCastEmotionService _emotionService;
  late BiometricRecognitionService _biometricService;

  // Connection state
  bool _isConnected = false;
  bool _isInitialized = false;
  String? _authToken;
  String? _companyId;
  String? _employeeId;

  // Sync configuration
  Map<String, dynamic> _syncConfig = {};
  Timer? _heartbeatTimer;
  Timer? _retryTimer;

  // Data streams
  StreamController<Map<String, dynamic>>? _syncDataController;
  StreamController<String>? _connectionStatusController;

  // Singleton pattern
  static final RealtimeSyncService _instance = RealtimeSyncService._internal();
  factory RealtimeSyncService() => _instance;
  RealtimeSyncService._internal();

  /// 🚀 Initialize synchronization service
  Future<Map<String, dynamic>> initialize({
    required String serverUrl,
    required String authToken,
    required String companyId,
    String? employeeId,
  }) async {
    try {
      developer.log('📡 [SYNC-FLUTTER] Inicializando servicio de sincronización...', name: 'Sync');

      _authToken = authToken;
      _companyId = companyId;
      _employeeId = employeeId;

      // Initialize HTTP client
      _dio = Dio(BaseOptions(
        baseUrl: serverUrl,
        connectTimeout: Duration(seconds: 10),
        receiveTimeout: Duration(seconds: 30),
        headers: {
          'Authorization': 'Bearer $_authToken',
          'Content-Type': 'application/json',
          'X-Company-ID': _companyId,
          'X-Platform': 'flutter-mobile'
        }
      ));

      // Sync configuration matching web platform
      _syncConfig = {
        'websocket_url': serverUrl.replaceFirst('http', 'ws') + '/ws',
        'sync_interval': 1000, // 1 second
        'heartbeat_interval': 30000, // 30 seconds
        'retry_attempts': 5,
        'retry_delay': 2000, // 2 seconds
        'data_types': [
          'biometric_data',
          'emotion_analysis',
          'attendance_records',
          'device_status',
          'real_time_alerts'
        ],
        'encryption': true,
        'compression': true
      };

      // Initialize services
      _emotionService = MorphCastEmotionService();
      _biometricService = BiometricRecognitionService();

      // Setup streams
      _setupDataStreams();

      // Test connection
      await _testConnection();

      _isInitialized = true;

      developer.log('✅ [SYNC-FLUTTER] Servicio de sincronización inicializado', name: 'Sync');

      return {
        'success': true,
        'message': 'Real-time synchronization service initialized',
        'server_url': serverUrl,
        'company_id': _companyId,
        'employee_id': _employeeId,
        'sync_capabilities': _syncConfig['data_types'],
        'platform': 'flutter_mobile'
      };

    } catch (error) {
      developer.log('❌ [SYNC-FLUTTER] Error: $error', name: 'Sync');
      throw Exception('Failed to initialize sync service: $error');
    }
  }

  /// 📡 Setup data streams
  void _setupDataStreams() {
    _syncDataController = StreamController<Map<String, dynamic>>.broadcast();
    _connectionStatusController = StreamController<String>.broadcast();

    developer.log('📡 [SYNC-FLUTTER] Streams configurados', name: 'Sync');
  }

  /// 🔗 Connect to WebSocket server
  Future<void> connectWebSocket() async {
    try {
      if (_isConnected) {
        developer.log('📡 [SYNC-FLUTTER] Ya conectado al WebSocket', name: 'Sync');
        return;
      }

      developer.log('📡 [SYNC-FLUTTER] Conectando al WebSocket...', name: 'Sync');

      final wsUrl = '${_syncConfig['websocket_url']}?token=$_authToken&company=$_companyId&platform=flutter';

      _webSocketChannel = WebSocketChannel.connect(Uri.parse(wsUrl));

      // Listen to incoming messages
      _webSocketChannel!.stream.listen(
        _handleWebSocketMessage,
        onError: _handleWebSocketError,
        onDone: _handleWebSocketDisconnection,
      );

      // Send connection handshake
      await _sendHandshake();

      // Start heartbeat
      _startHeartbeat();

      _isConnected = true;
      _connectionStatusController?.add('connected');

      developer.log('✅ [SYNC-FLUTTER] Conectado al WebSocket', name: 'Sync');

    } catch (error) {
      developer.log('❌ [SYNC-FLUTTER] Error conectando WebSocket: $error', name: 'Sync');
      _scheduleReconnection();
    }
  }

  /// 📤 Send handshake message
  Future<void> _sendHandshake() async {
    final handshake = {
      'type': 'handshake',
      'timestamp': DateTime.now().toIso8601String(),
      'platform': 'flutter_mobile',
      'company_id': _companyId,
      'employee_id': _employeeId,
      'capabilities': {
        'biometric_capture': true,
        'emotion_analysis': true,
        'real_time_sync': true,
        'offline_mode': true
      },
      'services': {
        'morphcast_emotion': _emotionService.isInitialized,
        'biometric_recognition': _biometricService.isInitialized
      }
    };

    _sendWebSocketMessage(handshake);
  }

  /// 💓 Start heartbeat
  void _startHeartbeat() {
    _heartbeatTimer = Timer.periodic(
      Duration(milliseconds: _syncConfig['heartbeat_interval']),
      (timer) {
        if (_isConnected) {
          _sendWebSocketMessage({
            'type': 'heartbeat',
            'timestamp': DateTime.now().toIso8601String(),
            'platform': 'flutter_mobile'
          });
        }
      }
    );
  }

  /// 📨 Handle WebSocket messages
  void _handleWebSocketMessage(dynamic message) {
    try {
      final data = json.decode(message.toString());
      final messageType = data['type'];

      developer.log('📨 [SYNC-FLUTTER] Mensaje recibido: $messageType', name: 'Sync');

      switch (messageType) {
        case 'handshake_ack':
          _handleHandshakeAck(data);
          break;
        case 'biometric_sync':
          _handleBiometricSync(data);
          break;
        case 'emotion_sync':
          _handleEmotionSync(data);
          break;
        case 'attendance_update':
          _handleAttendanceUpdate(data);
          break;
        case 'device_command':
          _handleDeviceCommand(data);
          break;
        case 'real_time_alert':
          _handleRealTimeAlert(data);
          break;
        default:
          developer.log('⚠️ [SYNC-FLUTTER] Tipo de mensaje desconocido: $messageType', name: 'Sync');
      }

      // Emit to data stream
      _syncDataController?.add(data);

    } catch (error) {
      developer.log('❌ [SYNC-FLUTTER] Error procesando mensaje: $error', name: 'Sync');
    }
  }

  /// 🤝 Handle handshake acknowledgment
  void _handleHandshakeAck(Map<String, dynamic> data) {
    developer.log('🤝 [SYNC-FLUTTER] Handshake confirmado', name: 'Sync');

    // Update sync configuration with server settings
    if (data.containsKey('sync_config')) {
      _syncConfig.addAll(data['sync_config']);
    }
  }

  /// 👆 Handle biometric data synchronization
  void _handleBiometricSync(Map<String, dynamic> data) {
    developer.log('👆 [SYNC-FLUTTER] Sincronización biométrica recibida', name: 'Sync');

    // Process biometric sync data
    final syncType = data['sync_type'];
    final biometricData = data['biometric_data'];

    switch (syncType) {
      case 'template_update':
        _processBiometricTemplateUpdate(biometricData);
        break;
      case 'verification_request':
        _processBiometricVerificationRequest(biometricData);
        break;
      case 'enrollment_sync':
        _processBiometricEnrollmentSync(biometricData);
        break;
    }
  }

  /// 🎭 Handle emotion analysis synchronization
  void _handleEmotionSync(Map<String, dynamic> data) {
    developer.log('🎭 [SYNC-FLUTTER] Sincronización emocional recibida', name: 'Sync');

    // Sync emotion data with web platform
    final emotionData = data['emotion_data'];

    // Update local emotion service if needed
    _syncEmotionData(emotionData);
  }

  /// ⏰ Handle attendance updates
  void _handleAttendanceUpdate(Map<String, dynamic> data) {
    developer.log('⏰ [SYNC-FLUTTER] Actualización de asistencia recibida', name: 'Sync');

    // Process attendance sync
    final attendanceData = data['attendance_data'];
    _processAttendanceSync(attendanceData);
  }

  /// 🎯 Handle device commands
  void _handleDeviceCommand(Map<String, dynamic> data) {
    developer.log('🎯 [SYNC-FLUTTER] Comando de dispositivo recibido', name: 'Sync');

    final command = data['command'];
    final parameters = data['parameters'] ?? {};

    switch (command) {
      case 'start_biometric_capture':
        _startBiometricCapture(parameters);
        break;
      case 'start_emotion_analysis':
        _startEmotionAnalysis(parameters);
        break;
      case 'sync_data':
        _forceSyncData(parameters);
        break;
      case 'update_configuration':
        _updateConfiguration(parameters);
        break;
    }
  }

  /// 🚨 Handle real-time alerts
  void _handleRealTimeAlert(Map<String, dynamic> data) {
    developer.log('🚨 [SYNC-FLUTTER] Alerta en tiempo real recibida', name: 'Sync');

    final alertType = data['alert_type'];
    final alertData = data['alert_data'];

    // Process different types of alerts
    _processRealTimeAlert(alertType, alertData);
  }

  // ═══════════════════════════════════════════════════════════════
  // 📤 ENVÍO DE DATOS AL SERVIDOR
  // ═══════════════════════════════════════════════════════════════

  /// 📤 Send biometric data to server
  Future<void> syncBiometricData(Map<String, dynamic> biometricData) async {
    try {
      final syncMessage = {
        'type': 'biometric_sync',
        'timestamp': DateTime.now().toIso8601String(),
        'platform': 'flutter_mobile',
        'company_id': _companyId,
        'employee_id': _employeeId,
        'biometric_data': biometricData,
        'sync_id': _generateSyncId()
      };

      // Send via WebSocket if connected
      if (_isConnected) {
        _sendWebSocketMessage(syncMessage);
      } else {
        // Fallback to HTTP if WebSocket not available
        await _sendHttpRequest('/api/biometric/sync', syncMessage);
      }

      developer.log('📤 [SYNC-FLUTTER] Datos biométricos sincronizados', name: 'Sync');

    } catch (error) {
      developer.log('❌ [SYNC-FLUTTER] Error sincronizando biométricos: $error', name: 'Sync');
      throw error;
    }
  }

  /// 🎭 Send emotion data to server
  Future<void> syncEmotionData(Map<String, dynamic> emotionData) async {
    try {
      final syncMessage = {
        'type': 'emotion_sync',
        'timestamp': DateTime.now().toIso8601String(),
        'platform': 'flutter_mobile',
        'company_id': _companyId,
        'employee_id': _employeeId,
        'emotion_data': emotionData,
        'sync_id': _generateSyncId()
      };

      if (_isConnected) {
        _sendWebSocketMessage(syncMessage);
      } else {
        await _sendHttpRequest('/api/emotion/sync', syncMessage);
      }

      developer.log('📤 [SYNC-FLUTTER] Datos emocionales sincronizados', name: 'Sync');

    } catch (error) {
      developer.log('❌ [SYNC-FLUTTER] Error sincronizando emociones: $error', name: 'Sync');
      throw error;
    }
  }

  /// ⏰ Send attendance record to server
  Future<void> syncAttendanceRecord(Map<String, dynamic> attendanceData) async {
    try {
      final syncMessage = {
        'type': 'attendance_sync',
        'timestamp': DateTime.now().toIso8601String(),
        'platform': 'flutter_mobile',
        'company_id': _companyId,
        'employee_id': _employeeId,
        'attendance_data': attendanceData,
        'sync_id': _generateSyncId()
      };

      if (_isConnected) {
        _sendWebSocketMessage(syncMessage);
      } else {
        await _sendHttpRequest('/api/attendance/sync', syncMessage);
      }

      developer.log('📤 [SYNC-FLUTTER] Registro de asistencia sincronizado', name: 'Sync');

    } catch (error) {
      developer.log('❌ [SYNC-FLUTTER] Error sincronizando asistencia: $error', name: 'Sync');
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 🔧 MÉTODOS AUXILIARES
  // ═══════════════════════════════════════════════════════════════

  void _sendWebSocketMessage(Map<String, dynamic> message) {
    if (_webSocketChannel != null && _isConnected) {
      _webSocketChannel!.sink.add(json.encode(message));
    }
  }

  Future<Response> _sendHttpRequest(String endpoint, Map<String, dynamic> data) async {
    return await _dio.post(endpoint, data: data);
  }

  String _generateSyncId() {
    return 'flutter_${DateTime.now().millisecondsSinceEpoch}_${_companyId}_${_employeeId}';
  }

  Future<void> _testConnection() async {
    try {
      final response = await _dio.get('/api/health');
      if (response.statusCode != 200) {
        throw Exception('Server health check failed');
      }
    } catch (error) {
      throw Exception('Connection test failed: $error');
    }
  }

  void _handleWebSocketError(error) {
    developer.log('❌ [SYNC-FLUTTER] WebSocket error: $error', name: 'Sync');
    _connectionStatusController?.add('error');
    _scheduleReconnection();
  }

  void _handleWebSocketDisconnection() {
    developer.log('🔌 [SYNC-FLUTTER] WebSocket desconectado', name: 'Sync');
    _isConnected = false;
    _connectionStatusController?.add('disconnected');
    _scheduleReconnection();
  }

  void _scheduleReconnection() {
    if (_retryTimer?.isActive == true) return;

    _retryTimer = Timer(Duration(milliseconds: _syncConfig['retry_delay']), () {
      if (!_isConnected) {
        connectWebSocket();
      }
    });
  }

  // Process methods (placeholders for actual implementation)
  void _processBiometricTemplateUpdate(Map<String, dynamic> data) {
    developer.log('🔄 [SYNC-FLUTTER] Procesando actualización de template biométrico', name: 'Sync');
  }

  void _processBiometricVerificationRequest(Map<String, dynamic> data) {
    developer.log('🔍 [SYNC-FLUTTER] Procesando solicitud de verificación biométrica', name: 'Sync');
  }

  void _processBiometricEnrollmentSync(Map<String, dynamic> data) {
    developer.log('📝 [SYNC-FLUTTER] Procesando sincronización de enrollment biométrico', name: 'Sync');
  }

  void _syncEmotionData(Map<String, dynamic> data) {
    developer.log('🎭 [SYNC-FLUTTER] Sincronizando datos emocionales', name: 'Sync');
  }

  void _processAttendanceSync(Map<String, dynamic> data) {
    developer.log('⏰ [SYNC-FLUTTER] Procesando sincronización de asistencia', name: 'Sync');
  }

  void _startBiometricCapture(Map<String, dynamic> parameters) {
    developer.log('📸 [SYNC-FLUTTER] Iniciando captura biométrica', name: 'Sync');
  }

  void _startEmotionAnalysis(Map<String, dynamic> parameters) {
    developer.log('🎭 [SYNC-FLUTTER] Iniciando análisis emocional', name: 'Sync');
  }

  void _forceSyncData(Map<String, dynamic> parameters) {
    developer.log('🔄 [SYNC-FLUTTER] Forzando sincronización de datos', name: 'Sync');
  }

  void _updateConfiguration(Map<String, dynamic> parameters) {
    developer.log('⚙️ [SYNC-FLUTTER] Actualizando configuración', name: 'Sync');
    _syncConfig.addAll(parameters);
  }

  void _processRealTimeAlert(String alertType, Map<String, dynamic> alertData) {
    developer.log('🚨 [SYNC-FLUTTER] Procesando alerta: $alertType', name: 'Sync');
  }

  // ═══════════════════════════════════════════════════════════════
  // 🔧 GETTERS Y UTILIDADES
  // ═══════════════════════════════════════════════════════════════

  bool get isConnected => _isConnected;
  bool get isInitialized => _isInitialized;
  String? get companyId => _companyId;
  String? get employeeId => _employeeId;

  Stream<Map<String, dynamic>>? get syncDataStream => _syncDataController?.stream;
  Stream<String>? get connectionStatusStream => _connectionStatusController?.stream;

  Map<String, dynamic> getServiceStats() {
    return {
      'service': 'RealtimeSyncService',
      'version': '1.0.0',
      'platform': 'flutter_mobile',
      'isInitialized': _isInitialized,
      'isConnected': _isConnected,
      'company_id': _companyId,
      'employee_id': _employeeId,
      'sync_capabilities': _syncConfig['data_types'],
      'websocket_url': _syncConfig['websocket_url'],
      'features': [
        'Real-time WebSocket communication',
        'HTTP fallback',
        'Biometric data synchronization',
        'Emotion analysis synchronization',
        'Attendance record synchronization',
        'Device command handling',
        'Real-time alerts',
        'Auto-reconnection',
        'Heartbeat monitoring'
      ],
      'synchronized_platforms': ['web', 'kiosko', 'flutter_mobile'],
      'cost': 'FREE'
    };
  }

  void dispose() {
    _heartbeatTimer?.cancel();
    _retryTimer?.cancel();
    _webSocketChannel?.sink.close(status.normalClosure);
    _syncDataController?.close();
    _connectionStatusController?.close();
    _isConnected = false;
    _isInitialized = false;
    developer.log('📡 [SYNC-FLUTTER] Servicio finalizado', name: 'Sync');
  }
}