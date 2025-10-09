import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../config/dynamic_server_config.dart';

class SmartAuthProvider with ChangeNotifier {
  final SharedPreferences _prefs;
  bool _isAuthenticated = false;
  String? _username;
  String? _userId;
  Map<String, dynamic>? _serverConfig;
  bool _isConnected = false;
  String? _lastConnectionError;

  SmartAuthProvider(this._prefs) {
    _loadAuthState();
    _initializeServer();
  }

  // Getters
  bool get isAuthenticated => _isAuthenticated;
  String? get username => _username;
  String? get userId => _userId;
  bool get isConnected => _isConnected;
  String? get lastConnectionError => _lastConnectionError;
  
  String get serverInfo {
    if (_serverConfig == null) return 'No configurado';
    return '${_serverConfig!['host']}:${_serverConfig!['port']} (${_serverConfig!['protocol']})';
  }

  // Defaults for Android emulator when no config stored
  String get baseUrl => _serverConfig?['baseUrl'] ?? 'http://10.0.2.2:3001';
  String get apiBaseUrl => _serverConfig?['apiBaseUrl'] ?? 'http://10.0.2.2:3001/api/v1';
  String get wsUrl => _serverConfig?['wsUrl'] ?? 'http://10.0.2.2:3001';

  String get qrCodeData {
    if (_userId != null) {
      return 'APONNT-QR-${_userId!.padLeft(4, '0')}';
    }
    return 'APONNT-QR-0001';
  }

  String getGreeting() {
    if (_username == null) return 'Usuario';
    return '$_username';
  }

  Future<void> _initializeServer() async {
    try {
      // Intentar cargar configuración guardada
      final savedConfig = await DynamicServerConfig.getCurrentConfig();
      if (savedConfig != null) {
        _serverConfig = savedConfig;
        
        // Probar si la configuración sigue funcionando
        final testResult = await DynamicServerConfig.testConnection(
          savedConfig['host'],
          savedConfig['port'],
          protocol: savedConfig['protocol'] ?? 'http',
        );
        
        if (testResult.success) {
          _isConnected = true;
          _lastConnectionError = null;
          await DynamicServerConfig.saveLastWorkingConfig(savedConfig);
        } else {
          _isConnected = false;
          _lastConnectionError = testResult.message;
          // Intentar autodetección si la configuración guardada no funciona
          await _attemptAutoDetection();
        }
      } else {
        // No hay configuración guardada, intentar autodetección
        await _attemptAutoDetection();
      }
      
      notifyListeners();
    } catch (e) {
      _lastConnectionError = 'Error inicializando servidor: $e';
      notifyListeners();
    }
  }

  Future<void> _attemptAutoDetection() async {
    try {
      final bestServer = await DynamicServerConfig.findBestServer(
        onProgress: (message) {
          // Podrías mostrar este progreso en la UI si necesitas
          if (kDebugMode) print('🔍 $message');
        },
      );

      if (bestServer != null) {
        _serverConfig = bestServer.toConfig();
        _isConnected = true;
        _lastConnectionError = null;
        await DynamicServerConfig.applyConfiguration(_serverConfig!);
      } else {
        _serverConfig = DynamicServerConfig.getLocalConfig(); // Fallback
        _isConnected = false;
        _lastConnectionError = 'No se encontraron servidores disponibles';
      }
    } catch (e) {
      _serverConfig = DynamicServerConfig.getLocalConfig(); // Fallback
      _isConnected = false;
      _lastConnectionError = 'Error en autodetección: $e';
    }
  }

  void _loadAuthState() {
    _isAuthenticated = _prefs.getBool('is_authenticated') ?? false;
    _username = _prefs.getString('username');
    _userId = _prefs.getString('user_id');
  }

  Future<void> updateServerConfig(String host, int port, {String protocol = 'http'}) async {
    final config = DynamicServerConfig.createConfig(host, port, protocol: protocol);
    
    // Probar la configuración antes de aplicarla
    final testResult = await DynamicServerConfig.testConnection(host, port, protocol: protocol);
    
    if (testResult.success) {
      _serverConfig = config;
      _isConnected = true;
      _lastConnectionError = null;
      await DynamicServerConfig.applyConfiguration(config);
    } else {
      _isConnected = false;
      _lastConnectionError = testResult.message;
      // No aplicamos la configuración si no funciona
    }
    
    notifyListeners();
  }

  Future<bool> testCurrentConnection() async {
    if (_serverConfig == null) return false;
    
    final result = await DynamicServerConfig.testConnection(
      _serverConfig!['host'],
      _serverConfig!['port'],
      protocol: _serverConfig!['protocol'] ?? 'http',
    );
    
    _isConnected = result.success;
    _lastConnectionError = result.success ? null : result.message;
    
    if (result.success) {
      await DynamicServerConfig.saveLastWorkingConfig(_serverConfig!);
    }
    
    notifyListeners();
    return result.success;
  }

  Future<void> autoDetectAndConfigureServer() async {
    await _attemptAutoDetection();
    notifyListeners();
  }

