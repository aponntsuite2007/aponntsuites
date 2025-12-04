import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter/foundation.dart';
import 'package:camera/camera.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart' as http_parser;
import 'package:shared_preferences/shared_preferences.dart';
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
import '../services/kiosk_audio_feedback_service.dart';
import '../services/geofencing_service.dart';
import '../services/authorization_polling_service.dart';
import '../services/websocket_service.dart';
import '../services/offline_queue_service.dart';
import '../services/face_liveness_service.dart';

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
/// OPTIMIZADO: Intervalos más cortos para detección ultra-rápida
class SmartCapture {
  DateTime? _lastCapture;
  final Duration _minInterval = Duration(milliseconds: 150); // ⚡ Reducido de 300ms
  final double _qualityThreshold = 0.50; // ⚡ Reducido de 0.65 para captura más rápida
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

  // 🔊 TTS para alertas de voz (usando servicio mejorado)
  // NOTA: TTS manejado por KioskAudioFeedbackService, no crear instancia local
  final KioskAudioFeedbackService _audioService = KioskAudioFeedbackService();
  final GeofencingService _geofenceService = GeofencingService();
  final AuthorizationPollingService _authPollingService = AuthorizationPollingService();
  final WebSocketService _wsService = WebSocketService();
  final OfflineQueueService _offlineQueue = OfflineQueueService();
  final FaceLivenessService _livenessService = FaceLivenessService();

  // 🛡️ Configuración de liveness
  // ⚡ DESACTIVADO por defecto para velocidad máxima
  // Puede activarse desde configuración si se requiere anti-spoofing
  bool _livenessEnabled = false;

  // 📶 Estado de conexión
  bool _isOfflineMode = false;

  @override
  void initState() {
    super.initState();
    // 🔒 Mantener pantalla siempre activa en modo kiosko
    // _enableWakelock(); // DESACTIVADO TEMPORALMENTE
    // TTS inicializado por _audioService en _initializeServices()
    _initializeServices();
    _loadConfiguration();
  }

