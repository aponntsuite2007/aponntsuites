import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/services.dart';
import 'package:local_auth/local_auth.dart';
import 'package:camera/camera.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:pattern_lock/pattern_lock.dart';
import 'package:speech_to_text/speech_to_text.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:crypto/crypto.dart';
import 'package:image/image.dart' as img;
import 'multi_tenant_security_service.dart';

/// 🔐 Servicio de Autenticación Biométrica Unificado
/// Integra todos los métodos de autenticación biométrica con aislamiento por empresa
class BiometricAuthenticationService {
  static const String _voiceTemplateKey = 'VOICE_TEMPLATE';
  static const String _faceTemplateKey = 'FACE_TEMPLATE';
  static const String _fingerprintTemplateKey = 'FINGERPRINT_TEMPLATE';
  static const String _patternKey = 'PATTERN_HASH';
  static const String _passwordKey = 'PASSWORD_HASH';

  final LocalAuthentication _localAuth = LocalAuthentication();
  final SpeechToText _speechToText = SpeechToText();
  final FlutterTts _flutterTts = FlutterTts();
  final MultiTenantSecurityService _securityService;

  CameraController? _cameraController;
  MobileScannerController? _qrController;

  List<CameraDescription> _cameras = [];
  bool _isInitialized = false;
  bool _speechEnabled = false;

  BiometricAuthenticationService(this._securityService);

  /// 🚀 Inicializa todos los servicios biométricos
  Future<bool> initialize() async {
    try {
      print('🔐 [BIOMETRIC] Inicializando servicios de autenticación...');

      // Inicializar cámaras
      _cameras = await availableCameras();

      // Configurar TTS para accesibilidad
      await _initializeTts();

      // Inicializar reconocimiento de voz
      _speechEnabled = await _speechToText.initialize(
        onError: (error) => print('❌ [VOICE] Error: ${error.errorMsg}'),
        onStatus: (status) => print('🎙️ [VOICE] Estado: $status'),
      );

      // Inicializar controlador QR
      _qrController = MobileScannerController();

      _isInitialized = true;
      print('✅ [BIOMETRIC] Servicios inicializados correctamente');
      await _speak('Sistema biométrico listo para autenticación');

      return true;
    } catch (e) {
      print('❌ [BIOMETRIC] Error inicializando: $e');
      return false;
    }
  }

  /// 🎙️ Configura TTS para usuarios con discapacidad visual
  Future<void> _initializeTts() async {
    await _flutterTts.setLanguage('es-ES');
    await _flutterTts.setSpeechRate(0.8);
    await _flutterTts.setVolume(1.0);
    await _flutterTts.setPitch(1.0);
  }

  /// 🔊 Reproduce mensaje de voz
  Future<void> _speak(String message) async {
    await _flutterTts.speak(message);
  }

  /// 🔍 Verifica disponibilidad de métodos biométricos
  Future<BiometricCapabilities> getAvailableCapabilities() async {
    final capabilities = BiometricCapabilities();

    try {
      // Verificar biometría nativa (huella, facial)
      capabilities.hasLocalAuth = await _localAuth.canCheckBiometrics;
      capabilities.availableBiometrics = await _localAuth.getAvailableBiometrics();

      // Verificar cámara para reconocimiento facial y QR
      capabilities.hasCamera = _cameras.isNotEmpty;

      // Verificar reconocimiento de voz
      capabilities.hasVoiceRecognition = _speechEnabled;

      // Siempre disponibles
      capabilities.hasPattern = true;
      capabilities.hasPassword = true;
      capabilities.hasQR = true;

      print('✅ [BIOMETRIC] Capacidades disponibles: ${capabilities.toString()}');

    } catch (e) {
      print('❌ [BIOMETRIC] Error verificando capacidades: $e');
    }

    return capabilities;
  }

