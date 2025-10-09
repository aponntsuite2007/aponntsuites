import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter/foundation.dart';
import 'package:camera/camera.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart' as http_parser;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';
// import 'package:wakelock_plus/wakelock_plus.dart'; // DESACTIVADO TEMPORALMENTE
import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'dart:io';
import 'dart:math' as math;
import '../screens/config_screen.dart';
import '../screens/password_auth_screen.dart';
import '../services/config_service.dart';

/// 🚦 KIOSK BIOMÉTRICO CON GOOGLE ML KIT - STREAMING CONTINUO
/// ============================================================
/// - Login previo de administrador con empresa multi-tenant
/// - Google ML Kit Face Detection en tiempo real (60fps)
/// - Detección automática en MOVIMIENTO (no requiere detenerse)
/// - SmartCapture: evalúa calidad y captura frame óptimo
/// - Semáforo: 🟡 standby, 🟢 reconocido (1s), 🔴 no reconocido (1s)
/// - Alerta naranja para llegadas tardías (requiere autorización)
/// - Guarda registro de asistencia en BD

/// 🧠 SMART CAPTURE - Evaluador de calidad para captura en movimiento
class SmartCapture {
  DateTime? _lastCapture;
  final Duration _minInterval = Duration(milliseconds: 300);
  final double _qualityThreshold = 0.65;
  bool _isProcessing = false;

  bool shouldCapture() {
    if (_isProcessing) return false;

    if (_lastCapture == null) return true;

    final elapsed = DateTime.now().difference(_lastCapture!);
    return elapsed >= _minInterval;
  }

  double calculateQuality(Face face, Size imageSize) {
    double sizeScore = 0.0;
    double angleScore = 0.0;
    double confidenceScore = 0.0;

    // 1. Confidence tracking (ML Kit)
    if (face.trackingId != null) {
      confidenceScore = 0.9; // Rostro trackeado = alta confianza
    } else {
      confidenceScore = 0.6;
    }

    // 2. Tamaño del rostro (más grande = mejor)
    final faceArea = face.boundingBox.width * face.boundingBox.height;
    final imageArea = imageSize.width * imageSize.height;
    final faceSizeRatio = faceArea / imageArea;
    sizeScore = math.min(faceSizeRatio * 8, 1.0);

    // 3. Ángulo frontal (usando head euler angles)
    if (face.headEulerAngleX != null && face.headEulerAngleY != null && face.headEulerAngleZ != null) {
      final xAngle = face.headEulerAngleX!.abs();
      final yAngle = face.headEulerAngleY!.abs();
      final zAngle = face.headEulerAngleZ!.abs();

      // Perfecto: X=0, Y=0, Z=0. Máximo aceptable: X=15, Y=15, Z=10
      angleScore = math.max(0.0, 1.0 - (xAngle / 15 + yAngle / 15 + zAngle / 10) / 3);
    } else {
      angleScore = 0.7; // Default
    }

    // Combinar scores
    final quality = (confidenceScore * 0.5) + (sizeScore * 0.3) + (angleScore * 0.2);
    return quality.clamp(0.0, 1.0);
  }

  bool isQualityGood(double quality) => quality >= _qualityThreshold;

  void markCapture() {
    _lastCapture = DateTime.now();
  }

  void setProcessing(bool processing) {
    _isProcessing = processing;
  }

  bool get isProcessing => _isProcessing;
}

class KioskScreen extends StatefulWidget {
  @override
  _KioskScreenState createState() => _KioskScreenState();
}

enum TrafficLightState { yellow, green, red }

class _KioskScreenState extends State<KioskScreen> {
  // 🎥 CÁMARA
  CameraController? _cameraController;
  List<CameraDescription>? _cameras;
  bool _isCameraInitialized = false;
  Timer? _captureTimer;

  // 🧠 GOOGLE ML KIT FACE DETECTION
  FaceDetector? _faceDetector;
  final SmartCapture _smartCapture = SmartCapture();
  bool _isStreamActive = false;

  // 🌐 CONFIGURACIÓN
  String? _serverUrl;
  String? _companyId;
  String? _authToken;

  // 🚦 SEMÁFORO
  TrafficLightState _trafficLight = TrafficLightState.yellow;
  bool _isProcessing = false;

  // 🔊 TTS para alertas de voz
  FlutterTts? _flutterTts;

