/*
 * 🎯 EMPLOYEE BIOMETRIC CAPTURE SERVICE
 * ======================================
 * Servicio de captura biométrica para la APP DEL EMPLEADO
 * Basado en la tecnología del kiosk pero con validación local previa
 *
 * DIFERENCIA CON KIOSK:
 * - Requiere autenticación local (PIN/huella) ANTES de capturar
 * - Solo el dueño del teléfono puede fichar
 * - No es modo desatendido
 *
 * Fecha: 2025-11-29
 * Versión: 1.0.0
 *
 * ⚠️ ESTE ARCHIVO ES INDEPENDIENTE - NO MODIFICA NADA DEL KIOSK
 */

import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;
import 'dart:typed_data';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:camera/camera.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';
import 'package:local_auth/local_auth.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart' as http_parser;

/// 🧠 SMART CAPTURE - Evaluador de calidad (COPIA del kiosk)
/// Mismo algoritmo pero para uso en app del empleado
class EmployeeSmartCapture {
  DateTime? _lastCapture;
  final Duration _minInterval = const Duration(milliseconds: 300);
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
      confidenceScore = 0.9;
    } else {
      confidenceScore = 0.6;
    }

    // 2. Tamaño del rostro (más grande = mejor)
    final faceArea = face.boundingBox.width * face.boundingBox.height;
    final imageArea = imageSize.width * imageSize.height;
    final faceSizeRatio = faceArea / imageArea;
    sizeScore = math.min(faceSizeRatio * 8, 1.0);

    // 3. Ángulo frontal
    if (face.headEulerAngleX != null &&
        face.headEulerAngleY != null &&
        face.headEulerAngleZ != null) {
      final xAngle = face.headEulerAngleX!.abs();
      final yAngle = face.headEulerAngleY!.abs();
      final zAngle = face.headEulerAngleZ!.abs();
      angleScore =
          math.max(0.0, 1.0 - (xAngle / 15 + yAngle / 15 + zAngle / 10) / 3);
    } else {
      angleScore = 0.7;
    }

    final quality =
        (confidenceScore * 0.5) + (sizeScore * 0.3) + (angleScore * 0.2);
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

  void reset() {
    _lastCapture = null;
    _isProcessing = false;
  }
}

/// 🚦 Estado del semáforo
enum EmployeeTrafficLightState { yellow, green, red }

/// 📋 Resultado de la captura del empleado
class EmployeeCaptureResult {
  final bool success;
  final String message;
  final String? employeeName;
  final String? attendanceId;
  final bool needsAuthorization;
  final int? lateMinutes;
  final Map<String, dynamic>? rawResponse;

  EmployeeCaptureResult({
    required this.success,
    required this.message,
    this.employeeName,
    this.attendanceId,
    this.needsAuthorization = false,
    this.lateMinutes,
    this.rawResponse,
  });
}

/// 🔐 Resultado de autenticación local
class LocalAuthResult {
  final bool success;
  final String method; // 'biometric', 'pin', 'pattern'
  final String? error;

  LocalAuthResult({
    required this.success,
    required this.method,
    this.error,
  });
}

/// 🎯 EMPLOYEE BIOMETRIC CAPTURE SERVICE
/// =====================================
/// Servicio principal de captura biométrica para empleados
class EmployeeBiometricCaptureService {
  static final EmployeeBiometricCaptureService _instance =
      EmployeeBiometricCaptureService._internal();
  factory EmployeeBiometricCaptureService() => _instance;
  EmployeeBiometricCaptureService._internal();

  // 🎥 CÁMARA
  CameraController? _cameraController;
  List<CameraDescription>? _cameras;
  bool _isCameraInitialized = false;

  // 🧠 GOOGLE ML KIT FACE DETECTION
  FaceDetector? _faceDetector;
  final EmployeeSmartCapture _smartCapture = EmployeeSmartCapture();
  bool _isStreamActive = false;

  // 🔐 LOCAL AUTH
  final LocalAuthentication _localAuth = LocalAuthentication();
  bool _isLocalAuthAvailable = false;
  bool _isLocalAuthVerified = false;