  /// 🔐 Autenticación por huella dactilar
  Future<AuthResult> authenticateFingerprint(String employeeId) async {
    try {
      await _speak('Coloque su dedo en el sensor de huella');

      final bool isAuthenticated = await _localAuth.authenticate(
        localizedReason: 'Verificar identidad con huella dactilar',
        options: const AuthenticationOptions(
          biometricOnly: true,
          stickyAuth: true,
        ),
      );

      if (isAuthenticated) {
        print('✅ [FINGERPRINT] Autenticación exitosa para: $employeeId');
        await _speak('Huella verificada correctamente');
        return AuthResult.success('fingerprint', employeeId);
      } else {
        await _speak('Huella no reconocida, intente nuevamente');
        return AuthResult.failure('Huella no reconocida');
      }
    } catch (e) {
      print('❌ [FINGERPRINT] Error: $e');
      await _speak('Error en el sensor de huella');
      return AuthResult.failure('Error en autenticación por huella: $e');
    }
  }

  /// 👤 Autenticación facial con cámara
  Future<AuthResult> authenticateFace(String employeeId) async {
    try {
      await _speak('Posicione su rostro frente a la cámara');

      if (_cameras.isEmpty) {
        return AuthResult.failure('Cámara no disponible');
      }

      _cameraController = CameraController(
        _cameras.firstWhere((camera) => camera.lensDirection == CameraLensDirection.front),
        ResolutionPreset.medium,
      );

      await _cameraController!.initialize();

      // Capturar imagen
      final XFile imageFile = await _cameraController!.takePicture();
      final Uint8List imageBytes = await imageFile.readAsBytes();

      // Procesar imagen facial
      final faceData = await _processFaceImage(imageBytes);

      // Comparar con template almacenado
      final storedTemplate = await _securityService.getBiometricData(employeeId, 'face');

      if (storedTemplate != null && await _compareFaceTemplates(faceData, storedTemplate)) {
        print('✅ [FACE] Autenticación exitosa para: $employeeId');
        await _speak('Rostro verificado correctamente');
        return AuthResult.success('face', employeeId);
      } else {
        await _speak('Rostro no reconocido, intente nuevamente');
        return AuthResult.failure('Rostro no reconocido');
      }
    } catch (e) {
      print('❌ [FACE] Error: $e');
      await _speak('Error en reconocimiento facial');
      return AuthResult.failure('Error en autenticación facial: $e');
    } finally {
      await _cameraController?.dispose();
      _cameraController = null;
    }
  }

  /// 📱 Autenticación por código QR con token temporal
  Future<AuthResult> authenticateQR() async {
    try {
      await _speak('Escanee el código QR temporal');

      if (_qrController == null) {
        return AuthResult.failure('Scanner QR no disponible');
      }

      // Capturar QR
      final BarcodeCapture? capture = await _qrController!.start();

      if (capture?.barcodes.isNotEmpty == true) {
        final String qrData = capture!.barcodes.first.rawValue ?? '';

        // Validar token QR
        final tokenData = await _securityService.validateQRToken(qrData);

        if (tokenData != null) {
          final employeeId = tokenData['employeeId'] as String;
          print('✅ [QR] Autenticación exitosa para: $employeeId');
          await _speak('Código QR válido, acceso concedido');
          return AuthResult.success('qr', employeeId);
        } else {
          await _speak('Código QR expirado o inválido');
          return AuthResult.failure('Token QR inválido o expirado');
        }
      } else {
        await _speak('No se pudo leer el código QR');
        return AuthResult.failure('QR no detectado');
      }
    } catch (e) {
      print('❌ [QR] Error: $e');
      await _speak('Error escaneando código QR');
      return AuthResult.failure('Error en autenticación QR: $e');
    }
  }

