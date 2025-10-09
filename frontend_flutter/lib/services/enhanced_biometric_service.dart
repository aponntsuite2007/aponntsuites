import 'package:flutter/foundation.dart';
import 'package:local_auth/local_auth.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'package:crypto/crypto.dart';
import '../models/user.dart';

class EnhancedBiometricService {
  static final EnhancedBiometricService _instance = EnhancedBiometricService._internal();
  factory EnhancedBiometricService() => _instance;
  EnhancedBiometricService._internal();

  final LocalAuthentication _localAuth = LocalAuthentication();
  SharedPreferences? _prefs;
  
  // Configuraciones
  bool _biometricEnabled = false;
  bool _fingerprintEnabled = true;
  bool _faceIdEnabled = true;
  bool _irisEnabled = true;
  int _maxAttempts = 3;
  Duration _lockoutDuration = Duration(minutes: 5);

  bool get biometricEnabled => _biometricEnabled;
  bool get fingerprintEnabled => _fingerprintEnabled;
  bool get faceIdEnabled => _faceIdEnabled;
  bool get irisEnabled => _irisEnabled;

  Future<void> initialize() async {
    _prefs = await SharedPreferences.getInstance();
    _loadSettings();
  }

  /// Verificar si el dispositivo soporta biométricos
  Future<bool> isDeviceSupported() async {
    try {
      return await _localAuth.isDeviceSupported();
    } catch (e) {
      print('Error verificando soporte biométrico: $e');
      return false;
    }
  }

  /// Verificar si hay biométricos disponibles
  Future<bool> canCheckBiometrics() async {
    try {
      return await _localAuth.canCheckBiometrics;
    } catch (e) {
      print('Error verificando biométricos disponibles: $e');
      return false;
    }
  }

  /// Obtener tipos de biométricos disponibles
  Future<List<BiometricType>> getAvailableBiometrics() async {
    try {
      return await _localAuth.getAvailableBiometrics();
    } catch (e) {
      print('Error obteniendo biométricos disponibles: $e');
      return [];
    }
  }

  /// Autenticación biométrica simple
  Future<BiometricResult> authenticate({
    String reason = 'Verificar identidad para acceder',
    bool fallbackToCredentials = true,
  }) async {
    if (!_biometricEnabled) {
      return BiometricResult(
        success: false,
        error: BiometricError.disabled,
        message: 'Autenticación biométrica deshabilitada',
      );
    }

    // Verificar si está bloqueado
    if (await _isLockedOut()) {
      return BiometricResult(
        success: false,
        error: BiometricError.lockedOut,
        message: 'Demasiados intentos fallidos. Intenta más tarde.',
      );
    }

    try {
      // Verificar disponibilidad
      final isSupported = await isDeviceSupported();
      if (!isSupported) {
        return BiometricResult(
          success: false,
          error: BiometricError.notSupported,
          message: 'Este dispositivo no soporta autenticación biométrica',
        );
      }

      final canCheck = await canCheckBiometrics();
      if (!canCheck) {
        return BiometricResult(
          success: false,
          error: BiometricError.notEnrolled,
          message: 'No hay biométricos configurados en este dispositivo',
        );
      }

      // Obtener biométricos disponibles
      final availableBiometrics = await getAvailableBiometrics();
      if (availableBiometrics.isEmpty) {
        return BiometricResult(
          success: false,
          error: BiometricError.notEnrolled,
          message: 'No hay biométricos configurados',
        );
      }

      // Filtrar biométricos según configuración
      final allowedBiometrics = _getAllowedBiometrics(availableBiometrics);
      if (allowedBiometrics.isEmpty) {
        return BiometricResult(
          success: false,
          error: BiometricError.notSupported,
          message: 'Los biométricos disponibles están deshabilitados',
        );
      }

      // Realizar autenticación
      final authenticated = await _localAuth.authenticate(
        localizedReason: reason,
        options: AuthenticationOptions(
          biometricOnly: !fallbackToCredentials,
          stickyAuth: true,
        ),
      );

      if (authenticated) {
        await _resetAttempts();
        return BiometricResult(
          success: true,
          biometricType: allowedBiometrics.first,
          message: 'Autenticación exitosa',
        );
      } else {
        await _incrementAttempts();
        return BiometricResult(
          success: false,
          error: BiometricError.userCancel,
          message: 'Autenticación cancelada',
        );
      }

    } catch (e) {
      await _incrementAttempts();
      
      BiometricError error = BiometricError.unknown;
      String message = 'Error desconocido';

      if (e.toString().contains('UserCancel')) {
        error = BiometricError.userCancel;
        message = 'Autenticación cancelada por el usuario';
      } else if (e.toString().contains('NotEnrolled')) {
        error = BiometricError.notEnrolled;
        message = 'No hay biométricos configurados';
      } else if (e.toString().contains('NotAvailable')) {
        error = BiometricError.notSupported;
        message = 'Biométricos no disponibles';
      } else if (e.toString().contains('TooManyAttempts')) {
        error = BiometricError.tooManyAttempts;
        message = 'Demasiados intentos fallidos';
      }

      return BiometricResult(
        success: false,
        error: error,
        message: message,
      );
    }
  }