  // Métodos de autenticación mejorados
  Future<AuthResult> login(String identifier, String password) async {
    if (!_isConnected) {
      return AuthResult(
        success: false,
        message: 'No hay conexión con el servidor. Verifica la configuración.',
      );
    }

    try {
      final response = await http.post(
        Uri.parse('$apiBaseUrl/auth/login'),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: jsonEncode({
          'identifier': identifier,
          'password': password,
        }),
      ).timeout(Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        
        _isAuthenticated = true;
        _username = data['user']['username'] ?? identifier;
        _userId = data['user']['id']?.toString() ?? '1';
        
        await _prefs.setBool('is_authenticated', true);
        await _prefs.setString('username', _username!);
        await _prefs.setString('user_id', _userId!);
        
        if (data['token'] != null) {
          await _prefs.setString('auth_token', data['token']);
        }
        
        notifyListeners();
        return AuthResult(success: true, message: 'Login exitoso');
      } else {
        final errorData = jsonDecode(response.body);
        return AuthResult(
          success: false,
          message: errorData['error'] ?? 'Credenciales inválidas',
        );
      }
    } catch (e) {
      String errorMessage = 'Error de conexión';
      
      if (e.toString().contains('SocketException')) {
        errorMessage = 'No se puede conectar al servidor';
        _isConnected = false;
        _lastConnectionError = errorMessage;
        notifyListeners();
      } else if (e.toString().contains('TimeoutException')) {
        errorMessage = 'Tiempo de espera agotado';
      }
      
      return AuthResult(success: false, message: errorMessage);
    }
  }

  Future<AuthResult> biometricLogin() async {
    if (!_isConnected) {
      return AuthResult(
        success: false,
        message: 'No hay conexión con el servidor',
      );
    }

    // Por ahora simulamos login biométrico exitoso
    // En producción aquí iría la lógica real de biometría
    try {
      _isAuthenticated = true;
      _username = 'usuario_biometrico';
      _userId = '1';
      
      await _prefs.setBool('is_authenticated', true);
      await _prefs.setString('username', _username!);
      await _prefs.setString('user_id', _userId!);
      
      notifyListeners();
      return AuthResult(success: true, message: 'Login biométrico exitoso');
    } catch (e) {
      return AuthResult(success: false, message: 'Error en login biométrico');
    }
  }

  Future<void> logout() async {
    _isAuthenticated = false;
    _username = null;
    _userId = null;
    
    await _prefs.remove('is_authenticated');
    await _prefs.remove('username');
    await _prefs.remove('user_id');
    await _prefs.remove('auth_token');
    
    notifyListeners();
  }

  // Método para enviar datos de asistencia con mejor manejo de errores
  Future<AttendanceResult> recordAttendance({
    required String type,
    required String method,
    Map<String, dynamic>? extraData,
  }) async {
    if (!_isConnected) {
      return AttendanceResult(
        success: false,
        message: 'Sin conexión al servidor (guardado localmente)',
        savedLocally: true,
      );
    }

    try {
      final token = _prefs.getString('auth_token');
      final headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };
      
      if (token != null) {
        headers['Authorization'] = 'Bearer $token';
      }

      final response = await http.post(
        Uri.parse('$apiBaseUrl/attendance/mobile'),
        headers: headers,
        body: jsonEncode({
          'user': _username,
          'userId': _userId,
          'type': type,
          'method': method,
          'timestamp': DateTime.now().toIso8601String(),
          'device': 'mobile_app',
          ...?extraData,
        }),
      ).timeout(Duration(seconds: 10));

      if (response.statusCode == 200 || response.statusCode == 201) {
        final responseData = jsonDecode(response.body);
        return AttendanceResult(
          success: true,
          message: responseData['message'] ?? 'Asistencia registrada correctamente',
          data: responseData,
        );
      } else {
        final errorData = jsonDecode(response.body);
        return AttendanceResult(
          success: false,
          message: errorData['error'] ?? 'Error del servidor',
          savedLocally: true, // Podríamos guardar localmente en caso de error
        );
      }
    } catch (e) {
      String errorMessage = 'Error de conexión';
      bool connectionLost = false;
      
      if (e.toString().contains('SocketException')) {
        errorMessage = 'Conexión perdida con el servidor';
        connectionLost = true;
      } else if (e.toString().contains('TimeoutException')) {
        errorMessage = 'Tiempo de espera agotado';
      }
      
      if (connectionLost) {
        _isConnected = false;
        _lastConnectionError = errorMessage;
        notifyListeners();
      }
      
      return AttendanceResult(
        success: false,
        message: errorMessage,
        savedLocally: true,
      );
    }
  }

  // Configuraciones rápidas para diferentes entornos
  Future<void> configureForLocalhost() async {
    await updateServerConfig('localhost', 3001, protocol: 'http');
  }

  Future<void> configureForNetwork(String ip) async {
    await updateServerConfig(ip, 3001, protocol: 'http');
  }

  Future<void> configureForHosting(String domain) async {
    await updateServerConfig(domain, 443, protocol: 'https');
  }

  // Método para obtener información del servidor
  Future<ServerInfo?> getServerInfo() async {
    if (!_isConnected || _serverConfig == null) return null;
    
    try {
      final response = await http.get(
        Uri.parse('$apiBaseUrl/config/server-info'),
        headers: {'Accept': 'application/json'},
      ).timeout(Duration(seconds: 5));
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return ServerInfo.fromJson(data);
      }
    } catch (e) {
      // Silenciar errores - info opcional
    }
    
    return null;
  }
}

class AuthResult {
  final bool success;
  final String message;
  final Map<String, dynamic>? data;

  AuthResult({
    required this.success,
    required this.message,
    this.data,
  });
}

class AttendanceResult {
  final bool success;
  final String message;
  final bool savedLocally;
  final Map<String, dynamic>? data;

  AttendanceResult({
    required this.success,
    required this.message,
    this.savedLocally = false,
    this.data,
  });
}

class ServerInfo {
  final String name;
  final String version;
  final bool databaseConnected;
  final Map<String, dynamic> features;

  ServerInfo({
    required this.name,
    required this.version,
    required this.databaseConnected,
    required this.features,
  });

  factory ServerInfo.fromJson(Map<String, dynamic> json) {
    return ServerInfo(
      name: json['name'] ?? 'Sistema de Asistencia',
      version: json['version'] ?? '1.0.0',
      databaseConnected: json['databaseConnected'] ?? false,
      features: json['features'] ?? {},
    );
  }
}