  /// 🔢 Autenticación por patrón
  Future<AuthResult> authenticatePattern(String employeeId, List<int> inputPattern) async {
    try {
      await _speak('Dibuje su patrón de seguridad');

      // Convertir patrón a hash
      final patternHash = _hashPattern(inputPattern);

      // Comparar con patrón almacenado
      final storedPattern = await _securityService.getBiometricData(employeeId, 'pattern');

      if (storedPattern != null && storedPattern == patternHash) {
        print('✅ [PATTERN] Autenticación exitosa para: $employeeId');
        await _speak('Patrón correcto, acceso concedido');
        return AuthResult.success('pattern', employeeId);
      } else {
        await _speak('Patrón incorrecto, intente nuevamente');
        return AuthResult.failure('Patrón incorrecto');
      }
    } catch (e) {
      print('❌ [PATTERN] Error: $e');
      await _speak('Error en verificación de patrón');
      return AuthResult.failure('Error en autenticación por patrón: $e');
    }
  }

  /// 🔑 Autenticación por contraseña
  Future<AuthResult> authenticatePassword(String employeeId, String password) async {
    try {
      // Hash de la contraseña
      final passwordHash = _hashPassword(password);

      // Comparar con contraseña almacenada
      final storedPassword = await _securityService.getBiometricData(employeeId, 'password');

      if (storedPassword != null && storedPassword == passwordHash) {
        print('✅ [PASSWORD] Autenticación exitosa para: $employeeId');
        await _speak('Contraseña correcta, acceso concedido');
        return AuthResult.success('password', employeeId);
      } else {
        await _speak('Contraseña incorrecta');
        return AuthResult.failure('Contraseña incorrecta');
      }
    } catch (e) {
      print('❌ [PASSWORD] Error: $e');
      return AuthResult.failure('Error en autenticación por contraseña: $e');
    }
  }

  /// 🎙️ Autenticación por voz (para personas con discapacidad visual)
  Future<AuthResult> authenticateVoice(String employeeId) async {
    try {
      await _speak('Diga la frase de seguridad: Mi voz es mi contraseña');

      if (!_speechEnabled) {
        return AuthResult.failure('Reconocimiento de voz no disponible');
      }

      String recognizedText = '';

      await _speechToText.listen(
        onResult: (result) {
          recognizedText = result.recognizedWords.toLowerCase();
        },
        listenFor: const Duration(seconds: 5),
        pauseFor: const Duration(seconds: 3),
      );

      // Esperar a que termine el reconocimiento
      await Future.delayed(const Duration(seconds: 6));

      // Procesar muestra de voz
      final voiceData = await _processVoiceSample(recognizedText);

      // Comparar con template de voz almacenado
      final storedVoiceTemplate = await _securityService.getBiometricData(employeeId, 'voice');

      if (storedVoiceTemplate != null && await _compareVoiceTemplates(voiceData, storedVoiceTemplate)) {
        print('✅ [VOICE] Autenticación exitosa para: $employeeId');
        await _speak('Voz verificada correctamente, acceso concedido');
        return AuthResult.success('voice', employeeId);
      } else {
        await _speak('Voz no reconocida, intente nuevamente');
        return AuthResult.failure('Voz no reconocida');
      }
    } catch (e) {
      print('❌ [VOICE] Error: $e');
      await _speak('Error en reconocimiento de voz');
      return AuthResult.failure('Error en autenticación por voz: $e');
    }
  }

  /// 📝 Registra datos biométricos para un empleado
  Future<bool> registerBiometricData(String employeeId, String biometricType, dynamic data) async {
    try {
      String processedData;

      switch (biometricType) {
        case 'face':
          processedData = await _processFaceImage(data as Uint8List);
          break;
        case 'voice':
          processedData = await _processVoiceSample(data as String);
          break;
        case 'pattern':
          processedData = _hashPattern(data as List<int>);
          break;
        case 'password':
          processedData = _hashPassword(data as String);
          break;
        default:
          processedData = data.toString();
      }

      await _securityService.storeBiometricData(employeeId, biometricType, processedData);
      print('✅ [REGISTER] Datos biométricos registrados: $biometricType para $employeeId');

      return true;
    } catch (e) {
      print('❌ [REGISTER] Error registrando datos biométricos: $e');
      return false;
    }
  }