  // 🌐 CONFIGURACIÓN
  String? _serverUrl;
  String? _companyId;
  String? _authToken;
  String? _userId;

  // 🚦 ESTADO
  EmployeeTrafficLightState _trafficLight = EmployeeTrafficLightState.yellow;
  bool _isProcessing = false;
  bool _isInitialized = false;

  // 📡 CALLBACKS
  Function(EmployeeTrafficLightState)? onTrafficLightChange;
  Function(String)? onStatusMessage;
  Function(EmployeeCaptureResult)? onCaptureResult;
  Function(double)? onQualityUpdate;

  // Getters
  bool get isInitialized => _isInitialized;
  bool get isCameraInitialized => _isCameraInitialized;
  bool get isLocalAuthVerified => _isLocalAuthVerified;
  bool get isProcessing => _isProcessing;
  EmployeeTrafficLightState get trafficLight => _trafficLight;
  CameraController? get cameraController => _cameraController;

  /// 🚀 INICIALIZAR SERVICIO COMPLETO
  Future<bool> initialize() async {
    try {
      debugPrint('🎯 [EMPLOYEE-BIOMETRIC] Inicializando servicio...');

      // 1. Cargar configuración
      await _loadConfiguration();

      // 2. Verificar disponibilidad de autenticación local
      await _checkLocalAuthAvailability();

      // 3. Inicializar ML Kit
      await _initializeFaceDetector();

      // 4. Inicializar cámara
      await _initializeCamera();

      _isInitialized = true;
      debugPrint('✅ [EMPLOYEE-BIOMETRIC] Servicio inicializado');
      return true;
    } catch (e) {
      debugPrint('❌ [EMPLOYEE-BIOMETRIC] Error inicializando: $e');
      return false;
    }
  }

  /// 📡 CARGAR CONFIGURACIÓN
  Future<void> _loadConfiguration() async {
    final prefs = await SharedPreferences.getInstance();
    _companyId = prefs.getString('config_company_id');
    _authToken = prefs.getString('auth_token');
    _userId = prefs.getString('user_id');

    // Construir URL del servidor
    final serverIp = prefs.getString('config_server_ip') ?? '';
    final serverPort = prefs.getString('config_server_port') ?? '';
    final useHttps = prefs.getBool('config_use_https') ?? false;

    if (serverIp.isNotEmpty) {
      final protocol = useHttps ? 'https' : 'http';
      _serverUrl = serverPort.isNotEmpty
          ? '$protocol://$serverIp:$serverPort'
          : '$protocol://$serverIp';
    }

    debugPrint(
        '🌐 [EMPLOYEE-BIOMETRIC] Server: $_serverUrl | Company: $_companyId');
  }

  /// 🔐 VERIFICAR DISPONIBILIDAD DE AUTH LOCAL
  Future<void> _checkLocalAuthAvailability() async {
    try {
      _isLocalAuthAvailable = await _localAuth.canCheckBiometrics;
      final availableBiometrics = await _localAuth.getAvailableBiometrics();

      debugPrint(
          '🔐 [LOCAL-AUTH] Disponible: $_isLocalAuthAvailable | Métodos: $availableBiometrics');
    } catch (e) {
      debugPrint('⚠️ [LOCAL-AUTH] Error verificando: $e');
      _isLocalAuthAvailable = false;
    }
  }

