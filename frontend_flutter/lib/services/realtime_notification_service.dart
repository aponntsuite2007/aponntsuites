import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:workmanager/workmanager.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:web_socket_channel/io.dart';
import 'package:http/http.dart' as http;
import 'multi_tenant_security_service.dart';

/// 🔔 Servicio de Notificaciones en Tiempo Real Bidireccional
/// Sistema completo de comunicación en tiempo real entre empresa y empleados
/// Incluye push notifications, WebSocket y notificaciones locales
class RealtimeNotificationService {
  static const String _taskName = 'notificationBackgroundTask';
  static const String _channelId = 'attendance_notifications';
  static const String _channelName = 'Control de Asistencia';
  static const String _channelDescription = 'Notificaciones del sistema de asistencia';

  final FirebaseMessaging _firebaseMessaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications = FlutterLocalNotificationsPlugin();
  final MultiTenantSecurityService _securityService;

  WebSocketChannel? _websocketChannel;
  String? _fcmToken;
  String? _baseUrl;
  bool _isInitialized = false;

  final Map<String, Function(Map<String, dynamic>)> _messageHandlers = {};
  final List<NotificationMessage> _pendingMessages = [];

  RealtimeNotificationService(this._securityService);

  /// 🚀 Inicializa el servicio de notificaciones
  Future<bool> initialize({String? serverUrl}) async {
    try {
      print('🔔 [REALTIME-NOTIFICATIONS] Inicializando servicio...');

      _baseUrl = serverUrl ?? 'localhost:9998';

      // Inicializar Firebase Messaging
      await _initializeFirebase();

      // Configurar notificaciones locales
      await _initializeLocalNotifications();

      // Configurar tareas en segundo plano
      await _initializeBackgroundTasks();

      // Conectar WebSocket para tiempo real
      await _connectWebSocket();

      _isInitialized = true;
      print('✅ [REALTIME-NOTIFICATIONS] Servicio inicializado correctamente');

      return true;
    } catch (e) {
      print('❌ [REALTIME-NOTIFICATIONS] Error inicializando: $e');
      return false;
    }
  }

