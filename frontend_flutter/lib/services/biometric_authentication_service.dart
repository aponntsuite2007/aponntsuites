import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/services.dart';
import 'package:local_auth/local_auth.dart';
import 'package:camera/camera.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:pattern_lock/pattern_lock.dart';
import 'package:crypto/crypto.dart';
import 'package:image/image.dart' as img;
import 'multi_tenant_security_service.dart';

/// 🔐 Servicio de Autenticación Biométrica Unificado
/// Integra todos los métodos de autenticación biométrica con aislamiento por empresa
class BiometricAuthenticationService {
  static const String _faceTemplateKey = 'FACE_TEMPLATE';
  static const String _fingerprintTemplateKey = 'FINGERPRINT_TEMPLATE';
  static const String _patternKey = 'PATTERN_HASH';
  static const String _passwordKey = 'PASSWORD_HASH';

  final LocalAuthentication _localAuth = LocalAuthentication();
  final MultiTenantSecurityService _securityService;

  CameraController? _cameraController;
  MobileScannerController? _qrController;

  List<CameraDescription> _cameras = [];
  bool _isInitialized = false;

  BiometricAuthenticationService(this._securityService);

  /// 🚀 Inicializa todos los servicios biométricos
  Future<bool> initialize() async {
    try {
      print('🔐 [BIOMETRIC] Inicializando servicios de autenticación...');

      // Inicializar cámaras
      _cameras = await availableCameras();

      // Inicializar controlador QR
      _qrController = MobileScannerController();

      _isInitialized = true;
      print('✅ [BIOMETRIC] Servicios inicializados correctamente');

      return true;
    } catch (e) {
      print('❌ [BIOMETRIC] Error inicializando: $e');
      return false;
    }
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
      final bool isAuthenticated = await _localAuth.authenticate(
        localizedReason: 'Verificar identidad con huella dactilar',
        options: const AuthenticationOptions(
          biometricOnly: true,
          stickyAuth: true,
        ),
      );

      if (isAuthenticated) {
        print('✅ [FINGERPRINT] Autenticación exitosa para: $employeeId');
        return AuthResult.success('fingerprint', employeeId);
      } else {
        return AuthResult.failure('Huella no reconocida');
      }
    } catch (e) {
      print('❌ [FINGERPRINT] Error: $e');
      return AuthResult.failure('Error en autenticación por huella: $e');
    }
  }

  /// 👤 Autenticación facial con cámara
  Future<AuthResult> authenticateFace(String employeeId) async {
    try {
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
        return AuthResult.success('face', employeeId);
      } else {
        return AuthResult.failure('Rostro no reconocido');
      }
    } catch (e) {
      print('❌ [FACE] Error: $e');
      return AuthResult.failure('Error en autenticación facial: $e');
    } finally {
      await _cameraController?.dispose();
      _cameraController = null;
    }
  }

  /// 📱 Autenticación por código QR con token temporal
  Future<AuthResult> authenticateQR() async {
    try {
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
          return AuthResult.success('qr', employeeId);
        } else {
          return AuthResult.failure('Token QR inválido o expirado');
        }
      } else {
        return AuthResult.failure('QR no detectado');
      }
    } catch (e) {
      print('❌ [QR] Error: $e');
      return AuthResult.failure('Error en autenticación QR: $e');
    }
  }

  /// 🔢 Autenticación por patrón
  Future<AuthResult> authenticatePattern(String employeeId, List<int> inputPattern) async {
    try {
      // Convertir patrón a hash
      final patternHash = _hashPattern(inputPattern);

      // Comparar con patrón almacenado
      final storedPattern = await _securityService.getBiometricData(employeeId, 'pattern');

      if (storedPattern != null && storedPattern == patternHash) {
        print('✅ [PATTERN] Autenticación exitosa para: $employeeId');
        return AuthResult.success('pattern', employeeId);
      } else {
        return AuthResult.failure('Patrón incorrecto');
      }
    } catch (e) {
      print('❌ [PATTERN] Error: $e');
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
        return AuthResult.success('password', employeeId);
      } else {
        return AuthResult.failure('Contraseña incorrecta');
      }
    } catch (e) {
      print('❌ [PASSWORD] Error: $e');
      return AuthResult.failure('Error en autenticación por contraseña: $e');
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

  /// 🧹 Limpia recursos
  Future<void> dispose() async {
    await _cameraController?.dispose();
    await _qrController?.dispose();
  }
}

/// 📊 Capacidades biométricas disponibles
class BiometricCapabilities {
  bool hasLocalAuth = false;
  bool hasCamera = false;
  bool hasPattern = false;
  bool hasPassword = false;
  bool hasQR = false;
  List<BiometricType> availableBiometrics = [];

  @override
  String toString() {
    return 'BiometricCapabilities(localAuth: $hasLocalAuth, camera: $hasCamera, pattern: $hasPattern, password: $hasPassword, qr: $hasQR, types: $availableBiometrics)';
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