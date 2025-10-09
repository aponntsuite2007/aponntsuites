import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart' as http_parser;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'dart:convert';
import 'dart:async';
import '../services/config_service.dart';

class PasswordAuthScreen extends StatefulWidget {
  const PasswordAuthScreen({Key? key}) : super(key: key);

  @override
  State<PasswordAuthScreen> createState() => _PasswordAuthScreenState();
}

class _PasswordAuthScreenState extends State<PasswordAuthScreen> {
  // 📝 CONTROLADORES DE FORMULARIO
  final _legajoController = TextEditingController();
  final _passwordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  // 🎥 CÁMARA
  CameraController? _cameraController;
  List<CameraDescription>? _cameras;
  bool _isCameraInitialized = false;

  // 🌐 CONFIGURACIÓN
  String? _serverUrl;
  String? _companyId;
  String? _deviceId;

  // 🔄 ESTADO
  bool _isAuthenticating = false;
  bool _showPassword = false;

  @override
  void initState() {
    super.initState();
    _loadConfiguration();
    _initializeCamera();
  }

  /// 📡 CARGAR CONFIGURACIÓN
  Future<void> _loadConfiguration() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _companyId = prefs.getString('config_company_id');

      final config = await ConfigService.getConfig();
      _serverUrl = await ConfigService.getServerUrl();

      // Obtener device_id
      final deviceInfo = DeviceInfoPlugin();
      final androidInfo = await deviceInfo.androidInfo;
      _deviceId = androidInfo.id;