  /// 🔐 AUTENTICAR LOCALMENTE (REQUERIDO ANTES DE FICHAR)
  /// Esta es la DIFERENCIA CLAVE con el kiosk
  Future<LocalAuthResult> authenticateLocally() async {
    try {
      if (!_isLocalAuthAvailable) {
        // Fallback: si no hay biometría local, usar PIN o pasar
        debugPrint('⚠️ [LOCAL-AUTH] Biometría no disponible, usando fallback');
        _isLocalAuthVerified = true;
        return LocalAuthResult(success: true, method: 'fallback');
      }

      final didAuthenticate = await _localAuth.authenticate(
        localizedReason: 'Verifica tu identidad para registrar asistencia',
        options: const AuthenticationOptions(
          stickyAuth: true,
          biometricOnly: false, // Permite PIN como fallback
        ),
      );

      if (didAuthenticate) {
        _isLocalAuthVerified = true;
        debugPrint('✅ [LOCAL-AUTH] Autenticación exitosa');
        return LocalAuthResult(success: true, method: 'biometric');
      } else {
        debugPrint('❌ [LOCAL-AUTH] Autenticación fallida');
        return LocalAuthResult(
          success: false,
          method: 'biometric',
          error: 'Autenticación cancelada o fallida',
        );
      }
    } on PlatformException catch (e) {
      debugPrint('❌ [LOCAL-AUTH] Error de plataforma: $e');
      return LocalAuthResult(
        success: false,
        method: 'error',
        error: e.message,
      );
    }
  }

  /// 🧠 INICIALIZAR GOOGLE ML KIT FACE DETECTOR
  Future<void> _initializeFaceDetector() async {
    try {
      final options = FaceDetectorOptions(
        enableClassification: true,
        enableLandmarks: true,
        enableContours: false,
        enableTracking: true,
        minFaceSize: 0.15,
        performanceMode: FaceDetectorMode.accurate,
      );

      _faceDetector = FaceDetector(options: options);
      debugPrint('✅ [ML-KIT] Face Detector inicializado');
    } catch (e) {
      debugPrint('❌ [ML-KIT] Error: $e');
    }
  }

