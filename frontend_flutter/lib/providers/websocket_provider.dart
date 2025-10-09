import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import '../config/app_config.dart';

class WebSocketProvider extends ChangeNotifier {
  IO.Socket? _socket;
  bool _isConnected = false;
  String? _error;
  int _reconnectAttempts = 0;
  final int _maxReconnectAttempts = 5;
  
  // Listeners para eventos específicos
  final Map<String, Function> _eventListeners = {};
  
  WebSocketProvider();
  
  // Getters
  bool get isConnected => _isConnected;
  String? get error => _error;
  int get reconnectAttempts => _reconnectAttempts;
  
  /// Conectar al WebSocket
  Future<void> connect({String? token, String? userId}) async {
    try {
      if (_socket?.connected == true) {
        print('WebSocket ya está conectado');
        return;
      }
      
      _socket = IO.io(
        AppConfig.websocketUrl,
        IO.OptionBuilder()
            .setTransports(['websocket'])
            .setExtraHeaders({
              if (token != null) 'Authorization': 'Bearer $token',
            })
            .enableAutoConnect()
            .enableReconnection()
            .setReconnectionAttempts(_maxReconnectAttempts)
            .setReconnectionDelay(1000)
            .build(),
      );
      
      _setupEventListeners();
      
      if (userId != null && token != null) {
        // Autenticar después de conectar
        _socket?.emit('authenticate', {
          'token': token,
          'userId': userId,
        });
      }
      
    } catch (e) {
      _setError('Error conectando WebSocket: $e');
    }
  }
  
  /// Configurar listeners de eventos
  void _setupEventListeners() {
    _socket?.onConnect((_) {
      print('✅ WebSocket conectado');
      _isConnected = true;
      _reconnectAttempts = 0;
      _clearError();
      notifyListeners();
    });
    
    _socket?.onDisconnect((_) {
      print('❌ WebSocket desconectado');
      _isConnected = false;
      notifyListeners();
    });
    
    _socket?.onConnectError((error) {
      print('❌ Error de conexión WebSocket: $error');
      _setError('Error de conexión: $error');
      _isConnected = false;
      notifyListeners();
    });
    
    _socket?.onError((error) {
      print('❌ Error WebSocket: $error');
      _setError('Error: $error');
    });
    
    _socket?.on('authenticated', (data) {
      print('✅ WebSocket autenticado: $data');
    });
    
    _socket?.on('authentication_error', (data) {
      print('❌ Error de autenticación WebSocket: $data');
      _setError('Error de autenticación: ${data['error']}');
    });
    
    // Eventos específicos del sistema
    _socket?.on('new_checkin', (data) {
      _notifyListeners('new_checkin', data);
    });
    
    _socket?.on('new_checkout', (data) {
      _notifyListeners('new_checkout', data);
    });
    
    _socket?.on('attendance_updated', (data) {
      _notifyListeners('attendance_updated', data);
    });
    
    _socket?.on('new_message', (data) {
      _notifyListeners('new_message', data);
    });
    
    _socket?.on('system_alert', (data) {
      _notifyListeners('system_alert', data);
    });
    
    _socket?.on('backup_completed', (data) {
      _notifyListeners('backup_completed', data);
    });
    
    _socket?.on('backup_error', (data) {
      _notifyListeners('backup_error', data);
    });
    
    _socket?.on('daily_summary', (data) {
      _notifyListeners('daily_summary', data);
    });
    
    _socket?.on('birthdays_today', (data) {
      _notifyListeners('birthdays_today', data);
    });
    
    // Ping/Pong para mantener conexión
    _socket?.on('pong', (_) {
      print('🏓 WebSocket pong recibido');
    });
  }
  
  /// Desconectar WebSocket
  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _isConnected = false;
    _clearEventListeners();
    notifyListeners();
    print('🔌 WebSocket desconectado manualmente');
  }
  
  /// Enviar evento
  void emit(String event, dynamic data) {
    if (_socket?.connected == true) {
      _socket?.emit(event, data);
      print('📤 Enviado evento $event: $data');
    } else {
      print('❌ No se puede enviar evento $event: WebSocket no conectado');
    }
  }
  
  /// Unirse a sala por rol
  void joinRoleRoom(String role) {
    emit('join_role_room', role);
  }
  
  /// Enviar ping
  void ping() {
    emit('ping', {});
  }
  
  /// Registrar listener para evento específico
  void addEventListener(String event, Function callback) {
    _eventListeners[event] = callback;
  }
  
  /// Remover listener para evento específico
  void removeEventListener(String event) {
    _eventListeners.remove(event);
  }
  
  /// Notificar a listeners específicos
  void _notifyListeners(String event, dynamic data) {
    print('📥 Evento recibido $event: $data');
    
    if (_eventListeners.containsKey(event)) {
      try {
        _eventListeners[event]!(data);
      } catch (e) {
        print('❌ Error ejecutando listener para $event: $e');
      }
    }
    
    // También notificar cambios generales
    notifyListeners();
  }
  
  /// Limpiar listeners
  void _clearEventListeners() {
    _eventListeners.clear();
  }
  
  /// Reconectar manualmente
  Future<void> reconnect({String? token, String? userId}) async {
    if (_reconnectAttempts >= _maxReconnectAttempts) {
      _setError('Máximo número de intentos de reconexión alcanzado');
      return;
    }
    
    _reconnectAttempts++;
    disconnect();
    await Future.delayed(Duration(seconds: 2));
    await connect(token: token, userId: userId);
  }
  
  /// Obtener estado de conexión como string
  String getConnectionStatus() {
    if (_isConnected) {
      return 'Conectado';
    } else if (_reconnectAttempts > 0) {
      return 'Reconectando... ($_reconnectAttempts/$_maxReconnectAttempts)';
    } else {
      return 'Desconectado';
    }
  }
  
  /// Verificar si puede reconectar
  bool canReconnect() {
    return _reconnectAttempts < _maxReconnectAttempts;
  }
  
  // Helper methods
  void _setError(String error) {
    _error = error;
    notifyListeners();
  }
  
  void _clearError() {
    _error = null;
    notifyListeners();
  }
  
  @override
  void dispose() {
    disconnect();
    super.dispose();
  }
}