  /// 🚀 INICIALIZAR TODOS LOS SERVICIOS DEL KIOSK
  Future<void> _initializeServices() async {
    try {
      // Inicializar audio feedback mejorado
      await _audioService.initialize(
        language: 'es-ES',
        speechRate: 0.5,
        volume: 1.0,
        pitch: 1.0,
      );
      print('✅ [KIOSK] Audio feedback service initialized');
    } catch (e) {
      print('⚠️ [KIOSK] Error initializing audio service: $e');
    }
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

  /// 📡 CARGAR CONFIGURACIÓN DESDE SHARED PREFERENCES
  Future<void> _loadConfiguration() async {
    try {
      final prefs = await SharedPreferences.getInstance();

      // Cargar company_id del login
      _companyId = prefs.getString('config_company_id');
      _authToken = prefs.getString('auth_token');

      // Construir URL del backend usando ConfigService
      final config = await ConfigService.getConfig();

      // Validar que haya configuración del servidor (puerto puede estar vacío para HTTPS)
      if (config['baseUrl']!.isEmpty) {
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

      // 🌐 Inicializar servicios con configuración del servidor
      await _initializeConnectedServices();

      await _initializeCamera();
      _startContinuousCapture();
    } catch (e) {
      print('❌ [KIOSK] Error configuración: $e');
    }
  }

  /// 🌐 INICIALIZAR SERVICIOS QUE REQUIEREN CONEXIÓN AL SERVIDOR
  Future<void> _initializeConnectedServices() async {
    if (_serverUrl == null) return;

    final prefs = await SharedPreferences.getInstance();
    final kioskId = prefs.getString('kiosk_id');

    try {
      // WebSocket para tiempo real
      await _wsService.initialize(_serverUrl!, authToken: _authToken);
      _wsService.connect();
      print('✅ [KIOSK] WebSocket service initialized');

      // 🔔 Escuchar resultados de autorización en tiempo real
      _wsService.authorizationRequests.listen((data) {
        print('📨 [KIOSK] Authorization result received: $data');

        // Verificar si es una respuesta (no una solicitud nueva)
        if (data['type'] == 'response' || data['status'] != null) {
          final status = data['status'] ?? data['type'];
          final approved = status == 'approved';
          final employeeName = data['employee']?['name'] ??
              data['employeeName'] ??
              'Empleado';
          final approverName = data['authorizer']?['name'] ??
              data['approverName'];
          final windowMinutes = data['authorizationWindow']?['windowMinutes'];

          // Mostrar resultado en el kiosk
          _showAuthorizationResult(
            approved: approved,
            employeeName: employeeName,
            approverName: approverName,
            windowMinutes: windowMinutes,
          );
        }
      });

      // Geofencing
      await _geofenceService.initializeWithServer(
        serverUrl: _serverUrl!,
        authToken: _authToken,
        kioskId: kioskId,
      );
      print('✅ [KIOSK] Geofence service initialized');

      // Polling de autorizaciones
      await _authPollingService.initialize(
        serverUrl: _serverUrl!,
        authToken: _authToken,
        kioskId: kioskId,
      );
      print('✅ [KIOSK] Authorization polling service initialized');

    } catch (e) {
      print('⚠️ [KIOSK] Error initializing connected services: $e');
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

      // ⚡ OPTIMIZADO: Resolución media para balance velocidad/calidad
      _cameraController = CameraController(
        frontCamera,
        ResolutionPreset.medium, // ⚡ Reducido de high para velocidad
        enableAudio: false,
        imageFormatGroup: ImageFormatGroup.yuv420, // ⚡ Formato más rápido para ML Kit
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
  /// ⚡ OPTIMIZADO: Modo FAST para detección ultra-rápida
  Future<void> _initializeFaceDetector() async {
    try {
      final options = FaceDetectorOptions(
        enableClassification: false, // ⚡ Desactivado para velocidad
        enableLandmarks: false, // ⚡ Desactivado para velocidad
        enableContours: false, // Para performance
        enableTracking: true, // ✅ CLAVE para tracking en movimiento
        minFaceSize: 0.20, // ⚡ Aumentado para detectar solo rostros cercanos
        performanceMode: FaceDetectorMode.fast, // ⚡ FAST mode para velocidad máxima
      );

      _faceDetector = FaceDetector(options: options);
      print('✅ [ML-KIT] Face Detector inicializado en MODO RÁPIDO');
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

      // ⚡ Log reducido para no impactar performance (1 de cada 100 frames)
      if (math.Random().nextDouble() < 0.01) {
        print('📊 [ML-KIT] Q:${quality.toStringAsFixed(2)} F:${faces.length}');
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

        // ⚡ Reiniciar stream INMEDIATAMENTE después de procesar
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
      // 🛡️ VERIFICACIÓN DE LIVENESS (Anti-Spoofing)
      if (_livenessEnabled && _cameraController != null) {
        print('🛡️ [KIOSK] Starting quick liveness check...');

        final livenessResult = await _livenessService.performQuickLivenessCheck(
          cameraController: _cameraController!,
          framesToCapture: 15, // Menos frames para ser más rápido
          captureInterval: const Duration(milliseconds: 80),
        );

        if (livenessResult != LivenessResult.success) {
          print('❌ [KIOSK] Liveness check FAILED: $livenessResult');
          await _handleLivenessFailure(livenessResult);
          setState(() {
            _isProcessing = false;
          });
          return;
        }

        print('✅ [KIOSK] Liveness check PASSED');
      }

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

  /// 🛡️ MANEJAR FALLO DE LIVENESS
  Future<void> _handleLivenessFailure(LivenessResult result) async {
    switch (result) {
      case LivenessResult.spoofingDetected:
        await _audioService.provideFeedback(KioskAudioState.spoofingDetected);
        _showTrafficLight(TrafficLightState.red);
        print('🚨 [KIOSK] Possible spoofing attempt detected!');
        break;

      case LivenessResult.noFaceDetected:
        await _audioService.speakState(KioskAudioState.notRecognized);
        _showTrafficLight(TrafficLightState.red);
        break;

      case LivenessResult.multipleFaces:
        await _audioService.speak('Múltiples rostros detectados. Solo una persona a la vez');
        _showTrafficLight(TrafficLightState.red);
        break;

      case LivenessResult.lowQuality:
        await _audioService.speak('Calidad de imagen insuficiente. Acérquese a la cámara');
        _showTrafficLight(TrafficLightState.yellow);
        break;

      case LivenessResult.timeout:
        await _audioService.speak('Tiempo de verificación agotado. Intente nuevamente');
        _showTrafficLight(TrafficLightState.yellow);
        break;

      default:
        await _audioService.speakState(KioskAudioState.error);
        _showTrafficLight(TrafficLightState.red);
    }
  }

  /// 📡 ENVIAR AL BACKEND PARA VERIFICACIÓN
  Future<void> _sendToBackend(List<int> imageBytes) async {
    try {
      // 🌍 VALIDAR GEOFENCE ANTES DE ENVIAR
      final geofenceResult = await _geofenceService.validateCurrentLocation();
      if (!geofenceResult.isValid) {
        print('❌ [KIOSK] Geofence validation failed: ${geofenceResult.message}');
        await _audioService.speakState(
          KioskAudioState.error,
          employeeName: null,
        );
        _showGeofenceError(geofenceResult);
        return;
      }

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
            final attendanceId = result['attendance']?['id']?.toString() ?? '';
            final employeeId = result['employee']?['id']?.toString() ?? '';

            print('⚠️ [KIOSK] Fuera de turno - $employeeName ($lateMinutes min tarde)');
            await _showLateArrivalAlert(employeeName, lateMinutes, attendanceId, employeeId);
            return;
          }

          // 🟢 VERDE - Reconocido en BD (puede ser registro nuevo o detección repetida)
          final employeeName = result['employee']?['name'] ?? 'Empleado';
          final wasRegistered = result['registered'] ?? false;
          final detectionCount = result['detectionCount'] ?? 1;

          print('✅ [KIOSK] Reconocido - $employeeName (Registro: $wasRegistered, Detección #$detectionCount)');

          // Audio feedback con nombre personalizado
          await _audioService.provideFeedback(
            KioskAudioState.recognized,
            employeeName: employeeName,
          );
          _showTrafficLight(TrafficLightState.green);

          // Notificar por WebSocket
          _wsService.sendCheckIn({
            'employeeId': result['employee']?['id'],
            'employeeName': employeeName,
            'timestamp': DateTime.now().toIso8601String(),
          });
        } else {
          // 🔴 ROJO - No reconocido en BD
          print('❌ [KIOSK] No reconocido en BD');
          await _audioService.provideFeedback(
            KioskAudioState.notRecognized,
          );
          _showTrafficLight(TrafficLightState.red);
          await _registerFailedAttempt(imageBytes);
        }
      } else {
        // Error de servidor
        print('❌ [KIOSK] Server error: ${response.statusCode}');
        await _audioService.speakState(KioskAudioState.error);
      }
    } catch (e) {
      print('❌ [BACKEND] Error: $e');

      // 📴 MODO OFFLINE: Guardar localmente si falla la conexión
      if (e.toString().contains('SocketException') ||
          e.toString().contains('TimeoutException') ||
          e.toString().contains('ClientException')) {
        await _saveAttendanceOffline(imageBytes);
        await _audioService.speakState(KioskAudioState.offline);
        _showOfflineSavedNotification();
      } else {
        await _audioService.speakState(KioskAudioState.error);
      }
    }
  }

  /// 📴 Guardar asistencia en cola offline
  Future<void> _saveAttendanceOffline(List<int> imageBytes) async {
    try {
      final item = AttendanceQueueItem(
        userId: 0, // Se identificará por face cuando haya conexión
        type: 'check_in',
        timestamp: DateTime.now(),
        gpsLat: null,
        gpsLng: null,
        photo: base64Encode(imageBytes),
        embedding: null,
        confidence: null,
        deviceInfo: 'kiosk_${_companyId ?? "unknown"}',
        hardwareProfile: null,
        createdAt: DateTime.now(),
      );

      await _offlineQueue.addToQueue(item);

      setState(() {
        _isOfflineMode = true;
      });

      print('💾 [KIOSK] Attendance saved to offline queue');
    } catch (e) {
      print('❌ [KIOSK] Failed to save offline: $e');
    }
  }

  /// 📴 Mostrar notificación de guardado offline
  void _showOfflineSavedNotification() {
    if (!mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(Icons.cloud_off, color: Colors.white),
            SizedBox(width: 12),
            Expanded(
              child: Text('Fichaje guardado localmente. Se sincronizará cuando haya conexión.'),
            ),
          ],
        ),
        backgroundColor: Colors.orange.shade700,
        duration: Duration(seconds: 4),
        behavior: SnackBarBehavior.floating,
      ),
    );

    // Mostrar semáforo amarillo con ícono offline
    _showTrafficLight(TrafficLightState.yellow);
  }

  /// 🌍 MOSTRAR ERROR DE GEOFENCE
  void _showGeofenceError(GeofenceValidationResult result) {
    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (context) => AlertDialog(
        backgroundColor: Colors.red.shade700,
        title: Row(
          children: [
            Icon(Icons.location_off, color: Colors.white, size: 32),
            SizedBox(width: 12),
            Text(
              '📍 UBICACIÓN NO VÁLIDA',
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              result.userMessage,
              style: TextStyle(color: Colors.white, fontSize: 16),
            ),
            if (result.distanceOverLimit != null) ...[
              SizedBox(height: 8),
              Text(
                'Distancia extra: ${result.distanceOverLimit!.toInt()} metros',
                style: TextStyle(color: Colors.white70, fontSize: 14),
              ),
            ],
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text('Cerrar', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    // Auto-cerrar después de 3 segundos (con verificación segura)
    Future.delayed(Duration(seconds: 3), () {
      if (mounted && Navigator.of(context).canPop()) {
        try {
          Navigator.of(context, rootNavigator: true).pop();
        } catch (e) {
          // Dialog ya fue cerrado manualmente, ignorar
          print('⚠️ [KIOSK] Geofence dialog already closed');
        }
      }
    });
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

  /// 🚨 LLEGADA TARDÍA - FLUJO NO BLOQUEANTE
  /// El kiosk se libera inmediatamente para otros empleados.
  /// El empleado recibe notificación por email y tiene 5 minutos para volver
  /// una vez aprobado.
  Future<void> _showLateArrivalAlert(
    String employeeName,
    int lateMinutes,
    String attendanceId,
    String employeeId,
  ) async {
    print('⏰ [KIOSK] Late arrival detected: $employeeName ($lateMinutes min)');

    // 🔊 Audio feedback - informar al empleado
    await _audioService.provideFeedback(
      KioskAudioState.lateArrival,
      employeeName: employeeName,
      lateMinutes: lateMinutes,
    );

    // 📤 Solicitar autorización (envía emails a supervisores Y al empleado)
    final authResult = await _authPollingService.requestAuthorization(
      attendanceId: attendanceId,
      employeeId: employeeId,
      employeeName: employeeName,
      lateMinutes: lateMinutes,
    );

    if (!authResult.success) {
      print('❌ [KIOSK] Error solicitando autorización: ${authResult.error}');
    }

    // 📤 También notificar por WebSocket (para dashboard en tiempo real)
    _wsService.requestLateArrivalAuthorization(
      employeeId: employeeId,
      employeeName: employeeName,
      lateMinutes: lateMinutes,
      attendanceId: attendanceId,
    );

    // 🆕 BANNER NO-BLOQUEANTE (en lugar de dialog)
    _showNonBlockingBanner(
      employeeName: employeeName,
      lateMinutes: lateMinutes,
      message: 'Solicitud enviada. Revisa tu email. Puedes retirarte.',
    );

    // 🚦 Mostrar amarillo (esperando)
    _showTrafficLight(TrafficLightState.yellow);

    // 📝 Log para auditoría
    print('✅ [KIOSK] Authorization request sent - kiosk freed for other employees');
  }

  /// 🔔 BANNER NO-BLOQUEANTE
  /// Muestra mensaje temporal sin bloquear el kiosk
  void _showNonBlockingBanner({
    required String employeeName,
    required int lateMinutes,
    required String message,
    Duration duration = const Duration(seconds: 8),
  }) {
    // Usar SnackBar con comportamiento flotante
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.access_time, color: Colors.white, size: 24),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      '⏰ $employeeName - $lateMinutes min tarde',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                message,
                style: const TextStyle(fontSize: 14),
              ),
              const SizedBox(height: 4),
              const Text(
                '📧 Se enviará email con el resultado',
                style: TextStyle(fontSize: 12, color: Colors.white70),
              ),
            ],
          ),
        ),
        backgroundColor: Colors.orange.shade800,
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.only(
          bottom: 100,
          left: 20,
          right: 20,
        ),
        duration: duration,
        action: SnackBarAction(
          label: 'OK',
          textColor: Colors.white,
          onPressed: () {
            ScaffoldMessenger.of(context).hideCurrentSnackBar();
          },
        ),
      ),
    );
  }