  /// 🎥 INICIALIZAR CÁMARA FRONTAL
  Future<void> _initializeCamera() async {
    try {
      _cameras = await availableCameras();
      if (_cameras == null || _cameras!.isEmpty) {
        debugPrint('❌ [CAMERA] No hay cámaras disponibles');
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

      _isCameraInitialized = true;
      debugPrint('✅ [CAMERA] Cámara inicializada');
    } catch (e) {
      debugPrint('❌ [CAMERA] Error: $e');
    }
  }

  /// 📸 INICIAR CAPTURA CONTINUA (mismo proceso del kiosk)
  void startContinuousCapture() {
    if (!_isLocalAuthVerified) {
      debugPrint(
          '❌ [CAPTURE] Debe autenticarse localmente antes de capturar');
      onStatusMessage?.call('Debe verificar su identidad primero');
      return;
    }

    if (_faceDetector == null || _cameraController == null) {
      debugPrint('❌ [CAPTURE] FaceDetector o cámara no inicializados');
      return;
    }

    if (_isStreamActive) {
      debugPrint('⚠️ [CAPTURE] Stream ya activo');
      return;
    }

    try {
      _isStreamActive = true;
      _smartCapture.reset();
      debugPrint('🚀 [CAPTURE] Iniciando detección continua...');
      onStatusMessage?.call('Mire a la cámara...');

      _cameraController!.startImageStream((CameraImage cameraImage) async {
        if (_smartCapture.isProcessing || _isProcessing) return;
        if (!_smartCapture.shouldCapture()) return;

        await _processStreamFrame(cameraImage);
      });

      debugPrint('✅ [CAPTURE] Streaming activo');
    } catch (e) {
      debugPrint('❌ [CAPTURE] Error iniciando stream: $e');
      _isStreamActive = false;
    }
  }

  /// 🔍 PROCESAR FRAME DEL STREAM
  Future<void> _processStreamFrame(CameraImage cameraImage) async {
    try {
      final inputImage = _convertCameraImage(cameraImage);
      if (inputImage == null) return;

      final faces = await _faceDetector!.processImage(inputImage);

      if (faces.isEmpty) return;

      final bestFace = faces.first;
      final imageSize = Size(
        cameraImage.width.toDouble(),
        cameraImage.height.toDouble(),
      );
      final quality = _smartCapture.calculateQuality(bestFace, imageSize);

      // Notificar calidad
      onQualityUpdate?.call(quality);

      if (_smartCapture.isQualityGood(quality)) {
        debugPrint(
            '✅ [CAPTURE] Calidad óptima (${quality.toStringAsFixed(2)}) - Capturando...');
        onStatusMessage?.call('Capturando...');

        _smartCapture.setProcessing(true);
        _smartCapture.markCapture();

        await _cameraController!.stopImageStream();
        _isStreamActive = false;

        await _captureHighQualityAndProcess();

        _smartCapture.setProcessing(false);
      }
    } catch (e) {
      debugPrint('❌ [CAPTURE] Error procesando frame: $e');
    }
  }

  /// 🔄 CONVERTIR CameraImage A InputImage
  InputImage? _convertCameraImage(CameraImage cameraImage) {
    try {
      final camera = _cameras!.firstWhere(
        (cam) => cam.lensDirection == CameraLensDirection.front,
        orElse: () => _cameras!.first,
      );

      InputImageRotation? rotation;

      if (Platform.isAndroid) {
        rotation = InputImageRotation.rotation270deg;
      } else if (Platform.isIOS) {
        rotation = InputImageRotation.rotation0deg;
      }

      final format =
          InputImageFormatValue.fromRawValue(cameraImage.format.raw);
      if (format == null) return null;

      final inputImage = InputImage.fromBytes(
        bytes: _concatenatePlanes(cameraImage.planes),
        metadata: InputImageMetadata(
          size: Size(
              cameraImage.width.toDouble(), cameraImage.height.toDouble()),
          rotation: rotation ?? InputImageRotation.rotation0deg,
          format: format,
          bytesPerRow: cameraImage.planes[0].bytesPerRow,
        ),
      );

      return inputImage;
    } catch (e) {
      debugPrint('❌ [CONVERT] Error: $e');
      return null;
    }
  }

  /// 📦 CONCATENAR PLANES
  Uint8List _concatenatePlanes(List<Plane> planes) {
    final WriteBuffer allBytes = WriteBuffer();
    for (Plane plane in planes) {
      allBytes.putUint8List(plane.bytes);
    }
    return allBytes.done().buffer.asUint8List();
  }

  /// 📸 CAPTURAR IMAGEN HQ Y PROCESAR
  Future<void> _captureHighQualityAndProcess() async {
    if (_isProcessing || _serverUrl == null || _companyId == null) {
      onStatusMessage?.call('Error de configuración');
      return;
    }

    _isProcessing = true;
    _setTrafficLight(EmployeeTrafficLightState.yellow);

    try {
      final image = await _cameraController!.takePicture();
      final imageBytes = await image.readAsBytes();

      await _sendToBackend(imageBytes);
    } catch (e) {
      debugPrint('❌ [CAPTURE-HQ] Error: $e');
      _setTrafficLight(EmployeeTrafficLightState.red);
      onStatusMessage?.call('Error al capturar');
      onCaptureResult?.call(EmployeeCaptureResult(
        success: false,
        message: 'Error al capturar imagen: $e',
      ));
    } finally {
      _isProcessing = false;
    }
  }

  /// 📡 ENVIAR AL BACKEND
  Future<void> _sendToBackend(List<int> imageBytes) async {
    try {
      final uri =
          Uri.parse('$_serverUrl/api/v2/biometric-attendance/verify-real');
      final request = http.MultipartRequest('POST', uri);

      // Headers multi-tenant
      request.headers['X-Company-Id'] = _companyId!;
      request.headers['X-Employee-Mode'] = 'true'; // Diferencia del kiosk
      if (_authToken != null) {
        request.headers['Authorization'] = 'Bearer $_authToken';
      }

      // Agregar imagen
      request.files.add(http.MultipartFile.fromBytes(
        'biometricImage',
        imageBytes,
        filename: 'employee_capture.jpg',
        contentType: http_parser.MediaType('image', 'jpeg'),
      ));

      request.fields['embedding'] = '[]';
      request.fields['userId'] = _userId ?? '';

      onStatusMessage?.call('Verificando...');

      final streamedResponse =
          await request.send().timeout(const Duration(seconds: 15));
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200) {
        final result = jsonDecode(response.body);

        if (result['success'] == true) {
          if (result['needsAuthorization'] == true) {
            // Llegada tardía
            final employeeName = result['employee']?['name'] ?? 'Empleado';
            final lateMinutes = result['authorization']?['lateMinutes'] ?? 0;

            debugPrint(
                '⚠️ [EMPLOYEE] Llegada tardía - $employeeName ($lateMinutes min)');
            _setTrafficLight(EmployeeTrafficLightState.yellow);
            onStatusMessage
                ?.call('Llegada tardía - Solicitud de autorización enviada');

            onCaptureResult?.call(EmployeeCaptureResult(
              success: true,
              message: 'Llegada tardía - Solicitud enviada',
              employeeName: employeeName,
              needsAuthorization: true,
              lateMinutes: lateMinutes,
              rawResponse: result,
            ));
          } else {
            // Fichaje exitoso
            final employeeName = result['employee']?['name'] ?? 'Empleado';

            debugPrint('✅ [EMPLOYEE] Fichaje exitoso - $employeeName');
            _setTrafficLight(EmployeeTrafficLightState.green);
            onStatusMessage?.call('¡Fichaje registrado! $employeeName');

            onCaptureResult?.call(EmployeeCaptureResult(
              success: true,
              message: 'Fichaje registrado exitosamente',
              employeeName: employeeName,
              attendanceId: result['attendance']?['id']?.toString(),
              rawResponse: result,
            ));
          }
        } else {
          // No reconocido
          debugPrint('❌ [EMPLOYEE] No reconocido');
          _setTrafficLight(EmployeeTrafficLightState.red);
          onStatusMessage?.call('No reconocido - Intente de nuevo');

          onCaptureResult?.call(EmployeeCaptureResult(
            success: false,
            message: 'Rostro no reconocido',
            rawResponse: result,
          ));
        }
      } else {
        debugPrint('❌ [EMPLOYEE] Error servidor: ${response.statusCode}');
        _setTrafficLight(EmployeeTrafficLightState.red);
        onStatusMessage?.call('Error de servidor');

        onCaptureResult?.call(EmployeeCaptureResult(
          success: false,
          message: 'Error del servidor: ${response.statusCode}',
        ));
      }
    } catch (e) {
      debugPrint('❌ [EMPLOYEE] Error: $e');
      _setTrafficLight(EmployeeTrafficLightState.red);
      onStatusMessage?.call('Error de conexión');

      onCaptureResult?.call(EmployeeCaptureResult(
        success: false,
        message: 'Error de conexión: $e',
      ));
    }
  }