  @override
  void initState() {
    super.initState();
    // 🔒 Mantener pantalla siempre activa en modo kiosko
    // _enableWakelock(); // DESACTIVADO TEMPORALMENTE
    _initializeTts();
    _loadConfiguration();
  }

  /// 🔒 ACTIVAR WAKELOCK DE FORMA SEGURA
  /* DESACTIVADO TEMPORALMENTE
  Future<void> _enableWakelock() async {
    try {
      await WakelockPlus.enable();
      print('✅ [WAKELOCK] Pantalla activa permanentemente');
    } catch (e) {
      print('⚠️ [WAKELOCK] Error activando wakelock: $e');
      // Continuar sin wakelock si falla
    }
  }
  */

  /// 🔊 INICIALIZAR TTS
  Future<void> _initializeTts() async {
    _flutterTts = FlutterTts();
    await _flutterTts?.setLanguage("es-ES");
    await _flutterTts?.setSpeechRate(0.5);
    await _flutterTts?.setVolume(1.0);
    await _flutterTts?.setPitch(1.0);
  }

  /// 📡 CARGAR CONFIGURACIÓN DESDE SHARED PREFERENCES
  Future<void> _loadConfiguration() async {
    try {
      final prefs = await SharedPreferences.getInstance();

      // Cargar company_id del login
      _companyId = prefs.getString('config_company_id');
      _authToken = prefs.getString('auth_token');

      // Construir URL del backend usando ConfigService
      final config = await ConfigService.getConfig();

      // Validar que haya configuración del servidor
      if (config['baseUrl']!.isEmpty || config['port']!.isEmpty) {
        print('❌ [KIOSK] No hay configuración de servidor');
        if (mounted) {
          // Mostrar error y redirigir a configuración
          showDialog(
            context: context,
            barrierDismissible: false,
            builder: (context) => AlertDialog(
              title: Text('Configuración Requerida'),
              content: Text('Debe configurar la dirección del servidor antes de usar el kiosko.\n\nVaya a Configuración e ingrese la IP y puerto del servidor.'),
              actions: [
                ElevatedButton(
                  onPressed: () {
                    Navigator.of(context).pushReplacement(
                      MaterialPageRoute(builder: (context) => const ConfigScreen()),
                    );
                  },
                  child: Text('Ir a Configuración'),
                ),
              ],
            ),
          );
        }
        return;
      }

      _serverUrl = await ConfigService.getServerUrl();

      print('🌐 [KIOSK] Servidor: $_serverUrl | Company: $_companyId');

      if (_companyId == null || _authToken == null) {
        print('❌ [KIOSK] Falta configuración, volver a login');
        if (mounted) {
          // Volver a login si falta config
          Navigator.of(context).pushReplacementNamed('/login');
        }
        return;
      }

      print('✅ [KIOSK] Configuración cargada exitosamente');

      await _initializeCamera();
      _startContinuousCapture();
    } catch (e) {
      print('❌ [KIOSK] Error configuración: $e');
    }
  }

  /// 🎥 INICIALIZAR CÁMARA FRONTAL
  Future<void> _initializeCamera() async {
    try {
      _cameras = await availableCameras();
      if (_cameras == null || _cameras!.isEmpty) {
        print('❌ [KIOSK] No hay cámaras disponibles');
        return;
      }

      // Preferir cámara frontal
      final frontCamera = _cameras!.firstWhere(
        (camera) => camera.lensDirection == CameraLensDirection.front,
        orElse: () => _cameras!.first,
      );

      _cameraController = CameraController(
        frontCamera,
        ResolutionPreset.high,
        enableAudio: false,
      );

      await _cameraController!.initialize();

      // 🧠 Inicializar Google ML Kit Face Detection
      await _initializeFaceDetector();

      setState(() {
        _isCameraInitialized = true;
      });

      print('✅ [KIOSK] Cámara y ML Kit inicializados');
    } catch (e) {
      print('❌ [KIOSK] Error cámara: $e');
    }
  }

  /// 🧠 INICIALIZAR GOOGLE ML KIT FACE DETECTOR
  Future<void> _initializeFaceDetector() async {
    try {
      final options = FaceDetectorOptions(
        enableClassification: true,
        enableLandmarks: true,
        enableContours: false, // Para performance
        enableTracking: true, // ✅ CLAVE para tracking en movimiento
        minFaceSize: 0.15,
        performanceMode: FaceDetectorMode.accurate,
      );

      _faceDetector = FaceDetector(options: options);
      print('✅ [ML-KIT] Face Detector inicializado con tracking enabled');
    } catch (e) {
      print('❌ [ML-KIT] Error: $e');
    }
  }