  /// 🎉 MOSTRAR RESULTADO DE AUTORIZACIÓN (cuando llega por WebSocket)
  void _showAuthorizationResult({
    required bool approved,
    required String employeeName,
    String? approverName,
    int? windowMinutes,
  }) {
    final message = approved
        ? '✅ APROBADO por ${approverName ?? "supervisor"}. Tienes ${windowMinutes ?? 5} min para fichar.'
        : '❌ RECHAZADO por ${approverName ?? "supervisor"}. Contacta a RRHH.';

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(
              approved ? Icons.check_circle : Icons.cancel,
              color: Colors.white,
              size: 28,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        backgroundColor: approved ? Colors.green.shade700 : Colors.red.shade700,
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.only(bottom: 100, left: 20, right: 20),
        duration: const Duration(seconds: 10),
      ),
    );

    // Audio feedback
    if (approved) {
      _audioService.provideFeedback(
        KioskAudioState.authorizationApproved,
        employeeName: employeeName,
        approverName: approverName,
      );
    } else {
      _audioService.provideFeedback(KioskAudioState.authorizationRejected);
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
                  _audioService.stop();

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

    // 🧹 Limpiar servicios (audioService.stop() incluido en dispose())
    _audioService.dispose();
    _geofenceService.dispose();
    _wsService.disconnect();
    _authPollingService.dispose();
    _livenessService.dispose();

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

/// 🕐 DIALOG DE ESPERA DE AUTORIZACIÓN
class _LateArrivalWaitingDialog extends StatefulWidget {
  final String employeeName;
  final int lateMinutes;
  final String authorizationId;
  final AuthorizationPollingService authPollingService;
  final KioskAudioFeedbackService audioService;
  final Function(bool approved, String? approverName) onResult;

  const _LateArrivalWaitingDialog({
    required this.employeeName,
    required this.lateMinutes,
    required this.authorizationId,
    required this.authPollingService,
    required this.audioService,
    required this.onResult,
  });

  @override
  State<_LateArrivalWaitingDialog> createState() => _LateArrivalWaitingDialogState();
}

class _LateArrivalWaitingDialogState extends State<_LateArrivalWaitingDialog>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  bool _isWaiting = true;
  bool? _approved;
  String? _approverName;
  int _waitSeconds = 0;
  Timer? _countdownTimer;

  @override
  void initState() {
    super.initState();

    // Animación de pulso para indicador de espera
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    )..repeat(reverse: true);

    // Contador de tiempo
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (mounted) {
        setState(() {
          _waitSeconds++;
        });
      }
    });

    // Esperar respuesta de autorización
    _waitForAuthorization();
  }

  Future<void> _waitForAuthorization() async {
    final response = await widget.authPollingService.waitForAuthorization(
      widget.authorizationId,
      timeout: const Duration(minutes: 5),
    );

    if (!mounted) return;

    if (response != null) {
      setState(() {
        _isWaiting = false;
        _approved = response.approved;
        _approverName = response.approverName;
      });

      // Audio feedback según resultado
      if (response.approved) {
        await widget.audioService.provideFeedback(
          KioskAudioState.authorizationApproved,
          employeeName: widget.employeeName,
          approverName: response.approverName,
        );
      } else {
        await widget.audioService.provideFeedback(
          KioskAudioState.authorizationRejected,
        );
      }

      // Cerrar después de 2 segundos
      await Future.delayed(const Duration(seconds: 2));
      if (mounted) {
        widget.onResult(_approved ?? false, _approverName);
      }
    } else {
      // Timeout - cerrar sin resultado
      if (mounted) {
        setState(() {
          _isWaiting = false;
        });
        await widget.audioService.speak('Tiempo de espera agotado');
        await Future.delayed(const Duration(seconds: 2));
        if (mounted) {
          widget.onResult(false, null);
        }
      }
    }
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _countdownTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: _isWaiting
          ? Colors.orange.shade700
          : (_approved == true ? Colors.green.shade700 : Colors.red.shade700),
      title: Row(
        children: [
          if (_isWaiting)
            AnimatedBuilder(
              animation: _pulseController,
              builder: (context, child) {
                return Opacity(
                  opacity: 0.5 + (_pulseController.value * 0.5),
                  child: const Icon(Icons.hourglass_top, color: Colors.white, size: 32),
                );
              },
            )
          else
            Icon(
              _approved == true ? Icons.check_circle : Icons.cancel,
              color: Colors.white,
              size: 32,
            ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              _isWaiting
                  ? '⏳ AGUARDANDO AUTORIZACIÓN'
                  : (_approved == true ? '✅ AUTORIZADO' : '❌ RECHAZADO'),
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
          ),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            widget.employeeName,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Llegó ${widget.lateMinutes} minutos tarde',
            style: const TextStyle(color: Colors.white70, fontSize: 16),
          ),
          const SizedBox(height: 16),
          if (_isWaiting) ...[
            Text(
              '🔔 Notificando a supervisores...',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Tiempo de espera: ${_waitSeconds}s',
              style: const TextStyle(color: Colors.white70, fontSize: 12),
            ),
            const SizedBox(height: 16),
            const LinearProgressIndicator(
              backgroundColor: Colors.white24,
              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
            ),
          ] else ...[
            if (_approverName != null)
              Text(
                'Autorizado por: $_approverName',
                style: const TextStyle(color: Colors.white, fontSize: 14),
              ),
          ],
        ],
      ),
    );
  }
}
