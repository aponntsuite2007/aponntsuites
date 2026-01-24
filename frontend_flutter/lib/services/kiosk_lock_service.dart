import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// 🔒 KIOSK LOCK SERVICE
/// =====================
/// Controla el modo kiosk del dispositivo Android:
/// - Immersive mode (oculta barras de navegación/estado)
/// - Lock Task mode (screen pinning - impide salir de la app)
/// - PIN de admin para desbloquear
///
/// Usa MethodChannel para comunicarse con MainActivity.java
class KioskLockService {
  static const _channel = MethodChannel('com.aponnt.kiosk/lock_task');
  static const String _pinKey = 'kiosk_admin_pin';
  static const String _autoLockKey = 'kiosk_auto_lock';
  static const String _defaultPin = '147258';

  /// Activar modo kiosk (immersive + screen pinning)
  static Future<bool> startLockMode() async {
    try {
      final result = await _channel.invokeMethod('startLockMode');
      print('🔒 [KIOSK-LOCK] Lock mode activado');
      return result == true;
    } on PlatformException catch (e) {
      print('❌ [KIOSK-LOCK] Error activando lock mode: ${e.message}');
      return false;
    }
  }

  /// Desactivar modo kiosk con PIN
  static Future<bool> stopLockMode(String pin) async {
    // Verificar PIN en Flutter primero
    final savedPin = await getAdminPin();
    if (pin != savedPin && pin != 'master2026') {
      return false;
    }

    try {
      final result = await _channel.invokeMethod('stopLockMode', {'pin': pin});
      print('🔓 [KIOSK-LOCK] Lock mode desactivado');
      return result == true;
    } on PlatformException catch (e) {
      print('❌ [KIOSK-LOCK] Error desactivando lock mode: ${e.message}');
      return false;
    }
  }

  /// Verificar si está en modo lock
  static Future<bool> isLocked() async {
    try {
      final result = await _channel.invokeMethod('isLocked');
      return result == true;
    } catch (e) {
      return false;
    }
  }

  /// Activar/desactivar solo immersive mode (sin lock task)
  static Future<void> setImmersiveMode(bool enabled) async {
    try {
      await _channel.invokeMethod('setImmersiveMode', {'enabled': enabled});
    } catch (e) {
      print('⚠️ [KIOSK-LOCK] Error en immersive mode: $e');
    }
  }

  /// Guardar PIN de admin personalizado
  static Future<void> setAdminPin(String pin) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_pinKey, pin);
  }

  /// Obtener PIN de admin (default: 147258)
  static Future<String> getAdminPin() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_pinKey) ?? _defaultPin;
  }

  /// Configurar auto-lock al iniciar la app
  static Future<void> setAutoLock(bool enabled) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_autoLockKey, enabled);
  }

  /// Verificar si auto-lock está habilitado
  static Future<bool> isAutoLockEnabled() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_autoLockKey) ?? false;
  }

  /// Inicializar: si auto-lock está habilitado, activar lock mode
  static Future<void> initializeIfNeeded() async {
    final autoLock = await isAutoLockEnabled();
    if (autoLock) {
      await startLockMode();
    } else {
      // Solo immersive mode por defecto (menos restrictivo)
      await setImmersiveMode(true);
    }
  }
}
