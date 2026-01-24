import 'package:flutter/material.dart';
import 'package:local_auth/local_auth.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:async';
import 'dart:io';
import 'fingerprint_enrollment_screen.dart';
import 'config_screen.dart';
import 'biometric_selector_screen.dart';
import '../services/config_service.dart';

/// 🔐 KIOSK BIOMÉTRICO CON HUELLA DACTILAR
/// ========================================
/// - Autenticación por huella dactilar
/// - Registro de asistencia automático
/// - Feedback visual y de voz
/// - Manejo de errores y re-enrollment

class FingerprintKioskScreen extends StatefulWidget {
  @override
  _FingerprintKioskScreenState createState() => _FingerprintKioskScreenState();
}

enum AuthState { ready, authenticating, success, failure, needsEnrollment }

class _FingerprintKioskScreenState extends State<FingerprintKioskScreen> with TickerProviderStateMixin {
  final LocalAuthentication _localAuth = LocalAuthentication();
  final FlutterTts _tts = FlutterTts();

  AuthState _authState = AuthState.ready;
  String _message = 'Coloque su dedo en el sensor';
  String? _employeeName;
  String? _employeeId;
  String? _deviceId;
  String? _serverUrl;
  int? _companyId;

  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  late AnimationController _successController;
  late Animation<double> _successAnimation;

  Timer? _resetTimer;

  @override
  void initState() {
    super.initState();
    _initializeTts();
    _initializeAnimations();
    _loadConfig();
    _getDeviceId();
    _speak('Kiosko de huella dactilar listo. Coloque su dedo en el sensor para marcar asistencia');
  }