  /// Autenticación biométrica para registro de asistencia
  Future<BiometricResult> authenticateForAttendance({
    required String userId,
    required String action, // 'checkin' o 'checkout'
  }) async {
    final result = await authenticate(
      reason: action == 'checkin' 
          ? 'Verificar identidad para registrar entrada'
          : 'Verificar identidad para registrar salida',
    );

    if (result.success) {
      // Generar datos biométricos para la asistencia
      final biometricData = await _generateBiometricData(userId, action);
      return result.copyWith(biometricData: biometricData);
    }

    return result;
  }

  /// Configurar biométricos para un usuario
  Future<BiometricResult> enrollUser(User user) async {
    try {
      final result = await authenticate(
        reason: 'Verificar identidad para configurar biométricos',
      );

      if (result.success) {
        // Guardar configuración del usuario
        await _saveUserBiometricConfig(user.user_id, {
          'enrolled': true,
          'enrolledAt': DateTime.now().toIso8601String(),
          'biometricTypes': (await getAvailableBiometrics()).map((e) => e.toString()).toList(),
        });

        return BiometricResult(
          success: true,
          message: 'Biométricos configurados exitosamente',
        );
      }

      return result;
    } catch (e) {
      return BiometricResult(
        success: false,
        error: BiometricError.unknown,
        message: 'Error configurando biométricos: $e',
      );
    }
  }

  /// Verificar si un usuario tiene biométricos configurados
  Future<bool> isUserEnrolled(String userId) async {
    final config = await _getUserBiometricConfig(userId);
    return config['enrolled'] ?? false;
  }

  /// Deshabilitar biométricos para un usuario
  Future<void> unenrollUser(String userId) async {
    await _removeUserBiometricConfig(userId);
  }

  // Configuraciones
  Future<void> setBiometricEnabled(bool enabled) async {
    _biometricEnabled = enabled;
    await _prefs?.setBool('biometric_enabled', enabled);
  }

  Future<void> setFingerprintEnabled(bool enabled) async {
    _fingerprintEnabled = enabled;
    await _prefs?.setBool('fingerprint_enabled', enabled);
  }

  Future<void> setFaceIdEnabled(bool enabled) async {
    _faceIdEnabled = enabled;
    await _prefs?.setBool('faceid_enabled', enabled);
  }

  Future<void> setIrisEnabled(bool enabled) async {
    _irisEnabled = enabled;
    await _prefs?.setBool('iris_enabled', enabled);
  }

  Future<void> setMaxAttempts(int attempts) async {
    _maxAttempts = attempts;
    await _prefs?.setInt('max_attempts', attempts);
  }

  Future<void> setLockoutDuration(Duration duration) async {
    _lockoutDuration = duration;
    await _prefs?.setInt('lockout_duration_minutes', duration.inMinutes);
  }