  /// 🚦 CAMBIAR SEMÁFORO
  void _setTrafficLight(EmployeeTrafficLightState state) {
    _trafficLight = state;
    onTrafficLightChange?.call(state);

    // Auto-reset a amarillo después de 2 segundos
    if (state != EmployeeTrafficLightState.yellow) {
      Future.delayed(const Duration(seconds: 2), () {
        if (_trafficLight == state) {
          _trafficLight = EmployeeTrafficLightState.yellow;
          onTrafficLightChange?.call(EmployeeTrafficLightState.yellow);
        }
      });
    }
  }

  /// ⏹️ DETENER CAPTURA
  void stopCapture() {
    if (_isStreamActive && _cameraController != null) {
      _cameraController!.stopImageStream().catchError((e) {
        debugPrint('⚠️ [CAPTURE] Error deteniendo stream: $e');
      });
      _isStreamActive = false;
    }
    _smartCapture.reset();
  }

  /// 🔄 REINICIAR PARA NUEVA CAPTURA
  void resetForNewCapture() {
    _isLocalAuthVerified = false;
    _smartCapture.reset();
    _setTrafficLight(EmployeeTrafficLightState.yellow);
  }

  /// 🧹 DISPOSE
  Future<void> dispose() async {
    stopCapture();
    await _cameraController?.dispose();
    await _faceDetector?.close();
    _isInitialized = false;
    _isCameraInitialized = false;
    debugPrint('🧹 [EMPLOYEE-BIOMETRIC] Servicio limpiado');
  }
}
