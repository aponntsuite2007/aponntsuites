import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import '../services/config_service.dart';

class AppConfig {
  static const String appName = 'Sistema de Asistencia';
  static const String appVersion = '1.0.0';
  static const String companyName = 'Mi Empresa';
  
  // API Configuration
  static const String baseUrl = 'http://localhost:3001'; // Para web y desarrollo
  // PRODUCCIÓN: URL de Render pre-configurada
  static const String baseUrlProd = 'https://aponntsuites.onrender.com'; // Producción Render
  static const String apiVersion = 'v1';
  static String get apiBaseUrl => '${getBaseUrl()}/api/$apiVersion';
  
  // WebSocket Configuration
  static String get websocketUrl => getBaseUrl();
  
  // App Settings
  static const bool enableBiometrics = true;
  static const bool enableGPS = true;
  static const bool enableNotifications = true;
  static const bool enableOfflineMode = true;
  
  // UI Settings
  static const double defaultPadding = 16.0;
  static const double defaultRadius = 8.0;
  static const int animationDuration = 300;
  
  // Biometric Settings
  static const int maxFingerprintAttempts = 3;
  static const int biometricTimeout = 30; // seconds
  
  // Location Settings
  static const double locationAccuracy = 10.0; // meters
  static const int locationTimeout = 30; // seconds
  
  // Cache Settings
  static const int cacheExpiration = 24; // hours
  static const int maxCacheSize = 100; // MB
  
  // Debug Settings
  static const bool debugMode = true;
  static const bool enableLogs = true;
  
  // Environment Detection
  static bool get isDebug => debugMode;
  static bool get isProduction => !debugMode;
  
  // Dynamic Base URL based on platform and environment
  static String getBaseUrl() {
    // Si es web, usar localhost
    if (kIsWeb) {
      return baseUrl;
    }

    // Si es móvil/tablet (Android/iOS), usar IP de red local
    try {
      if (Platform.isAndroid || Platform.isIOS) {
        return baseUrlProd; // 192.168.1.3:3000
      }

      // Si es desktop (Windows/Mac/Linux), usar localhost
      if (Platform.isWindows || Platform.isMacOS || Platform.isLinux) {
        return baseUrl; // localhost:3000
      }
    } catch (e) {
      print('Error detectando plataforma: $e');
    }

    // Fallback: usar IP de red local
    return baseUrlProd;
  }

  // NEW: Get dynamic base URL from configuration
  static Future<String> getDynamicBaseUrl() async {
    // Si es web, usar localhost
    if (kIsWeb) {
      return baseUrl;
    }

    // Para móvil, usar configuración dinámica
    try {
      if (Platform.isAndroid || Platform.isIOS) {
        return await ConfigService.getWebSocketUrl();
      }

      // Si es desktop, usar localhost
      if (Platform.isWindows || Platform.isMacOS || Platform.isLinux) {
        return baseUrl;
      }
    } catch (e) {
      print('Error obteniendo configuración dinámica: $e');
    }

    // Fallback: usar configuración o IP por defecto
    try {
      return await ConfigService.getWebSocketUrl();
    } catch (e) {
      return baseUrlProd;
    }
  }

  // NEW: Get dynamic API base URL
  static Future<String> getDynamicApiBaseUrl() async {
    try {
      return await ConfigService.getApiBaseUrl();
    } catch (e) {
      print('Error obteniendo API URL dinámica: $e');
      return apiBaseUrl; // Fallback to static
    }
  }
  
}

// API Endpoints
class ApiEndpoints {
  // Auth - UPDATED to match backend
  static const String login = '/auth/login';
  static const String biometricLogin = '/biometric/face/authenticate';
  static const String logout = '/auth/logout';
  static const String refresh = '/auth/refresh';
  static const String me = '/auth/me';
  
  // Facial Biometric - NEW endpoints
  static const String facialBiometricRegister = '/facial-biometric/register';
  static const String facialBiometricVerify = '/facial-biometric/verify';
  static const String facialBiometricStats = '/facial-biometric/stats';
  static const String facialBiometricUser = '/facial-biometric/user';
  
  // Location - NEW endpoints  
  static const String locationReport = '/location/report';
  static const String locationCurrent = '/location/current';
  static const String locationStats = '/location/stats';
  static const String locationHistory = '/location/history';
  
  // Attendance
  static const String checkin = '/attendance/checkin';
  static const String checkout = '/attendance/checkout';
  static const String attendance = '/attendance';
  static const String todayStatus = '/attendance/today/status';
  
  // Users
  static const String users = '/users';
  static const String uploadPhoto = '/users/{id}/upload-photo';
  
  // Config
  static const String config = '/config';
  static const String company = '/config/company';
  static const String biometric = '/config/biometric';
  
  // Messages
  static const String messages = '/messages';
  static const String unreadCount = '/messages/stats/unread-count';
  
  // Reports
  static const String attendanceReport = '/reports/attendance';
  static const String usersSummary = '/reports/users-summary';
}

// Storage Keys
class StorageKeys {
  static const String token = 'auth_token';
  static const String refreshToken = 'refresh_token';
  static const String user = 'user_data';
  static const String biometricEnabled = 'biometric_enabled';
  static const String darkMode = 'dark_mode';
  static const String language = 'language';
  static const String notifications = 'notifications_enabled';
  static const String offlineData = 'offline_data';
  static const String lastSync = 'last_sync';
}

// Error Messages
class ErrorMessages {
  static const String networkError = 'Error de conexión. Verifique su internet.';
  static const String serverError = 'Error del servidor. Intente más tarde.';
  static const String authError = 'Credenciales inválidas.';
  static const String biometricError = 'Error en autenticación biométrica.';
  static const String locationError = 'No se pudo obtener la ubicación.';
  static const String permissionError = 'Permisos requeridos no otorgados.';
  static const String timeoutError = 'Tiempo de espera agotado.';
}

// Success Messages
class SuccessMessages {
  static const String loginSuccess = 'Inicio de sesión exitoso.';
  static const String checkinSuccess = 'Entrada registrada correctamente.';
  static const String checkoutSuccess = 'Salida registrada correctamente.';
  static const String dataSync = 'Datos sincronizados correctamente.';
}