  /// 🔥 Inicializa Firebase Messaging
  Future<void> _initializeFirebase() async {
    try {
      // Solicitar permisos
      NotificationSettings settings = await _firebaseMessaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      );

      if (settings.authorizationStatus == AuthorizationStatus.authorized) {
        print('✅ [FCM] Permisos concedidos');

        // Obtener token FCM
        _fcmToken = await _firebaseMessaging.getToken();
        print('🔑 [FCM] Token: $_fcmToken');

        // Configurar manejadores de mensajes
        FirebaseMessaging.onMessage.listen(_handleForegroundMessage);
        FirebaseMessaging.onMessageOpenedApp.listen(_handleMessageOpenedApp);
        FirebaseMessaging.onBackgroundMessage(_handleBackgroundMessage);

        // Registrar token en el servidor
        await _registerFcmToken();
      } else {
        print('❌ [FCM] Permisos denegados');
      }
    } catch (e) {
      print('❌ [FCM] Error inicializando Firebase: $e');
    }
  }

  /// 📱 Inicializa notificaciones locales
  Future<void> _initializeLocalNotifications() async {
    const AndroidInitializationSettings androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const DarwinInitializationSettings iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    const InitializationSettings settings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _localNotifications.initialize(
      settings,
      onDidReceiveNotificationResponse: _handleLocalNotificationTap,
    );

    // Crear canal de notificación para Android
    if (Platform.isAndroid) {
      const AndroidNotificationChannel channel = AndroidNotificationChannel(
        _channelId,
        _channelName,
        description: _channelDescription,
        importance: Importance.high,
        sound: RawResourceAndroidNotificationSound('notification_sound'),
      );

      await _localNotifications
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(channel);
    }
  }

  /// ⚙️ Inicializa tareas en segundo plano
  Future<void> _initializeBackgroundTasks() async {
    await Workmanager().initialize(
      _backgroundTaskDispatcher,
      isInDebugMode: kDebugMode,
    );

    // Programar tarea periódica para sincronización
    await Workmanager().registerPeriodicTask(
      'sync_notifications',
      _taskName,
      frequency: const Duration(minutes: 15),
      constraints: Constraints(
        networkType: NetworkType.connected,
      ),
    );
  }

  /// 🌐 Conecta WebSocket para comunicación en tiempo real
  Future<void> _connectWebSocket() async {
    try {
      final tenantId = _securityService.currentTenantId;
      if (tenantId == null) {
        print('⚠️ [WEBSOCKET] No hay contexto de empresa, posponiendo conexión');
        return;
      }

      final wsUrl = 'ws://$_baseUrl/ws?tenantId=$tenantId&token=$_fcmToken';
      _websocketChannel = IOWebSocketChannel.connect(wsUrl);

      _websocketChannel!.stream.listen(
        _handleWebSocketMessage,
        onError: (error) {
          print('❌ [WEBSOCKET] Error: $error');
          _reconnectWebSocket();
        },
        onDone: () {
          print('🔌 [WEBSOCKET] Conexión cerrada');
          _reconnectWebSocket();
        },
      );

      print('✅ [WEBSOCKET] Conectado a: $wsUrl');
    } catch (e) {
      print('❌ [WEBSOCKET] Error conectando: $e');
    }
  }

  /// 🔄 Reconecta WebSocket automáticamente
  Future<void> _reconnectWebSocket() async {
    await Future.delayed(const Duration(seconds: 5));
    await _connectWebSocket();
  }

  /// 📨 Registra token FCM en el servidor
  Future<void> _registerFcmToken() async {
    try {
      if (_fcmToken == null || _baseUrl == null) return;

      final tenantId = _securityService.currentTenantId;
      if (tenantId == null) return;

      final response = await http.post(
        Uri.parse('http://$_baseUrl/api/notifications/register-device'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'tenantId': tenantId,
          'fcmToken': _fcmToken,
          'deviceInfo': {
            'platform': Platform.operatingSystem,
            'version': Platform.operatingSystemVersion,
          },
        }),
      );

      if (response.statusCode == 200) {
        print('✅ [FCM] Token registrado en servidor');
      } else {
        print('❌ [FCM] Error registrando token: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ [FCM] Error registrando token: $e');
    }
  }

  /// 📤 Envía notificación a la empresa
  Future<bool> sendNotificationToCompany(String type, Map<String, dynamic> data) async {
    try {
      if (!_isInitialized || _baseUrl == null) {
        print('❌ [SEND] Servicio no inicializado');
        return false;
      }

      final tenantId = _securityService.currentTenantId;
      if (tenantId == null) {
        print('❌ [SEND] Contexto de empresa requerido');
        return false;
      }

      final notificationData = {
        'type': type,
        'data': data,
        'tenantId': tenantId,
        'timestamp': DateTime.now().toIso8601String(),
        'source': 'mobile_app',
      };

      // Enviar por WebSocket si está conectado
      if (_websocketChannel != null) {
        _websocketChannel!.sink.add(json.encode(notificationData));
        print('📤 [WEBSOCKET] Notificación enviada: $type');
      }

      // Enviar por HTTP como respaldo
      final response = await http.post(
        Uri.parse('http://$_baseUrl/api/notifications/send-to-company'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode(notificationData),
      );

      if (response.statusCode == 200) {
        print('✅ [SEND] Notificación enviada a empresa: $type');
        return true;
      } else {
        print('❌ [SEND] Error enviando notificación: ${response.statusCode}');
        return false;
      }
    } catch (e) {
      print('❌ [SEND] Error enviando notificación: $e');
      return false;
    }
  }

  /// 📥 Maneja mensajes de primer plano de Firebase
  void _handleForegroundMessage(RemoteMessage message) async {
    print('📨 [FCM-FOREGROUND] ${message.notification?.title}: ${message.notification?.body}');

    final notificationMsg = NotificationMessage.fromFirebase(message);
    await _processNotificationMessage(notificationMsg);

    // Mostrar notificación local
    await _showLocalNotification(notificationMsg);
  }

  /// 🔓 Maneja mensajes cuando se abre la app
  void _handleMessageOpenedApp(RemoteMessage message) {
    print('🔓 [FCM-OPENED] App abierta desde notificación: ${message.data}');
    final notificationMsg = NotificationMessage.fromFirebase(message);
    _processNotificationMessage(notificationMsg);
  }

  /// 🌙 Maneja mensajes en segundo plano
  static Future<void> _handleBackgroundMessage(RemoteMessage message) async {
    print('🌙 [FCM-BACKGROUND] ${message.notification?.title}: ${message.notification?.body}');
  }

  /// 🌐 Maneja mensajes de WebSocket
  void _handleWebSocketMessage(dynamic message) {
    try {
      final data = json.decode(message.toString()) as Map<String, dynamic>;
      print('📨 [WEBSOCKET] Mensaje recibido: ${data['type']}');

      final notificationMsg = NotificationMessage.fromWebSocket(data);
      _processNotificationMessage(notificationMsg);
    } catch (e) {
      print('❌ [WEBSOCKET] Error procesando mensaje: $e');
    }
  }

  /// 📱 Maneja toque en notificación local
  void _handleLocalNotificationTap(NotificationResponse response) {
    print('👆 [LOCAL] Notificación tocada: ${response.payload}');

    if (response.payload != null) {
      try {
        final data = json.decode(response.payload!) as Map<String, dynamic>;
        final notificationMsg = NotificationMessage.fromPayload(data);
        _processNotificationMessage(notificationMsg);
      } catch (e) {
        print('❌ [LOCAL] Error procesando payload: $e');
      }
    }
  }

  /// ⚡ Procesa mensaje de notificación
  Future<void> _processNotificationMessage(NotificationMessage message) async {
    try {
      // Ejecutar manejador específico si existe
      final handler = _messageHandlers[message.type];
      if (handler != null) {
        handler(message.data);
      }

      // Almacenar mensaje para procesamiento posterior
      _pendingMessages.add(message);

      print('✅ [PROCESS] Mensaje procesado: ${message.type}');
    } catch (e) {
      print('❌ [PROCESS] Error procesando mensaje: $e');
    }
  }

  /// 📱 Muestra notificación local
  Future<void> _showLocalNotification(NotificationMessage message) async {
    const AndroidNotificationDetails androidDetails = AndroidNotificationDetails(
      _channelId,
      _channelName,
      channelDescription: _channelDescription,
      importance: Importance.high,
      priority: Priority.high,
      showWhen: true,
      autoCancel: true,
    );

    const DarwinNotificationDetails iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    const NotificationDetails platformDetails = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _localNotifications.show(
      message.id,
      message.title,
      message.body,
      platformDetails,
      payload: json.encode(message.data),
    );
  }

  /// 📋 Registra manejador para tipo de mensaje específico
  void registerMessageHandler(String messageType, Function(Map<String, dynamic>) handler) {
    _messageHandlers[messageType] = handler;
    print('📋 [HANDLER] Registrado para: $messageType');
  }

  /// 🗑️ Elimina manejador de mensaje
  void unregisterMessageHandler(String messageType) {
    _messageHandlers.remove(messageType);
    print('🗑️ [HANDLER] Eliminado: $messageType');
  }

  /// 📊 Obtiene mensajes pendientes
  List<NotificationMessage> getPendingMessages() {
    return List.from(_pendingMessages);
  }

  /// 🧹 Limpia mensajes pendientes
  void clearPendingMessages() {
    _pendingMessages.clear();
    print('🧹 [PENDING] Mensajes limpiados');
  }

  /// 🔇 Configura modo silencioso
  Future<void> setSilentMode(bool enabled) async {
    if (enabled) {
      await _localNotifications.cancelAll();
      print('🔇 [SILENT] Modo silencioso activado');
    } else {
      print('🔊 [SILENT] Modo silencioso desactivado');
    }
  }

  /// 🧹 Limpia recursos
  Future<void> dispose() async {
    await _websocketChannel?.sink.close();
    await Workmanager().cancelAll();
    _messageHandlers.clear();
    _pendingMessages.clear();
    print('🧹 [REALTIME-NOTIFICATIONS] Recursos limpiados');
  }

  /// 📊 Estado del servicio
  NotificationServiceStatus get status => NotificationServiceStatus(
    isInitialized: _isInitialized,
    fcmToken: _fcmToken,
    websocketConnected: _websocketChannel != null,
    pendingMessages: _pendingMessages.length,
  );
}