  // Métodos privados
  void _loadSettings() {
    _biometricEnabled = _prefs?.getBool('biometric_enabled') ?? false;
    _fingerprintEnabled = _prefs?.getBool('fingerprint_enabled') ?? true;
    _faceIdEnabled = _prefs?.getBool('faceid_enabled') ?? true;
    _irisEnabled = _prefs?.getBool('iris_enabled') ?? true;
    _maxAttempts = _prefs?.getInt('max_attempts') ?? 3;
    final lockoutMinutes = _prefs?.getInt('lockout_duration_minutes') ?? 5;
    _lockoutDuration = Duration(minutes: lockoutMinutes);
  }

  List<BiometricType> _getAllowedBiometrics(List<BiometricType> available) {
    return available.where((type) {
      switch (type) {
        case BiometricType.fingerprint:
          return _fingerprintEnabled;
        case BiometricType.face:
          return _faceIdEnabled;
        case BiometricType.iris:
          return _irisEnabled;
        case BiometricType.weak:
          return false; // No permitir biométricos débiles
        case BiometricType.strong:
          return true; // Permitir biométricos fuertes
      }
    }).toList();
  }

  Future<bool> _isLockedOut() async {
    final attempts = _prefs?.getInt('failed_attempts') ?? 0;
    if (attempts >= _maxAttempts) {
      final lastFailure = _prefs?.getInt('last_failure_time');
      if (lastFailure != null) {
        final lastFailureTime = DateTime.fromMillisecondsSinceEpoch(lastFailure);
        final lockoutEnd = lastFailureTime.add(_lockoutDuration);
        return DateTime.now().isBefore(lockoutEnd);
      }
    }
    return false;
  }

  Future<void> _incrementAttempts() async {
    final attempts = (_prefs?.getInt('failed_attempts') ?? 0) + 1;
    await _prefs?.setInt('failed_attempts', attempts);
    await _prefs?.setInt('last_failure_time', DateTime.now().millisecondsSinceEpoch);
  }

  Future<void> _resetAttempts() async {
    await _prefs?.remove('failed_attempts');
    await _prefs?.remove('last_failure_time');
  }

  Future<Map<String, dynamic>> _generateBiometricData(String userId, String action) async {
    // Generar hash único basado en el usuario, acción y timestamp
    final timestamp = DateTime.now().toIso8601String();
    final dataToHash = '$userId-$action-$timestamp';
    final bytes = utf8.encode(dataToHash);
    final digest = sha256.convert(bytes);

    return {
      'hash': digest.toString(),
      'timestamp': timestamp,
      'action': action,
      'userId': userId,
    };
  }

  Future<void> _saveUserBiometricConfig(String userId, Map<String, dynamic> config) async {
    await _prefs?.setString('biometric_config_$userId', json.encode(config));
  }

  Future<Map<String, dynamic>> _getUserBiometricConfig(String userId) async {
    final configString = _prefs?.getString('biometric_config_$userId');
    if (configString != null) {
      return json.decode(configString);
    }
    return {};
  }

  Future<void> _removeUserBiometricConfig(String userId) async {
    await _prefs?.remove('biometric_config_$userId');
  }
}

class BiometricResult {
  final bool success;
  final BiometricError? error;
  final String message;
  final BiometricType? biometricType;
  final Map<String, dynamic>? biometricData;

  BiometricResult({
    required this.success,
    this.error,
    required this.message,
    this.biometricType,
    this.biometricData,
  });

  BiometricResult copyWith({
    bool? success,
    BiometricError? error,
    String? message,
    BiometricType? biometricType,
    Map<String, dynamic>? biometricData,
  }) {
    return BiometricResult(
      success: success ?? this.success,
      error: error ?? this.error,
      message: message ?? this.message,
      biometricType: biometricType ?? this.biometricType,
      biometricData: biometricData ?? this.biometricData,
    );
  }
}

enum BiometricError {
  notSupported,
  notEnrolled,
  userCancel,
  tooManyAttempts,
  lockedOut,
  disabled,
  unknown,
}