  /// 📸 STREAMING CONTINUO CON GOOGLE ML KIT (60fps)
  void _startContinuousCapture() {
    if (_faceDetector == null || _cameraController == null) {
      print('❌ [STREAM] FaceDetector o cámara no inicializados');
      return;
    }

    if (_isStreamActive) {
      print('⚠️ [STREAM] Stream ya activo');
      return;
    }

    try {
      _isStreamActive = true;
      print('🚀 [STREAM] Iniciando detección continua con Google ML Kit...');

      _cameraController!.startImageStream((CameraImage cameraImage) async {
        // Solo procesar si no estamos procesando otro frame
        if (_smartCapture.isProcessing || _isProcessing) {
          return;
        }

        // Verificar si es momento de evaluar (throttling)
        if (!_smartCapture.shouldCapture()) {
          return;
        }

        await _processStreamFrame(cameraImage);
      });

      print('✅ [STREAM] Streaming activo');
    } catch (e) {
      print('❌ [STREAM] Error iniciando stream: $e');
      _isStreamActive = false;
    }
  }

  /// 🔍 PROCESAR FRAME DEL STREAM CON ML KIT
  Future<void> _processStreamFrame(CameraImage cameraImage) async {
    try {
      // Convertir CameraImage a InputImage para ML Kit
      final inputImage = _convertCameraImage(cameraImage);
      if (inputImage == null) return;

      // Detectar rostros con ML Kit
      final faces = await _faceDetector!.processImage(inputImage);

      // Si no hay rostros, continuar
      if (faces.isEmpty) {
        return;
      }

      // Obtener mejor rostro
      final bestFace = faces.first; // ML Kit ya ordena por confianza

      // Calcular calidad del frame usando SmartCapture
      final imageSize = Size(
        cameraImage.width.toDouble(),
        cameraImage.height.toDouble(),
      );
      final quality = _smartCapture.calculateQuality(bestFace, imageSize);

      // Log ocasional para debugging (1 de cada 30 frames ~ cada segundo)
      if (math.Random().nextDouble() < 0.033) {
        print('📊 [ML-KIT] Quality: ${quality.toStringAsFixed(2)} | Faces: ${faces.length} | Tracking ID: ${bestFace.trackingId}');
      }

      // Si la calidad es buena, capturar imagen de alta calidad y procesar
      if (_smartCapture.isQualityGood(quality)) {
        print('✅ [SMART-CAPTURE] Calidad óptima (${quality.toStringAsFixed(2)}) - Capturando...');

        _smartCapture.setProcessing(true);
        _smartCapture.markCapture();

        // Pausar stream temporalmente
        await _cameraController!.stopImageStream();
        _isStreamActive = false;

        // Capturar imagen de alta calidad
        await _captureHighQualityAndProcess();

        // Reiniciar stream después de procesar
        await Future.delayed(Duration(milliseconds: 100));
        if (mounted && _cameraController != null) {
          _startContinuousCapture();
        }
        _smartCapture.setProcessing(false);
      }
    } catch (e) {
      print('❌ [STREAM-FRAME] Error: $e');
    }
  }

  /// 🔄 CONVERTIR CameraImage A InputImage PARA ML KIT
  InputImage? _convertCameraImage(CameraImage cameraImage) {
    try {
      // Obtener información de la cámara
      final camera = _cameras!.firstWhere(
        (cam) => cam.lensDirection == CameraLensDirection.front,
        orElse: () => _cameras!.first,
      );

      // Determinar rotación
      final sensorOrientation = camera.sensorOrientation;
      InputImageRotation? rotation;

      if (Platform.isAndroid) {
        rotation = InputImageRotation.rotation270deg; // Default para Android frontal
      } else if (Platform.isIOS) {
        rotation = InputImageRotation.rotation0deg;
      }

      // Formato de imagen
      final format = InputImageFormatValue.fromRawValue(cameraImage.format.raw);
      if (format == null) return null;

      // Crear InputImage
      final inputImage = InputImage.fromBytes(
        bytes: _concatenatePlanes(cameraImage.planes),
        metadata: InputImageMetadata(
          size: Size(cameraImage.width.toDouble(), cameraImage.height.toDouble()),
          rotation: rotation ?? InputImageRotation.rotation0deg,
          format: format,
          bytesPerRow: cameraImage.planes[0].bytesPerRow,
        ),
      );

      return inputImage;
    } catch (e) {
      print('❌ [CONVERT] Error: $e');
      return null;
    }
  }