/// 📨 Mensaje de notificación unificado
class NotificationMessage {
  final int id;
  final String type;
  final String title;
  final String body;
  final Map<String, dynamic> data;
  final DateTime timestamp;

  NotificationMessage({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    required this.data,
    required this.timestamp,
  });

  factory NotificationMessage.fromFirebase(RemoteMessage message) {
    return NotificationMessage(
      id: DateTime.now().millisecondsSinceEpoch,
      type: message.data['type'] ?? 'firebase',
      title: message.notification?.title ?? 'Notificación',
      body: message.notification?.body ?? '',
      data: message.data,
      timestamp: DateTime.now(),
    );
  }

  factory NotificationMessage.fromWebSocket(Map<String, dynamic> data) {
    return NotificationMessage(
      id: data['id'] ?? DateTime.now().millisecondsSinceEpoch,
      type: data['type'] ?? 'websocket',
      title: data['title'] ?? 'Notificación',
      body: data['body'] ?? '',
      data: data,
      timestamp: DateTime.tryParse(data['timestamp'] ?? '') ?? DateTime.now(),
    );
  }

  factory NotificationMessage.fromPayload(Map<String, dynamic> data) {
    return NotificationMessage(
      id: data['id'] ?? DateTime.now().millisecondsSinceEpoch,
      type: data['type'] ?? 'local',
      title: data['title'] ?? 'Notificación',
      body: data['body'] ?? '',
      data: data,
      timestamp: DateTime.tryParse(data['timestamp'] ?? '') ?? DateTime.now(),
    );
  }
}

/// 📊 Estado del servicio de notificaciones
class NotificationServiceStatus {
  final bool isInitialized;
  final String? fcmToken;
  final bool websocketConnected;
  final int pendingMessages;

  NotificationServiceStatus({
    required this.isInitialized,
    required this.fcmToken,
    required this.websocketConnected,
    required this.pendingMessages,
  });

  @override
  String toString() {
    return 'NotificationServiceStatus(initialized: $isInitialized, websocket: $websocketConnected, pending: $pendingMessages)';
  }
}

/// ⚙️ Dispatcher para tareas en segundo plano
@pragma('vm:entry-point')
void _backgroundTaskDispatcher() {
  Workmanager().executeTask((task, inputData) async {
    switch (task) {
      case 'sync_notifications':
        print('🔄 [BACKGROUND] Sincronizando notificaciones...');
        // Implementar sincronización
        return Future.value(true);
      default:
        return Future.value(false);
    }
  });
}