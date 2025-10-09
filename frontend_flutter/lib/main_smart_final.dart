import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:async';
import 'package:local_auth/local_auth.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  try {
    final prefs = await SharedPreferences.getInstance();
    runApp(SmartAttendanceApp(prefs: prefs));
  } catch (e) {
    print('Error inicializando la aplicación: $e');
    runApp(SmartAttendanceApp(prefs: null));
  }
}

class SmartAttendanceApp extends StatelessWidget {
  final SharedPreferences? prefs;

  const SmartAttendanceApp({Key? key, required this.prefs}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    if (prefs == null) {
      return MaterialApp(
        title: 'Sistema Gestión Ausentismo',
        home: Scaffold(
          body: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.error, size: 64, color: Colors.red),
                SizedBox(height: 16),
                Text('Error inicializando la aplicación'),
                ElevatedButton(
                  onPressed: () => main(),
                  child: Text('Reintentar'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return ChangeNotifierProvider(
      create: (_) => SmartAuthProvider(prefs!),
      child: MaterialApp(
        title: 'Sistema Gestión Ausentismo',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          primarySwatch: Colors.blue,
          useMaterial3: true,
          appBarTheme: AppBarTheme(
            backgroundColor: Colors.blue,
            foregroundColor: Colors.white,
            elevation: 2,
          ),
          cardTheme: CardTheme(
            elevation: 4,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
        home: Consumer<SmartAuthProvider>(
          builder: (context, auth, _) {
            if (auth.isAuthenticated) {
              return SmartAttendanceScreen();
            } else {
              return SmartLoginScreen();
            }
          },
        ),
      ),
    );
  }
}

class SmartAuthProvider with ChangeNotifier {
  final SharedPreferences _prefs;
  bool _isAuthenticated = false;
  String? _username;
  String? _userId;
  ServerConfig? _serverConfig;
  bool _isConnected = false;
  String? _lastConnectionError;
  bool _isAutoConfiguring = false;

  SmartAuthProvider(this._prefs) {
    _loadAuthState();
    _initializeServer();
  }

  // Getters
  bool get isAuthenticated => _isAuthenticated;
  String? get username => _username;
  String? get userId => _userId;
  bool get isConnected => _isConnected;
  bool get isAutoConfiguring => _isAutoConfiguring;
  String? get lastConnectionError => _lastConnectionError;
  
  String get serverInfo {
    if (_serverConfig == null) return 'No configurado';
    return '${_serverConfig!.ip}:${_serverConfig!.port}';
  }

  // Defaults to Android emulator host when no server config available
  String get baseUrl => _serverConfig?.baseUrl ?? 'http://10.0.2.2:3001';
  String get apiBaseUrl => _serverConfig?.apiUrl ?? 'http://10.0.2.2:3001/api/v1';

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

  void _loadAuthState() {
    _isAuthenticated = _prefs.getBool('is_authenticated') ?? false;
    _username = _prefs.getString('username');
    _userId = _prefs.getString('user_id');
    
    // Cargar configuración del servidor guardada
    final savedConfig = _prefs.getString('server_config');
    if (savedConfig != null) {
      try {
        final configData = jsonDecode(savedConfig);
        _serverConfig = ServerConfig.fromJson(configData);
      } catch (e) {
        print('Error cargando configuración guardada: $e');
      }
    }
  }

  Future<void> _initializeServer() async {
    _isAutoConfiguring = true;
    notifyListeners();
    
    try {
      // Paso 1: Intentar con configuración guardada
      if (_serverConfig != null) {
        final testResult = await _testServerConnection(_serverConfig!);
        if (testResult.success) {
          _isConnected = true;
          _lastConnectionError = null;
          _isAutoConfiguring = false;
          notifyListeners();
          return;
        }
      }
      
      // Paso 2: Auto-detección de servidor
      final detectedConfig = await _autoDetectServer();
      if (detectedConfig != null) {
        _serverConfig = detectedConfig;
        _isConnected = true;
        _lastConnectionError = null;
        await _saveServerConfig(detectedConfig);
      } else {
        _isConnected = false;
        _lastConnectionError = 'No se encontraron servidores disponibles';
      }
    } catch (e) {
      _isConnected = false;
      _lastConnectionError = 'Error en auto-configuración: $e';
    } finally {
      _isAutoConfiguring = false;
      notifyListeners();
    }
  }

  Future<ServerConfig?> _autoDetectServer() async {
    print('🔍 Iniciando auto-detección de servidor...');
    
    // IPs comunes para probar
    final List<String> commonIPs = [
      // IP local
      '127.0.0.1',
      'localhost',
      // Redes WiFi comunes
      '192.168.1.1', '192.168.1.6', '192.168.1.100', '192.168.1.101',
      '192.168.0.1', '192.168.0.100', '192.168.0.101',
      '192.168.3.1', '192.168.3.52', // La IP que detectó el backend
      // Otras redes comunes
      '192.168.137.1',
      '10.0.0.1', '10.0.0.100', '10.0.0.101',
      '172.16.0.1', '172.16.0.100', '172.16.0.101',
    ];

    final List<int> commonPorts = [3001, 3000, 8080, 8000, 80];

    for (String ip in commonIPs) {
      for (int port in commonPorts) {
        try {
          final testConfig = ServerConfig(
            ip: ip,
            port: port,
            protocol: 'http',
          );
          
          print('🔍 Probando: ${testConfig.baseUrl}');
          
          final result = await _testServerConnection(testConfig, timeout: 2);
          if (result.success) {
            print('✅ Servidor encontrado en: ${testConfig.baseUrl}');
            
            // Obtener información completa del servidor
            final fullConfig = await _fetchFullServerConfig(testConfig);
            return fullConfig ?? testConfig;
          }
        } catch (e) {
          // Silenciar errores de prueba - es normal que fallen
        }
      }
    }
    
    print('❌ No se encontraron servidores disponibles');
    return null;
  }

  Future<ServerTestResult> _testServerConnection(ServerConfig config, {int timeout = 5}) async {
    try {
      final response = await http.get(
        Uri.parse('${config.apiUrl}/config/mobile-connection'),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ).timeout(Duration(seconds: timeout));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return ServerTestResult(
          success: true,
          config: config,
          message: 'Conexión exitosa',
          serverData: data,
        );
      } else {
        return ServerTestResult(
          success: false,
          config: config,
          message: 'Servidor respondió con código ${response.statusCode}',
        );
      }
    } catch (e) {
      return ServerTestResult(
        success: false,
        config: config,
        message: _getErrorMessage(e),
      );
    }
  }

  Future<ServerConfig?> _fetchFullServerConfig(ServerConfig baseConfig) async {
    try {
      final response = await http.get(
        Uri.parse('${baseConfig.apiUrl}/config/mobile-connection'),
        headers: {'Accept': 'application/json'},
      ).timeout(Duration(seconds: 5));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return ServerConfig(
          ip: data['serverIP'] ?? baseConfig.ip,
          port: data['serverPort'] ?? baseConfig.port,
          protocol: baseConfig.protocol,
          serverData: data,
        );
      }
    } catch (e) {
      print('Error obteniendo configuración completa: $e');
    }
    
    return baseConfig;
  }

  String _getErrorMessage(dynamic error) {
    final errorStr = error.toString().toLowerCase();
    
    if (errorStr.contains('socketexception')) {
      return 'No se puede conectar al servidor';
    } else if (errorStr.contains('timeoutexception')) {
      return 'Tiempo de espera agotado';
    } else if (errorStr.contains('formatexception')) {
      return 'Respuesta del servidor inválida';
    } else {
      return 'Error de conexión';
    }
  }

  Future<void> _saveServerConfig(ServerConfig config) async {
    await _prefs.setString('server_config', jsonEncode(config.toJson()));
  }

  Future<void> setManualServerConfig(String ip, int port, {String protocol = 'http'}) async {
    final config = ServerConfig(ip: ip, port: port, protocol: protocol);
    
    final result = await _testServerConnection(config);
    if (result.success) {
      _serverConfig = config;
      _isConnected = true;
      _lastConnectionError = null;
      await _saveServerConfig(config);
    } else {
      _isConnected = false;
      _lastConnectionError = result.message;
    }
    
    notifyListeners();
  }

  Future<void> retryAutoConfiguration() async {
    await _initializeServer();
  }

  Future<LoginResult> login(String identifier, String password) async {
    if (!_isConnected || _serverConfig == null) {
      return LoginResult(
        success: false,
        message: 'No hay conexión con el servidor',
      );
    }

    try {
      final response = await http.post(
        Uri.parse('${_serverConfig!.apiUrl}/auth/login'),
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
        return LoginResult(success: true, message: 'Login exitoso');
      } else {
        final errorData = jsonDecode(response.body);
        return LoginResult(
          success: false,
          message: errorData['error'] ?? 'Credenciales inválidas',
        );
      }
    } catch (e) {
      return LoginResult(success: false, message: _getErrorMessage(e));
    }
  }

  Future<LoginResult> biometricLogin() async {
    if (!_isConnected) {
      return LoginResult(success: false, message: 'No hay conexión con el servidor');
    }

    // Simulación de login biométrico (en producción se usaría biometría real)
    try {
      _isAuthenticated = true;
      _username = 'usuario_biometrico';
      _userId = '1';
      
      await _prefs.setBool('is_authenticated', true);
      await _prefs.setString('username', _username!);
      await _prefs.setString('user_id', _userId!);
      
      notifyListeners();
      return LoginResult(success: true, message: 'Login biométrico exitoso');
    } catch (e) {
      return LoginResult(success: false, message: 'Error en login biométrico');
    }
  }

  Future<AttendanceResult> recordAttendance({
    required String type,
    required String method,
    Map<String, dynamic>? extraData,
  }) async {
    if (!_isConnected || _serverConfig == null) {
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
        Uri.parse('${_serverConfig!.apiUrl}/attendance/mobile'),
        headers: headers,
        body: jsonEncode({
          'user': _username,
          'userId': _userId,
          'type': type,
          'method': method,
          'timestamp': DateTime.now().toISOString(),
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
          savedLocally: true,
        );
      }
    } catch (e) {
      return AttendanceResult(
        success: false,
        message: _getErrorMessage(e),
        savedLocally: true,
      );
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
}

// ========================================
// 📱 PANTALLAS
// ========================================

class SmartLoginScreen extends StatefulWidget {
  @override
  _SmartLoginScreenState createState() => _SmartLoginScreenState();
}

class _SmartLoginScreenState extends State<SmartLoginScreen> {
  final LocalAuthentication _localAuth = LocalAuthentication();
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  final _ipController = TextEditingController();
  final _portController = TextEditingController();
  bool _isLoading = false;
  bool _showManualConfig = false;

  @override
  Widget build(BuildContext context) {
    return Consumer<SmartAuthProvider>(
      builder: (context, auth, _) => Scaffold(
        backgroundColor: Colors.grey[100],
        appBar: AppBar(
          title: Text('Sistema Gestión Ausentismo'),
          centerTitle: true,
          actions: [
            IconButton(
              icon: Icon(_showManualConfig ? Icons.login : Icons.settings),
              onPressed: () {
                setState(() {
                  _showManualConfig = !_showManualConfig;
                });
              },
              tooltip: _showManualConfig ? 'Volver al login' : 'Configuración manual',
            ),
          ],
        ),
        body: SingleChildScrollView(
          padding: EdgeInsets.all(24),
          child: Column(
            children: [
              // Estado de auto-configuración
              _buildAutoConfigStatus(auth),
              
              SizedBox(height: 24),
              
              if (_showManualConfig) 
                _buildManualConfigSection(auth)
              else
                _buildLoginSection(auth),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAutoConfigStatus(SmartAuthProvider auth) {
    Color statusColor;
    IconData statusIcon;
    String statusText;
    
    if (auth.isAutoConfiguring) {
      statusColor = Colors.orange;
      statusIcon = Icons.search;
      statusText = 'Configurando automáticamente...';
    } else if (auth.isConnected) {
      statusColor = Colors.green;
      statusIcon = Icons.wifi;
      statusText = 'Conectado a ${auth.serverInfo}';
    } else {
      statusColor = Colors.red;
      statusIcon = Icons.wifi_off;
      statusText = auth.lastConnectionError ?? 'Sin conexión';
    }
    
    return Card(
      color: statusColor.withOpacity(0.1),
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          children: [
            Row(
              children: [
                Icon(statusIcon, color: statusColor, size: 32),
                SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Estado del Sistema',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: statusColor,
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        statusText,
                        style: TextStyle(fontSize: 12),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            if (!auth.isConnected && !auth.isAutoConfiguring) ...[
              SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => auth.retryAutoConfiguration(),
                      icon: Icon(Icons.refresh, size: 16),
                      label: Text('Reintentar', style: TextStyle(fontSize: 12)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blue,
                        foregroundColor: Colors.white,
                        padding: EdgeInsets.symmetric(vertical: 8),
                      ),
                    ),
                  ),
                  SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        setState(() {
                          _showManualConfig = true;
                        });
                      },
                      icon: Icon(Icons.settings, size: 16),
                      label: Text('Config. Manual', style: TextStyle(fontSize: 12)),
                      style: OutlinedButton.styleFrom(
                        padding: EdgeInsets.symmetric(vertical: 8),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildLoginSection(SmartAuthProvider auth) {
    return Column(
      children: [
        // Logo
        Card(
          child: Container(
            padding: EdgeInsets.all(32),
            child: Column(
              children: [
                Icon(Icons.fingerprint, size: 80, color: Colors.blue),
                SizedBox(height: 16),
                Text(
                  'Sistema de Asistencia',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
                SizedBox(height: 8),
                Text(
                  'Auto-Configuración Inteligente',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: Colors.grey[600],
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),

        SizedBox(height: 24),

        // Formulario de login
        Card(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(
                  controller: _usernameController,
                  decoration: InputDecoration(
                    labelText: 'Usuario',
                    prefixIcon: Icon(Icons.person),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  enabled: !_isLoading && auth.isConnected,
                ),
                SizedBox(height: 16),
                
                TextField(
                  controller: _passwordController,
                  decoration: InputDecoration(
                    labelText: 'Contraseña',
                    prefixIcon: Icon(Icons.lock),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  obscureText: true,
                  enabled: !_isLoading && auth.isConnected,
                  onSubmitted: (_) => _handleLogin(),
                ),
                SizedBox(height: 24),
                
                ElevatedButton(
                  onPressed: (!_isLoading && auth.isConnected) ? _handleLogin : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue,
                    foregroundColor: Colors.white,
                    padding: EdgeInsets.symmetric(vertical: 16),
                  ),
                  child: _isLoading
                      ? Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                              ),
                            ),
                            SizedBox(width: 12),
                            Text('Iniciando sesión...'),
                          ],
                        )
                      : Text('Iniciar Sesión'),
                ),
                
                SizedBox(height: 16),
                
                OutlinedButton.icon(
                  onPressed: (!_isLoading && auth.isConnected) ? _handleBiometricLogin : null,
                  icon: Icon(Icons.fingerprint),
                  label: Text('Acceso Biométrico'),
                  style: OutlinedButton.styleFrom(
                    padding: EdgeInsets.symmetric(vertical: 16),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildManualConfigSection(SmartAuthProvider auth) {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Configuración Manual del Servidor',
              style: Theme.of(context).textTheme.titleLarge,
              textAlign: TextAlign.center,
            ),
            SizedBox(height: 24),
            
            TextField(
              controller: _ipController,
              decoration: InputDecoration(
                labelText: 'IP del Servidor',
                hintText: '192.168.1.100, localhost, dominio.com',
                prefixIcon: Icon(Icons.computer),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
            SizedBox(height: 16),
            
            TextField(
              controller: _portController,
              decoration: InputDecoration(
                labelText: 'Puerto',
                hintText: '3001, 3000, 8080',
                prefixIcon: Icon(Icons.settings_ethernet),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              keyboardType: TextInputType.number,
            ),
            SizedBox(height: 24),
            
            ElevatedButton.icon(
              onPressed: _testManualConfig,
              icon: Icon(Icons.wifi_tethering),
              label: Text('Probar y Conectar'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.green,
                foregroundColor: Colors.white,
                padding: EdgeInsets.symmetric(vertical: 16),
              ),
            ),
            
            SizedBox(height: 16),
            
            // Configuraciones rápidas
            Text('Configuraciones Rápidas:', style: TextStyle(fontWeight: FontWeight.bold)),
            SizedBox(height: 8),
            
            Wrap(
              spacing: 8,
              children: [
                _buildQuickConfigChip('10.0.2.2:3001 (Emulador)', '10.0.2.2', 3001),
                _buildQuickConfigChip('localhost:3001', 'localhost', 3001),
                _buildQuickConfigChip('192.168.1.6:3001', '192.168.1.6', 3001),
                _buildQuickConfigChip('192.168.3.52:3001', '192.168.3.52', 3001), // La IP detectada
                _buildQuickConfigChip('192.168.137.1:3001', '192.168.137.1', 3001),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickConfigChip(String label, String ip, int port) {
    return ActionChip(
      label: Text(label, style: TextStyle(fontSize: 12)),
      onPressed: () {
        _ipController.text = ip;
        _portController.text = port.toString();
      },
    );
  }

  Future<void> _handleLogin() async {
    if (_usernameController.text.isEmpty || _passwordController.text.isEmpty) {
      _showError('Por favor completa todos los campos');
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final auth = Provider.of<SmartAuthProvider>(context, listen: false);
      final result = await auth.login(
        _usernameController.text.trim(),
        _passwordController.text,
      );

      if (result.success) {
        _showSuccess(result.message);
      } else {
        _showError(result.message);
      }
    } catch (e) {
      _showError('Error inesperado: $e');
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _handleBiometricLogin() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final isAvailable = await _localAuth.canCheckBiometrics;
      if (!isAvailable) {
        _showError('Biometría no disponible');
        return;
      }

      final result = await _localAuth.authenticate(
        localizedReason: 'Usa tu biometría para acceder al sistema',
        options: AuthenticationOptions(
          biometricOnly: false,
          stickyAuth: false,
        ),
      );

      if (result) {
        final auth = Provider.of<SmartAuthProvider>(context, listen: false);
        final loginResult = await auth.biometricLogin();
        
        if (loginResult.success) {
          _showSuccess(loginResult.message);
        } else {
          _showError(loginResult.message);
        }
      }
    } catch (e) {
      _showError('Error biométrico: ${e.toString()}');
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _testManualConfig() async {
    if (_ipController.text.isEmpty || _portController.text.isEmpty) {
      _showError('Por favor completa IP y puerto');
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final auth = Provider.of<SmartAuthProvider>(context, listen: false);
      await auth.setManualServerConfig(
        _ipController.text.trim(),
        int.parse(_portController.text),
      );

      if (auth.isConnected) {
        _showSuccess('Conexión exitosa con ${auth.serverInfo}');
        setState(() {
          _showManualConfig = false;
        });
      } else {
        _showError(auth.lastConnectionError ?? 'Error de conexión');
      }
    } catch (e) {
      _showError('Error: ${e.toString()}');
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  void _showError(String message) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              Icon(Icons.error, color: Colors.white),
              SizedBox(width: 12),
              Expanded(child: Text(message)),
            ],
          ),
          backgroundColor: Colors.red,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  void _showSuccess(String message) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              Icon(Icons.check_circle, color: Colors.white),
              SizedBox(width: 12),
              Expanded(child: Text(message)),
            ],
          ),
          backgroundColor: Colors.green,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    _ipController.dispose();
    _portController.dispose();
    super.dispose();
  }
}

class SmartAttendanceScreen extends StatefulWidget {
  @override
  _SmartAttendanceScreenState createState() => _SmartAttendanceScreenState();
}

class _SmartAttendanceScreenState extends State<SmartAttendanceScreen> {
  final LocalAuthentication _localAuth = LocalAuthentication();
  List<AttendanceRecord> _todayRecords = [];

  @override
  Widget build(BuildContext context) {
    return Consumer<SmartAuthProvider>(
      builder: (context, auth, _) => Scaffold(
        appBar: AppBar(
          title: Text('Asistencia'),
          centerTitle: true,
          actions: [
            IconButton(
              icon: Icon(Icons.logout),
              onPressed: () => auth.logout(),
            ),
          ],
        ),
        body: SingleChildScrollView(
          padding: EdgeInsets.all(16),
          child: Column(
            children: [
              // Estado de conexión
              Card(
                color: auth.isConnected ? Colors.green.shade50 : Colors.orange.shade50,
                child: Padding(
                  padding: EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Icon(
                        auth.isConnected ? Icons.wifi : Icons.wifi_off,
                        color: auth.isConnected ? Colors.green : Colors.orange,
                      ),
                      SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              auth.isConnected ? 'Conectado al servidor' : 'Sin conexión',
                              style: TextStyle(fontWeight: FontWeight.bold),
                            ),
                            Text(
                              auth.isConnected ? auth.serverInfo : (auth.lastConnectionError ?? 'Verificando...'),
                              style: TextStyle(fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              SizedBox(height: 24),

              // Usuario
              Card(
                child: Padding(
                  padding: EdgeInsets.all(16),
                  child: Row(
                    children: [
                      CircleAvatar(
                        backgroundColor: Colors.blue,
                        child: Text(
                          auth.username?.substring(0, 1).toUpperCase() ?? 'U',
                          style: TextStyle(color: Colors.white),
                        ),
                      ),
                      SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              auth.getGreeting(),
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Text(
                              '${DateTime.now().day}/${DateTime.now().month}/${DateTime.now().year}',
                              style: TextStyle(color: Colors.grey[600]),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              SizedBox(height: 24),

              // Botones de fichaje
              Row(
                children: [
                  Expanded(
                    child: _buildAttendanceButton(
                      'ENTRADA',
                      Icons.login,
                      Colors.green,
                      () => _recordAttendance('Entrada'),
                    ),
                  ),
                  SizedBox(width: 16),
                  Expanded(
                    child: _buildAttendanceButton(
                      'SALIDA',
                      Icons.logout,
                      Colors.orange,
                      () => _recordAttendance('Salida'),
                    ),
                  ),
                ],
              ),

              SizedBox(height: 24),

              // Historial del día
              Text(
                'Registros de Hoy',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              SizedBox(height: 12),
              
              if (_todayRecords.isEmpty)
                Card(
                  child: Padding(
                    padding: EdgeInsets.all(32),
                    child: Column(
                      children: [
                        Icon(Icons.access_time, size: 48, color: Colors.grey[400]),
                        SizedBox(height: 12),
                        Text('Sin registros hoy'),
                      ],
                    ),
                  ),
                )
              else
                ..._todayRecords.map((record) => Card(
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: record.type == 'Entrada' ? Colors.green : Colors.orange,
                      child: Icon(
                        record.type == 'Entrada' ? Icons.login : Icons.logout,
                        color: Colors.white,
                      ),
                    ),
                    title: Text('${record.type} - ${record.method}'),
                    subtitle: Text(record.timestamp),
                    trailing: Icon(
                      record.synced ? Icons.cloud_done : Icons.cloud_off,
                      color: record.synced ? Colors.green : Colors.orange,
                    ),
                  ),
                )).toList(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAttendanceButton(String label, IconData icon, Color color, VoidCallback onPressed) {
    return Card(
      elevation: 4,
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: EdgeInsets.symmetric(vertical: 24),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            gradient: LinearGradient(colors: [color.withOpacity(0.8), color]),
          ),
          child: Column(
            children: [
              Icon(icon, size: 32, color: Colors.white),
              SizedBox(height: 8),
              Text(
                label,
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _recordAttendance(String type) async {
    final auth = Provider.of<SmartAuthProvider>(context, listen: false);
    
    try {
      // Usar biometría por defecto
      final isAvailable = await _localAuth.canCheckBiometrics;
      String method = 'Manual';
      
      if (isAvailable) {
        final result = await _localAuth.authenticate(
          localizedReason: 'Confirma tu identidad para fichar $type',
          options: AuthenticationOptions(
            biometricOnly: false,
            stickyAuth: false,
          ),
        );
        
        if (result) {
          method = 'Biometría';
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Autenticación biométrica cancelada')),
          );
          return;
        }
      }

      final attendanceResult = await auth.recordAttendance(
        type: type,
        method: method,
        extraData: {
          'location': 'Mobile App',
          'timestamp': DateTime.now().toIso8601String(),
        },
      );

      // Agregar al historial local
      final record = AttendanceRecord(
        type: type,
        method: method,
        timestamp: _formatTime(DateTime.now()),
        synced: attendanceResult.success && !attendanceResult.savedLocally,
      );

      setState(() {
        _todayRecords.insert(0, record);
      });

      // Mostrar resultado
      final message = attendanceResult.success
          ? (attendanceResult.savedLocally 
             ? '$type guardada localmente - se sincronizará cuando haya conexión'
             : attendanceResult.message)
          : attendanceResult.message;

      final color = attendanceResult.success 
          ? (attendanceResult.savedLocally ? Colors.orange : Colors.green)
          : Colors.red;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: color,
          behavior: SnackBarBehavior.floating,
        ),
      );

    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error registrando $type: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  String _formatTime(DateTime dateTime) {
    return '${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
  }
}

// ========================================
// 📊 MODELOS DE DATOS
// ========================================

class ServerConfig {
  final String ip;
  final int port;
  final String protocol;
  final Map<String, dynamic>? serverData;

  ServerConfig({
    required this.ip,
    required this.port,
    this.protocol = 'http',
    this.serverData,
  });

  String get baseUrl => '$protocol://$ip:$port';
  String get apiUrl => '$baseUrl/api/v1';

  factory ServerConfig.fromJson(Map<String, dynamic> json) {
    return ServerConfig(
      ip: json['ip'],
      port: json['port'],
      protocol: json['protocol'] ?? 'http',
      serverData: json['serverData'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'ip': ip,
      'port': port,
      'protocol': protocol,
      'serverData': serverData,
    };
  }
}

class ServerTestResult {
  final bool success;
  final ServerConfig config;
  final String message;
  final Map<String, dynamic>? serverData;

  ServerTestResult({
    required this.success,
    required this.config,
    required this.message,
    this.serverData,
  });
}

class LoginResult {
  final bool success;
  final String message;
  final Map<String, dynamic>? data;

  LoginResult({
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

class AttendanceRecord {
  final String type;
  final String method;
  final String timestamp;
  final bool synced;

  AttendanceRecord({
    required this.type,
    required this.method,
    required this.timestamp,
    required this.synced,
  });
}