  /// 📦 CONCATENAR PLANES DE CAMERAIMAGE
  Uint8List _concatenatePlanes(List<Plane> planes) {
    final WriteBuffer allBytes = WriteBuffer();
    for (Plane plane in planes) {
      allBytes.putUint8List(plane.bytes);
    }
    return allBytes.done().buffer.asUint8List();
  }

  /// 📸 CAPTURAR IMAGEN DE ALTA CALIDAD Y PROCESAR
  Future<void> _captureHighQualityAndProcess() async {
    if (_isProcessing || _serverUrl == null || _companyId == null) return;

    setState(() {
      _isProcessing = true;
    });

    try {
      // Capturar imagen de alta calidad
      final image = await _cameraController!.takePicture();
      final imageBytes = await image.readAsBytes();

      // Procesar igual que antes
      await _sendToBackend(imageBytes);
    } catch (e) {
      print('❌ [CAPTURE-HQ] Error: $e');
    } finally {
      setState(() {
        _isProcessing = false;
      });
    }
  }

  /// 📡 ENVIAR AL BACKEND PARA VERIFICACIÓN
  Future<void> _sendToBackend(List<int> imageBytes) async {
    try {
      // Enviar a endpoint de verificación biométrica
      final uri = Uri.parse('$_serverUrl/api/v2/biometric-attendance/verify-real');
      final request = http.MultipartRequest('POST', uri);

      // Headers para multi-tenant
      request.headers['X-Company-Id'] = _companyId!;
      request.headers['X-Kiosk-Mode'] = 'true';

      if (_authToken != null) {
        request.headers['Authorization'] = 'Bearer $_authToken';
      }

      // Agregar imagen
      request.files.add(http.MultipartFile.fromBytes(
        'biometricImage',
        imageBytes,
        filename: 'capture.jpg',
        contentType: http_parser.MediaType('image', 'jpeg'),
      ));

      request.fields['embedding'] = '[]'; // Backend genera el embedding

      // Enviar request
      final streamedResponse = await request.send().timeout(Duration(seconds: 10));
      final response = await http.Response.fromStream(streamedResponse);

      // Procesar respuesta
      if (response.statusCode == 200) {
        final result = jsonDecode(response.body);

        if (result['success'] == true) {
          // 🚨 DETECTAR SI NECESITA AUTORIZACIÓN POR LLEGADA TARDÍA
          if (result['needsAuthorization'] == true) {
            final employeeName = result['employee']?['name'] ?? 'Empleado';
            final lateMinutes = result['authorization']?['lateMinutes'] ?? 0;

            print('⚠️ [KIOSK] Fuera de turno - $employeeName ($lateMinutes min tarde)');
            await _showLateArrivalAlert(employeeName, lateMinutes);
            return;
          }

          // 🟢 VERDE - Reconocido en BD (puede ser registro nuevo o detección repetida)
          final employeeName = result['employee']?['name'] ?? 'Empleado';
          final wasRegistered = result['registered'] ?? false;
          final detectionCount = result['detectionCount'] ?? 1;

          print('✅ [KIOSK] Reconocido - $employeeName (Registro: $wasRegistered, Detección #$detectionCount)');
          _showTrafficLight(TrafficLightState.green);
        } else {
          // 🔴 ROJO - No reconocido en BD
          print('❌ [KIOSK] No reconocido en BD');
          _showTrafficLight(TrafficLightState.red);
          await _registerFailedAttempt(imageBytes);
        }
      }
    } catch (e) {
      print('❌ [BACKEND] Error: $e');
    }
  }

  /// 📝 REGISTRAR INTENTO FALLIDO DE ACCESO
  Future<void> _registerFailedAttempt(List<int> imageBytes) async {
    try {
      // Guardar intento fallido en backend
      final uri = Uri.parse('$_serverUrl/api/v2/biometric-attendance/failed-attempt');
      await http.post(
        uri,
        headers: {
          'Content-Type': 'application/json',
          'X-Company-Id': _companyId!,
        },
        body: jsonEncode({
          'timestamp': DateTime.now().toIso8601String(),
          'companyId': _companyId,
          'reason': 'no_match',
        }),
      ).timeout(Duration(seconds: 5));

      print('📝 [KIOSK] Intento fallido registrado');
    } catch (e) {
      print('⚠️ [KIOSK] Error registrando intento fallido: $e');
    }
  }