      print('✅ [PASSWORD-AUTH] Configuración cargada');
    } catch (e) {
      print('❌ [PASSWORD-AUTH] Error cargando config: $e');
    }
  }

  /// 🎥 INICIALIZAR CÁMARA FRONTAL
  Future<void> _initializeCamera() async {
    try {
      _cameras = await availableCameras();
      if (_cameras == null || _cameras!.isEmpty) {
        print('❌ [PASSWORD-AUTH] No hay cámaras disponibles');
        return;
      }

      // Preferir cámara frontal para foto de seguridad
      final frontCamera = _cameras!.firstWhere(
        (camera) => camera.lensDirection == CameraLensDirection.front,
        orElse: () => _cameras!.first,
      );

      _cameraController = CameraController(
        frontCamera,
        ResolutionPreset.medium,
        enableAudio: false,
      );

      await _cameraController!.initialize();

      setState(() {
        _isCameraInitialized = true;
      });

      print('✅ [PASSWORD-AUTH] Cámara inicializada');
    } catch (e) {
      print('❌ [PASSWORD-AUTH] Error inicializando cámara: $e');
    }
  }

  /// 🔐 AUTENTICAR CON CONTRASEÑA
  Future<void> _authenticateWithPassword() async {
    if (!_formKey.currentState!.validate()) return;

    if (_serverUrl == null || _companyId == null || _deviceId == null) {
      _showErrorDialog('Configuración incompleta', 'Falta configuración del servidor o empresa.');
      return;
    }

    if (!_isCameraInitialized || _cameraController == null) {
      _showErrorDialog('Cámara no disponible', 'No se puede capturar la foto de seguridad.');
      return;
    }

    setState(() {
      _isAuthenticating = true;
    });

    try {
      // 📸 Capturar foto de seguridad
      final image = await _cameraController!.takePicture();
      final imageBytes = await image.readAsBytes();

      print('📸 [PASSWORD-AUTH] Foto capturada (${imageBytes.length} bytes)');

      // 📡 Enviar al endpoint de password auth
      final uri = Uri.parse('$_serverUrl/api/v1/kiosks/password-auth');
      final request = http.MultipartRequest('POST', uri);

      // Headers
      request.headers['X-Company-Id'] = _companyId!;

      // Campos
      request.fields['legajo'] = _legajoController.text.trim();
      request.fields['password'] = _passwordController.text;
      request.fields['companyId'] = _companyId!;
      request.fields['deviceId'] = _deviceId!;

      // Foto de seguridad
      request.files.add(http.MultipartFile.fromBytes(
        'securityPhoto',
        imageBytes,
        filename: 'security_${DateTime.now().millisecondsSinceEpoch}.jpg',
        contentType: http_parser.MediaType('image', 'jpeg'),
      ));

      print('📡 [PASSWORD-AUTH] Enviando request...');

      // Enviar
      final streamedResponse = await request.send().timeout(Duration(seconds: 15));
      final response = await http.Response.fromStream(streamedResponse);

      print('📥 [PASSWORD-AUTH] Status: ${response.statusCode}');

      if (response.statusCode == 200) {
        final result = jsonDecode(response.body);

        if (result['success'] == true) {
          // ✅ AUTENTICACIÓN EXITOSA
          final employeeName = result['employee']?['name'] ?? 'Empleado';
          final wasRegistered = result['registered'] ?? false;

          if (result['requiresHrReview'] == true) {
            // ⚠️ REQUIERE REVISIÓN DE RRHH (baja similaridad facial o contraseña inválida pero tolerancia)
            _showWarningDialog(
              '⚠️ Autenticación con Revisión',
              'Su acceso será revisado por Recursos Humanos.\n\n'
                  'Empleado: $employeeName\n'
                  'Registro: ${wasRegistered ? "Sí" : "No"}',
            );
          } else {
            // ✅ TODO OK
            _showSuccessDialog(
              '✅ Autenticación Exitosa',
              'Bienvenido, $employeeName\n\n'
                  'Asistencia ${wasRegistered ? "registrada" : "detectada"} correctamente.',
            );
          }
        } else {
          // ❌ AUTENTICACIÓN FALLIDA
          final errorMessage = result['message'] ?? 'Credenciales inválidas';
          _showErrorDialog('❌ Autenticación Fallida', errorMessage);
        }
      } else if (response.statusCode == 403) {
        // 🚫 DEPARTAMENTO NO AUTORIZADO
        final result = jsonDecode(response.body);
        final errorMessage = result['message'] ?? 'No autorizado en este kiosko';
        _showErrorDialog('🚫 Acceso Denegado', errorMessage);
      } else {
        _showErrorDialog('Error del servidor', 'Código: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ [PASSWORD-AUTH] Error: $e');
      _showErrorDialog('Error de conexión', 'No se pudo conectar con el servidor.\n\n$e');
    } finally {
      setState(() {
        _isAuthenticating = false;
      });
    }
  }

  /// ✅ DIÁLOGO DE ÉXITO
  void _showSuccessDialog(String title, String message) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        backgroundColor: Colors.green.shade700,
        title: Row(
          children: [
            Icon(Icons.check_circle, color: Colors.white, size: 32),
            SizedBox(width: 12),
            Expanded(
              child: Text(
                title,
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        content: Text(
          message,
          style: TextStyle(color: Colors.white, fontSize: 16),
        ),
        actions: [
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).pop(); // Cerrar dialog
              Navigator.of(context).pop(); // Volver a kiosk
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.white),
            child: Text('OK', style: TextStyle(color: Colors.green.shade700)),
          ),
        ],
      ),
    );
  }

  /// ⚠️ DIÁLOGO DE ADVERTENCIA (requiere revisión RRHH)
  void _showWarningDialog(String title, String message) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        backgroundColor: Colors.orange.shade700,
        title: Row(
          children: [
            Icon(Icons.warning, color: Colors.white, size: 32),
            SizedBox(width: 12),
            Expanded(
              child: Text(
                title,
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        content: Text(
          message,
          style: TextStyle(color: Colors.white, fontSize: 16),
        ),
        actions: [
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).pop(); // Cerrar dialog
              Navigator.of(context).pop(); // Volver a kiosk
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.white),
            child: Text('Entendido', style: TextStyle(color: Colors.orange.shade700)),
          ),
        ],
      ),
    );
  }

  /// ❌ DIÁLOGO DE ERROR
  void _showErrorDialog(String title, String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: Colors.red.shade700,
        title: Row(
          children: [
            Icon(Icons.error, color: Colors.white, size: 32),
            SizedBox(width: 12),
            Expanded(
              child: Text(
                title,
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        content: Text(
          message,
          style: TextStyle(color: Colors.white, fontSize: 14),
        ),
        actions: [
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.white),
            child: Text('Cerrar', style: TextStyle(color: Colors.red.shade700)),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _legajoController.dispose();
    _passwordController.dispose();
    _cameraController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade900,
      body: Stack(
        children: [
          // 🎥 PREVIEW DE CÁMARA (fondo)
          if (_isCameraInitialized && _cameraController != null)
            Positioned.fill(
              child: Opacity(
                opacity: 0.3,
                child: FittedBox(
                  fit: BoxFit.cover,
                  child: SizedBox(
                    width: _cameraController!.value.previewSize!.height,
                    height: _cameraController!.value.previewSize!.width,
                    child: CameraPreview(_cameraController!),
                  ),
                ),
              ),
            ),

          // 📋 FORMULARIO
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24.0),
                child: Form(
                  key: _formKey,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // 🔑 ÍCONO DE CONTRASEÑA
                      Container(
                        width: 120,
                        height: 120,
                        decoration: BoxDecoration(
                          color: Colors.blue.shade600,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.blue.withOpacity(0.5),
                              blurRadius: 20,
                              spreadRadius: 5,
                            ),
                          ],
                        ),
                        child: Icon(
                          Icons.password,
                          size: 60,
                          color: Colors.white,
                        ),
                      ),

                      const SizedBox(height: 32),

                      // 📌 TÍTULO
                      Text(
                        'AUTENTICACIÓN POR CONTRASEÑA',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                          letterSpacing: 1.2,
                        ),
                        textAlign: TextAlign.center,
                      ),

                      const SizedBox(height: 8),

                      // 📸 SUBTÍTULO
                      Text(
                        'Se capturará una foto de seguridad automáticamente',
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.white70,
                          fontStyle: FontStyle.italic,
                        ),
                        textAlign: TextAlign.center,
                      ),

                      const SizedBox(height: 40),

                      // 🔢 CAMPO LEGAJO
                      Container(
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.95),
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black26,
                              blurRadius: 8,
                              offset: Offset(0, 4),
                            ),
                          ],
                        ),
                        child: TextFormField(
                          controller: _legajoController,
                          keyboardType: TextInputType.number,
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w500),
                          decoration: InputDecoration(
                            labelText: 'Legajo',
                            labelStyle: TextStyle(fontSize: 16),
                            prefixIcon: Icon(Icons.badge, color: Colors.blue.shade700),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide.none,
                            ),
                            filled: true,
                            fillColor: Colors.transparent,
                          ),
                          validator: (value) {
                            if (value == null || value.trim().isEmpty) {
                              return 'Ingrese su legajo';
                            }
                            return null;
                          },
                        ),
                      ),

                      const SizedBox(height: 20),

                      // 🔐 CAMPO CONTRASEÑA
                      Container(
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.95),
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black26,
                              blurRadius: 8,
                              offset: Offset(0, 4),
                            ),
                          ],
                        ),
                        child: TextFormField(
                          controller: _passwordController,
                          obscureText: !_showPassword,
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w500),
                          decoration: InputDecoration(
                            labelText: 'Contraseña',
                            labelStyle: TextStyle(fontSize: 16),
                            prefixIcon: Icon(Icons.lock, color: Colors.blue.shade700),
                            suffixIcon: IconButton(
                              icon: Icon(
                                _showPassword ? Icons.visibility : Icons.visibility_off,
                                color: Colors.blue.shade700,
                              ),
                              onPressed: () {
                                setState(() {
                                  _showPassword = !_showPassword;
                                });
                              },
                            ),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide.none,
                            ),
                            filled: true,
                            fillColor: Colors.transparent,
                          ),
                          validator: (value) {
                            if (value == null || value.isEmpty) {
                              return 'Ingrese su contraseña';
                            }
                            return null;
                          },
                        ),
                      ),

                      const SizedBox(height: 40),

                      // ✅ BOTÓN AUTENTICAR
                      SizedBox(
                        width: double.infinity,
                        height: 60,
                        child: ElevatedButton(
                          onPressed: _isAuthenticating ? null : _authenticateWithPassword,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.blue.shade600,
                            disabledBackgroundColor: Colors.grey.shade600,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            elevation: 8,
                          ),
                          child: _isAuthenticating
                              ? Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    SizedBox(
                                      width: 24,
                                      height: 24,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                      ),
                                    ),
                                    SizedBox(width: 16),
                                    Text(
                                      'Autenticando...',
                                      style: TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ],
                                )
                              : Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(Icons.login, color: Colors.white),
                                    SizedBox(width: 12),
                                    Text(
                                      'AUTENTICAR',
                                      style: TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ],
                                ),
                        ),
                      ),

                      const SizedBox(height: 24),

                      // ◀️ BOTÓN VOLVER
                      TextButton.icon(
                        onPressed: () => Navigator.of(context).pop(),
                        icon: Icon(Icons.arrow_back, color: Colors.white),
                        label: Text(
                          'Volver al Kiosko',
                          style: TextStyle(
                            fontSize: 16,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),

          // ⚠️ ADVERTENCIA DE CÁMARA (si no está inicializada)
          if (!_isCameraInitialized)
            Positioned(
              top: 60,
              left: 20,
              right: 20,
              child: Container(
                padding: EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.orange.shade700,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(Icons.camera_alt, color: Colors.white),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Inicializando cámara para foto de seguridad...',
                        style: TextStyle(color: Colors.white, fontSize: 12),
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