  /// 🖼️ Procesa imagen facial para crear template
  Future<String> _processFaceImage(Uint8List imageBytes) async {
    try {
      final image = img.decodeImage(imageBytes);
      if (image == null) throw Exception('No se pudo decodificar la imagen');

      // Redimensionar y normalizar imagen
      final resized = img.copyResize(image, width: 128, height: 128);
      final grayscale = img.grayscale(resized);

      // Extraer características faciales (simplificado)
      final features = <int>[];
      for (int y = 0; y < grayscale.height; y += 8) {
        for (int x = 0; x < grayscale.width; x += 8) {
          final pixel = grayscale.getPixel(x, y);
          features.add(img.getRed(pixel));
        }
      }

      // Crear hash de características
      final featuresStr = features.join(',');
      final bytes = utf8.encode(featuresStr);
      final digest = sha256.convert(bytes);

      return digest.toString();
    } catch (e) {
      print('❌ [FACE] Error procesando imagen: $e');
      rethrow;
    }
  }

  /// 🎙️ Procesa muestra de voz para crear template
  Future<String> _processVoiceSample(String recognizedText) async {
    try {
      // Normalizar texto
      final normalized = recognizedText.toLowerCase().replaceAll(RegExp(r'[^\w\s]'), '');

      // Crear características de voz (simplificado)
      final features = <String>[];
      features.add('length:${normalized.length}');
      features.add('words:${normalized.split(' ').length}');
      features.add('vowels:${RegExp(r'[aeiou]').allMatches(normalized).length}');
      features.add('consonants:${RegExp(r'[bcdfghjklmnpqrstvwxyz]').allMatches(normalized).length}');

      // Hash de características vocales
      final featuresStr = features.join('|');
      final bytes = utf8.encode('$featuresStr:$normalized');
      final digest = sha256.convert(bytes);

      return digest.toString();
    } catch (e) {
      print('❌ [VOICE] Error procesando muestra de voz: $e');
      rethrow;
    }
  }

  /// 🔢 Genera hash del patrón
  String _hashPattern(List<int> pattern) {
    final patternStr = pattern.join(',');
    final bytes = utf8.encode(patternStr);
    return sha256.convert(bytes).toString();
  }

  /// 🔑 Genera hash de contraseña
  String _hashPassword(String password) {
    final bytes = utf8.encode(password);
    return sha256.convert(bytes).toString();
  }

  /// 👤 Compara templates faciales
  Future<bool> _compareFaceTemplates(String template1, String template2) async {
    return template1 == template2;
  }

  /// 🎙️ Compara templates de voz
  Future<bool> _compareVoiceTemplates(String template1, String template2) async {
    return template1 == template2;
  }

  /// 🧹 Limpia recursos
  Future<void> dispose() async {
    await _cameraController?.dispose();
    await _qrController?.dispose();
    await _speechToText.stop();
    await _flutterTts.stop();
  }
}

/// 📊 Capacidades biométricas disponibles
class BiometricCapabilities {
  bool hasLocalAuth = false;
  bool hasCamera = false;
  bool hasVoiceRecognition = false;
  bool hasPattern = false;
  bool hasPassword = false;
  bool hasQR = false;
  List<BiometricType> availableBiometrics = [];

  @override
  String toString() {
    return 'BiometricCapabilities(localAuth: $hasLocalAuth, camera: $hasCamera, voice: $hasVoiceRecognition, pattern: $hasPattern, password: $hasPassword, qr: $hasQR, types: $availableBiometrics)';
  }
}

/// 📋 Resultado de autenticación
class AuthResult {
  final bool success;
  final String method;
  final String? employeeId;
  final String? error;
  final DateTime timestamp;

  AuthResult._(this.success, this.method, this.employeeId, this.error, this.timestamp);

  factory AuthResult.success(String method, String employeeId) {
    return AuthResult._(true, method, employeeId, null, DateTime.now());
  }

  factory AuthResult.failure(String error, [String? method]) {
    return AuthResult._(false, method ?? 'unknown', null, error, DateTime.now());
  }

  @override
  String toString() {
    return 'AuthResult(success: $success, method: $method, employeeId: $employeeId, error: $error, time: $timestamp)';
  }
}