  /// 🚨 ALERTA DE LLEGADA TARDÍA - MOSTRAR 3 SEGUNDOS Y LIBERAR KIOSCO
  Future<void> _showLateArrivalAlert(String employeeName, int lateMinutes) async {
    // Reproducir alerta de voz
    await _flutterTts?.speak("Fuera de turno. Aguarde autorización.");

    // Mostrar dialog
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        backgroundColor: Colors.orange.shade700,
        title: Row(
          children: [
            Icon(Icons.warning, color: Colors.white, size: 32),
            SizedBox(width: 12),
            Text(
              '⚠️ FUERA DE TURNO',
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              employeeName,
              style: TextStyle(
                color: Colors.white,
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            SizedBox(height: 8),
            Text(
              'Llegó $lateMinutes minutos tarde',
              style: TextStyle(color: Colors.white70, fontSize: 16),
            ),
            SizedBox(height: 16),
            Text(
              '🔔 AGUARDE AUTORIZACIÓN',
              style: TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            SizedBox(height: 8),
            Text(
              'Espere en la entrada',
              style: TextStyle(color: Colors.white70, fontSize: 14),
            ),
          ],
        ),
      ),
    );

    // Auto-cerrar después de 3 segundos
    await Future.delayed(Duration(seconds: 3));
    if (mounted) {
      Navigator.of(context, rootNavigator: true).pop();
    }
  }

  /// 🚦 MOSTRAR SEMÁFORO Y VOLVER A AMARILLO DESPUÉS DE 1 SEGUNDO
  void _showTrafficLight(TrafficLightState state) {
    setState(() {
      _trafficLight = state;
    });

    // Volver a amarillo después de 1 segundo
    Timer(Duration(seconds: 1), () {
      if (mounted) {
        setState(() {
          _trafficLight = TrafficLightState.yellow;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // 🎥 CÁMARA DE FONDO (SIN DISTORSIÓN)
          if (_isCameraInitialized && _cameraController != null)
            Positioned.fill(
              child: FittedBox(
                fit: BoxFit.cover,
                child: SizedBox(
                  width: _cameraController!.value.previewSize!.height,
                  height: _cameraController!.value.previewSize!.width,
                  child: CameraPreview(_cameraController!),
                ),
              ),
            ),

          // 🚦 SEMÁFORO PEQUEÑO EN ESQUINA SUPERIOR DERECHA
          Positioned(
            top: 40,
            right: 20,
            child: Container(
              width: 50,
              height: 150,
              decoration: BoxDecoration(
                color: Colors.grey.shade900.withOpacity(0.8),
                borderRadius: BorderRadius.circular(25),
                border: Border.all(color: Colors.white, width: 2),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _buildLight(Colors.red, _trafficLight == TrafficLightState.red),
                  _buildLight(Colors.amber, _trafficLight == TrafficLightState.yellow),
                  _buildLight(Colors.green, _trafficLight == TrafficLightState.green),
                ],
              ),
            ),
          ),

          // ⚙️ BOTÓN DE CONFIGURACIÓN (ESQUINA SUPERIOR IZQUIERDA)
          Positioned(
            top: 40,
            left: 20,
            child: GestureDetector(
              onTap: () {
                // Detener captura y cámara
                _captureTimer?.cancel();
                _cameraController?.dispose();

                // Navegar a configuración
                Navigator.of(context).pushReplacement(
                  MaterialPageRoute(builder: (context) => const ConfigScreen()),
                );
              },
              child: Container(
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  color: Colors.grey.shade900.withOpacity(0.8),
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 2),
                ),
                child: Icon(
                  Icons.settings,
                  color: Colors.white,
                  size: 28,
                ),
              ),
            ),
          ),

          // 🏢 INDICADOR DE EMPRESA (BOTTOM CENTER)
          if (_companyId != null)
            Positioned(
              bottom: 20,
              left: 0,
              right: 0,
              child: Center(
                child: Container(
                  padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade900.withOpacity(0.7),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.white.withOpacity(0.3), width: 1),
                  ),
                  child: Text(
                    'Empresa ID: $_companyId',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ),
            ),

          // 🚪 BOTÓN DE SALIDA (ESQUINA INFERIOR IZQUIERDA)
          Positioned(
            bottom: 20,
            left: 20,
            child: GestureDetector(
              onTap: () async {
                // Confirmar antes de salir
                final shouldExit = await showDialog<bool>(
                  context: context,
                  builder: (context) => AlertDialog(
                    title: Text('Salir de la aplicación'),
                    content: Text('¿Está seguro de que desea cerrar la aplicación?'),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.of(context).pop(false),
                        child: Text('Cancelar'),
                      ),
                      ElevatedButton(
                        onPressed: () => Navigator.of(context).pop(true),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.red,
                        ),
                        child: Text('Salir'),
                      ),
                    ],
                  ),
                );

                if (shouldExit == true) {
                  // Detener captura y cámara
                  _captureTimer?.cancel();
                  _cameraController?.dispose();
                  _flutterTts?.stop();

                  // Cerrar la aplicación
                  exit(0);
                }
              },
              child: Container(
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  color: Colors.red.shade700.withOpacity(0.8),
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 2),
                ),
                child: Icon(
                  Icons.exit_to_app,
                  color: Colors.white,
                  size: 28,
                ),
              ),
            ),
          ),

          // 👆 BOTÓN FLOTANTE: AUTENTICACIÓN POR HUELLA
          Positioned(
            bottom: 90,
            left: 20,
            child: GestureDetector(
              onTap: () {
                // TODO: Implementar navegación a pantalla de huella externa
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('🚧 Función de lector de huella externo en desarrollo'),
                    backgroundColor: Colors.orange,
                    duration: Duration(seconds: 2),
                  ),
                );
              },
              child: Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  color: Colors.orange.shade600.withOpacity(0.9),
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 2),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.orange.withOpacity(0.5),
                      blurRadius: 8,
                      spreadRadius: 2,
                    ),
                  ],
                ),
                child: Icon(
                  Icons.fingerprint,
                  color: Colors.white,
                  size: 32,
                ),
              ),
            ),
          ),

          // 🔑 BOTÓN FLOTANTE: AUTENTICACIÓN POR CONTRASEÑA
          Positioned(
            bottom: 90,
            right: 20,
            child: GestureDetector(
              onTap: () async {
                // Detener captura temporal
                _captureTimer?.cancel();

                // Navegar a pantalla de autenticación por contraseña
                await Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const PasswordAuthScreen(),
                  ),
                );

                // Reiniciar captura al volver
                if (mounted) {
                  _startContinuousCapture();
                }
              },
              child: Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  color: Colors.blue.shade600.withOpacity(0.9),
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 2),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.blue.withOpacity(0.5),
                      blurRadius: 8,
                      spreadRadius: 2,
                    ),
                  ],
                ),
                child: Icon(
                  Icons.password,
                  color: Colors.white,
                  size: 32,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// 💡 LUZ DEL SEMÁFORO
  Widget _buildLight(Color color, bool isActive) {
    return Container(
      width: 30,
      height: 30,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: isActive ? color : color.withOpacity(0.2),
        boxShadow: isActive
            ? [
                BoxShadow(
                  color: color.withOpacity(0.8),
                  blurRadius: 10,
                  spreadRadius: 2,
                ),
              ]
            : null,
      ),
    );
  }

  @override
  void dispose() {
    _captureTimer?.cancel();

    // Detener stream si está activo
    if (_isStreamActive && _cameraController != null) {
      _cameraController!.stopImageStream().catchError((e) {
        print('⚠️ [DISPOSE] Error deteniendo stream: $e');
      });
    }

    _cameraController?.dispose();
    _faceDetector?.close();
    _flutterTts?.stop();

    // 🔓 Desactivar wakelock al salir del kiosko
    // _disableWakelock(); // DESACTIVADO TEMPORALMENTE
    super.dispose();
  }

  /// 🔓 DESACTIVAR WAKELOCK DE FORMA SEGURA
  /* DESACTIVADO TEMPORALMENTE
  Future<void> _disableWakelock() async {
    try {
      await WakelockPlus.disable();
      print('✅ [WAKELOCK] Pantalla liberada');
    } catch (e) {
      print('⚠️ [WAKELOCK] Error desactivando wakelock: $e');
    }
  }
  */
}
