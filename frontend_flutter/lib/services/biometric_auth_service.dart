import 'package:flutter/services.dart';
import 'dart:async';
import 'dart:io';

class BiometricAuthService {
  static const MethodChannel _channel = MethodChannel('biometric_auth');
  
  /// Verificar si la autenticación biométrica está disponible
  static Future<bool> isAvailable() async {
    try {
      if (Platform.isAndroid || Platform.isIOS) {
        final bool isAvailable = await _channel.invokeMethod('isAvailable');
        return isAvailable;
      }
      return false;
    } catch (e) {
      print('Error checking biometric availability: $e');
      return false;
    }
  }

  /// Obtener tipos de biometría disponibles
  static Future<List<String>> getAvailableBiometrics() async {
    try {
      if (Platform.isAndroid || Platform.isIOS) {
        final List<dynamic> types = await _channel.invokeMethod('getAvailableBiometrics');
        return types.cast<String>();
      }
      return [];
    } catch (e) {
      print('Error getting available biometrics: $e');
      return [];
    }
  }

  /// Autenticar con biometría
  static Future<BiometricAuthResult> authenticate({
    String reason = 'Verifica tu identidad para marcar asistencia',
    bool useErrorDialogs = true,
    bool stickyAuth = false,
  }) async {
    try {
      // Verificar si está disponible primero
      if (!await isAvailable()) {
        return BiometricAuthResult(
          success: false,
          error: 'Autenticación biométrica no disponible',
          errorType: BiometricErrorType.notAvailable,
        );
      }

      // En web/desktop, simular por ahora
      if (!Platform.isAndroid && !Platform.isIOS) {
        return _simulateBiometricAuth();
      }

      final Map<String, dynamic> args = {
        'reason': reason,
        'useErrorDialogs': useErrorDialogs,
        'stickyAuth': stickyAuth,
      };

      final bool result = await _channel.invokeMethod('authenticate', args);
      
      return BiometricAuthResult(
        success: result,
        error: result ? null : 'Autenticación fallida',
        errorType: result ? null : BiometricErrorType.authFailed,
      );

    } on PlatformException catch (e) {
      return BiometricAuthResult(
        success: false,
        error: e.message ?? 'Error desconocido',
        errorType: _mapErrorType(e.code),
      );
    } catch (e) {
      return BiometricAuthResult(
        success: false,
        error: e.toString(),
        errorType: BiometricErrorType.unknown,
      );
    }
  }

  /// Cancelar autenticación en progreso
  static Future<void> cancelAuthentication() async {
    try {
      await _channel.invokeMethod('cancelAuthentication');
    } catch (e) {
      print('Error canceling authentication: $e');
    }
  }

  /// Simular autenticación biométrica para testing/web
  static Future<BiometricAuthResult> _simulateBiometricAuth() async {
    await Future.delayed(Duration(seconds: 2));
    
    // Simular éxito en 80% de los casos
    final bool success = DateTime.now().millisecond % 10 < 8;
    
    return BiometricAuthResult(
      success: success,
      error: success ? null : 'Huella no reconocida',
      errorType: success ? null : BiometricErrorType.authFailed,
    );
  }

  /// Mapear códigos de error de la plataforma
  static BiometricErrorType _mapErrorType(String code) {
    switch (code) {
      case 'NotAvailable':
        return BiometricErrorType.notAvailable;
      case 'NotEnrolled':
        return BiometricErrorType.notEnrolled;
      case 'PasscodeNotSet':
        return BiometricErrorType.passcodeNotSet;
      case 'AuthFailed':
        return BiometricErrorType.authFailed;
      case 'UserCancel':
        return BiometricErrorType.userCancel;
      case 'UserFallback':
        return BiometricErrorType.userFallback;
      case 'SystemCancel':
        return BiometricErrorType.systemCancel;
      case 'InvalidContext':
        return BiometricErrorType.invalidContext;
      case 'TouchIDLockout':
      case 'FingerprintLockout':
        return BiometricErrorType.lockout;
      default:
        return BiometricErrorType.unknown;
    }
  }
}

/// Resultado de autenticación biométrica
class BiometricAuthResult {
  final bool success;
  final String? error;
  final BiometricErrorType? errorType;
  final String? userId; // ID del usuario autenticado (si se puede obtener)

  BiometricAuthResult({
    required this.success,
    this.error,
    this.errorType,
    this.userId,
  });

  @override
  String toString() {
    return 'BiometricAuthResult{success: $success, error: $error, errorType: $errorType}';
  }
}

/// Tipos de error biométrico
enum BiometricErrorType {
  notAvailable,     // Biometría no disponible en el dispositivo
  notEnrolled,      // No hay biometría registrada
  passcodeNotSet,   // No hay PIN/patrón configurado
  authFailed,       // Autenticación fallida
  userCancel,       // Usuario canceló
  userFallback,     // Usuario eligió método alternativo
  systemCancel,     // Sistema canceló
  invalidContext,   // Contexto inválido
  lockout,          // Demasiados intentos fallidos
  unknown,          // Error desconocido
}

/// Extensiones para obtener mensajes legibles
extension BiometricErrorTypeExtension on BiometricErrorType {
  String get message {
    switch (this) {
      case BiometricErrorType.notAvailable:
        return 'La autenticación biométrica no está disponible en este dispositivo';
      case BiometricErrorType.notEnrolled:
        return 'No hay huellas o rostro registrados en el dispositivo';
      case BiometricErrorType.passcodeNotSet:
        return 'No hay PIN o patrón configurado en el dispositivo';
      case BiometricErrorType.authFailed:
        return 'La autenticación biométrica falló. Inténtalo de nuevo';
      case BiometricErrorType.userCancel:
        return 'Autenticación cancelada por el usuario';
      case BiometricErrorType.userFallback:
        return 'El usuario eligió usar método alternativo';
      case BiometricErrorType.systemCancel:
        return 'Autenticación cancelada por el sistema';
      case BiometricErrorType.invalidContext:
        return 'Contexto de autenticación inválido';
      case BiometricErrorType.lockout:
        return 'Demasiados intentos fallidos. Espera o usa PIN';
      case BiometricErrorType.unknown:
        return 'Error desconocido en la autenticación biométrica';
    }
  }

  bool get isRetryable {
    switch (this) {
      case BiometricErrorType.authFailed:
      case BiometricErrorType.userCancel:
        return true;
      default:
        return false;
    }
  }
}

/// Servicio para integración con QR
class QRAuthService {
  static const MethodChannel _channel = MethodChannel('qr_auth');

  /// Escanear código QR
  static Future<QRScanResult> scanQR() async {
    try {
      final String result = await _channel.invokeMethod('scanQR');
      return QRScanResult(
        success: true,
        data: result,
      );
    } on PlatformException catch (e) {
      return QRScanResult(
        success: false,
        error: e.message,
      );
    } catch (e) {
      return QRScanResult(
        success: false,
        error: e.toString(),
      );
    }
  }

  /// Generar código QR para usuario
  static Future<String?> generateUserQR(String userId) async {
    try {
      final String qrData = await _channel.invokeMethod('generateQR', {'userId': userId});
      return qrData;
    } catch (e) {
      print('Error generating QR: $e');
      return null;
    }
  }
}

/// Resultado de escaneo QR
class QRScanResult {
  final bool success;
  final String? data;
  final String? error;

  QRScanResult({
    required this.success,
    this.data,
    this.error,
  });
}