  void _initializeAnimations() {
    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 1200),
      vsync: this,
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.2).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    _successController = AnimationController(
      duration: const Duration(milliseconds: 500),
      vsync: this,
    );

    _successAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _successController, curve: Curves.elasticOut),
    );
  }

  Future<void> _initializeTts() async {
    await _tts.setLanguage('es-ES');
    await _tts.setSpeechRate(0.85);
    await _tts.setVolume(1.0);
  }

  Future<void> _speak(String message) async {
    await _tts.speak(message);
  }

  Future<void> _loadConfig() async {
    try {
      _serverUrl = await ConfigService.getServerUrl();
      final kioskConfig = await ConfigService.getKioskConfig();
      final companyIdStr = kioskConfig['companyId'] as String?;
      setState(() {
        _companyId = companyIdStr != null ? int.tryParse(companyIdStr) : null;
      });
      print('🔧 [FINGERPRINT] Server: $_serverUrl | Company: $_companyId');
    } catch (e) {
      print('❌ [FINGERPRINT] Error cargando configuración: $e');
    }
  }

  Future<void> _getDeviceId() async {
    final deviceInfo = DeviceInfoPlugin();
    if (Theme.of(context).platform == TargetPlatform.android) {
      final androidInfo = await deviceInfo.androidInfo;
      setState(() {
        _deviceId = androidInfo.id;
      });
    } else if (Theme.of(context).platform == TargetPlatform.iOS) {
      final iosInfo = await deviceInfo.iosInfo;
      setState(() {
        _deviceId = iosInfo.identifierForVendor;
      });
    }
    print('🔧 [DEVICE] ID: $_deviceId');
  }

  Future<void> _authenticate() async {
    if (_authState == AuthState.authenticating) return;

    setState(() {
      _authState = AuthState.authenticating;
      _message = 'Escaneando huella...';
    });

    try {
      final bool authenticated = await _localAuth.authenticate(
        localizedReason: 'Verifique su identidad para marcar asistencia',
        options: const AuthenticationOptions(
          biometricOnly: true,
          stickyAuth: true,
        ),
      );

      if (authenticated) {
        await _handleSuccessfulAuth();
      } else {
        await _handleFailedAuth('Huella no reconocida');
      }

    } catch (e) {
      print('❌ [AUTH] Error: $e');

      if (e.toString().contains('NotEnrolled') || e.toString().contains('no fingerprint')) {
        await _handleNeedsEnrollment();
      } else {
        await _handleFailedAuth('Error al leer huella: ${e.toString()}');
      }
    }
  }

  Future<void> _handleSuccessfulAuth() async {
    // Aquí NO sabemos qué usuario es, solo que la huella es válida
    // Necesitamos verificar con el backend para obtener el user_id

    // Por ahora, usamos un flujo simplificado donde el usuario ingresa su legajo primero
    // En una implementación completa, necesitarías un sistema de identificación 1:N

    setState(() {
      _authState = AuthState.success;
      _message = 'Huella verificada. Ingrese su número de legajo';
    });

    _successController.forward(from: 0.0);
    await _speak('Huella verificada correctamente');

    // Mostrar diálogo para ingresar legajo
    _showEmployeeIdDialog();
  }

  void _showEmployeeIdDialog() {
    final TextEditingController legajoController = TextEditingController();

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(Icons.badge, color: Colors.blue, size: 32),
            SizedBox(width: 12),
            Text('Ingrese su Legajo'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Para completar el registro de asistencia, ingrese su número de legajo:',
              style: TextStyle(fontSize: 16),
            ),
            SizedBox(height: 16),
            TextField(
              controller: legajoController,
              autofocus: true,
              keyboardType: TextInputType.text,
              decoration: InputDecoration(
                labelText: 'Número de Legajo',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.badge_outlined),
              ),
              onSubmitted: (value) {
                Navigator.of(context).pop();
                _verifyAndMarkAttendance(value);
              },
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              _resetState();
            },
            child: Text('CANCELAR'),
          ),
          ElevatedButton(
            onPressed: () {
              final legajo = legajoController.text.trim();
              Navigator.of(context).pop();
              _verifyAndMarkAttendance(legajo);
            },
            child: Text('CONFIRMAR'),
          ),
        ],
      ),
    );
  }

  Future<void> _verifyAndMarkAttendance(String employeeId) async {
    if (employeeId.isEmpty) {
      await _handleFailedAuth('Debe ingresar un número de legajo');
      return;
    }

    setState(() {
      _authState = AuthState.authenticating;
      _message = 'Verificando identidad...';
    });

    try {
      final baseUrl = _serverUrl ?? 'https://www.aponnt.com';
      // Token: intentar secure storage, luego SharedPreferences
      String? token = await ConfigService.getAdminToken();
      if (token == null) {
        final prefs = await SharedPreferences.getInstance();
        token = prefs.getString('auth_token');
      }

      // 1. Buscar usuario por employeeId
      final userResponse = await http.get(
        Uri.parse('$baseUrl/api/v1/users/by-employee-id/$employeeId?companyId=$_companyId'),
        headers: {
          if (token != null) 'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      ).timeout(const Duration(seconds: 10));

      if (userResponse.statusCode != 200) {
        throw Exception('Empleado no encontrado (legajo: $employeeId)');
      }

      final userBody = json.decode(userResponse.body);
      final userData = userBody['data'] ?? userBody['user'] ?? userBody;
      final userId = userData['user_id'] ?? userData['id'];
      final fullName = '${userData['firstName'] ?? userData['first_name'] ?? ''} ${userData['lastName'] ?? userData['last_name'] ?? ''}'.trim();

      // 2. Verificar huella en backend
      final verifyResponse = await http.post(
        Uri.parse('$baseUrl/api/v1/biometric/fingerprint/verify'),
        headers: {
          if (token != null) 'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: json.encode({
          'user_id': userId,
          'company_id': _companyId,
          'device_id': _deviceId,
          'authenticated': true,
        }),
      ).timeout(const Duration(seconds: 10));

      final verifyData = json.decode(verifyResponse.body);

      if (verifyResponse.statusCode == 404 && verifyData['action'] == 'enroll_required') {
        await _showEnrollmentPrompt(userId, employeeId);
        return;
      }

      if (verifyResponse.statusCode != 200 || verifyData['success'] != true) {
        throw Exception(verifyData['message'] ?? 'Error al verificar huella');
      }

      // 3. Marcar asistencia
      final attendanceResponse = await http.post(
        Uri.parse('$baseUrl/api/v2/biometric-attendance/register'),
        headers: {
          if (token != null) 'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: json.encode({
          'employeeId': userId,
          'companyId': _companyId,
          'biometricType': 'fingerprint',
          'deviceId': _deviceId,
          'quality': 85.0,
        }),
      ).timeout(const Duration(seconds: 10));

      if (attendanceResponse.statusCode == 200 || attendanceResponse.statusCode == 201) {
        final attendanceData = json.decode(attendanceResponse.body);

        setState(() {
          _authState = AuthState.success;
          _employeeName = fullName;
          _employeeId = employeeId;
          _message = 'Asistencia registrada exitosamente';
        });

        await _speak('Bienvenido $fullName. Asistencia registrada exitosamente');

        _scheduleReset();
      } else {
        throw Exception('Error al registrar asistencia');
      }

    } catch (e) {
      print('❌ [VERIFY] Error: $e');
      await _handleFailedAuth('Error: ${e.toString()}');
    }
  }

  Future<void> _showEnrollmentPrompt(String userId, String employeeId) async {
    await _speak('No tiene huellas registradas. Desea registrarlas ahora?');

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(Icons.info, color: Colors.orange, size: 32),
            SizedBox(width: 12),
            Text('Registro Requerido'),
          ],
        ),
        content: Text(
          'No tiene huellas dactilares registradas en este dispositivo.\n\n¿Desea registrarlas ahora?',
          style: TextStyle(fontSize: 16),
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              _resetState();
            },
            child: Text('AHORA NO'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).pop();
              _navigateToEnrollment(userId, employeeId);
            },
            child: Text('REGISTRAR'),
          ),
        ],
      ),
    );
  }

  void _navigateToEnrollment(String userId, String employeeId) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => FingerprintEnrollmentScreen(
          userId: userId,
          companyId: _companyId!,
          employeeId: employeeId,
        ),
      ),
    ).then((success) {
      if (success == true) {
        _speak('Huellas registradas. Ahora puede marcar asistencia');
      }
      _resetState();
    });
  }

  Future<void> _handleNeedsEnrollment() async {
    setState(() {
      _authState = AuthState.needsEnrollment;
      _message = 'No hay huellas registradas en este dispositivo';
    });

    await _speak('No hay huellas registradas. Debe registrar sus huellas primero');
    _scheduleReset();
  }

  Future<void> _handleFailedAuth(String error) async {
    setState(() {
      _authState = AuthState.failure;
      _message = error;
    });

    await _speak(error);
    _scheduleReset();
  }

  void _scheduleReset() {
    _resetTimer?.cancel();
    _resetTimer = Timer(Duration(seconds: 3), _resetState);
  }

  void _resetState() {
    setState(() {
      _authState = AuthState.ready;
      _message = 'Coloque su dedo en el sensor';
      _employeeName = null;
      _employeeId = null;
    });
    _successController.reset();
  }

  void _navigateToConfig() {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => ConfigScreen()),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _successController.dispose();
    _resetTimer?.cancel();
    _tts.stop();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _getBackgroundColor(),
      appBar: AppBar(
        leading: IconButton(
          icon: Icon(Icons.arrow_back, color: Colors.white),
          tooltip: 'Volver al selector biométrico',
          onPressed: () {
            Navigator.of(context).pushReplacement(
              MaterialPageRoute(builder: (_) => BiometricSelectorScreen()),
            );
          },
        ),
        title: Text('Kiosko - Huella Dactilar', style: TextStyle(color: Colors.white)),
        backgroundColor: Colors.blue[900],
        elevation: 0,
        actions: [
          IconButton(
            icon: Icon(Icons.settings, color: Colors.white),
            onPressed: _navigateToConfig,
          ),
          IconButton(
            icon: Icon(Icons.exit_to_app, color: Colors.white),
            onPressed: () => exit(0),
          ),
        ],
      ),
      body: SafeArea(
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              SizedBox(height: 40),

              // Icono de huella con animación
              _buildFingerprintIcon(),

              SizedBox(height: 40),

              // Mensaje de estado
              Padding(
                padding: EdgeInsets.symmetric(horizontal: 32),
                child: Text(
                  _message,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),

              SizedBox(height: 20),

              // Información del empleado (si está disponible)
              if (_employeeName != null) ...[
                Text(
                  _employeeName!,
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                SizedBox(height: 8),
                Text(
                  'Legajo: $_employeeId',
                  style: TextStyle(
                    color: Colors.white70,
                    fontSize: 18,
                  ),
                ),
              ],

              SizedBox(height: 60),

              // Botón de autenticación (solo cuando está listo)
              if (_authState == AuthState.ready)
                ElevatedButton(
                  onPressed: _authenticate,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    padding: EdgeInsets.symmetric(horizontal: 48, vertical: 20),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(30),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.fingerprint, size: 32, color: Colors.blue[900]),
                      SizedBox(width: 12),
                      Text(
                        'MARCAR ASISTENCIA',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: Colors.blue[900],
                        ),
                      ),
                    ],
                  ),
                ),

              SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }

  Color _getBackgroundColor() {
    switch (_authState) {
      case AuthState.success:
        return Color(0xFF2E7D32); // Verde
      case AuthState.failure:
      case AuthState.needsEnrollment:
        return Color(0xFFC62828); // Rojo
      case AuthState.authenticating:
        return Color(0xFF1565C0); // Azul oscuro
      case AuthState.ready:
      default:
        return Color(0xFF0D47A1); // Azul
    }
  }

  Widget _buildFingerprintIcon() {
    if (_authState == AuthState.success) {
      return ScaleTransition(
        scale: _successAnimation,
        child: Icon(
          Icons.check_circle,
          size: 150,
          color: Colors.white,
        ),
      );
    } else if (_authState == AuthState.failure || _authState == AuthState.needsEnrollment) {
      return Icon(
        Icons.error,
        size: 150,
        color: Colors.white,
      );
    } else {
      return AnimatedBuilder(
        animation: _pulseAnimation,
        builder: (context, child) {
          return Transform.scale(
            scale: _authState == AuthState.authenticating ? _pulseAnimation.value : 1.0,
            child: Icon(
              Icons.fingerprint,
              size: 150,
              color: Colors.white,
            ),
          );
        },
      );
    }
  }
}
