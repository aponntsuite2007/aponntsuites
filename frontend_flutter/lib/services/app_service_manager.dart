import 'package:flutter/foundation.dart';
import 'multi_tenant_security_service.dart';
import 'biometric_authentication_service.dart';
import 'realtime_notification_service.dart';
import 'api_service.dart';

/// 🚀 Gestor Principal de Servicios de la Aplicación
/// Coordina todos los servicios de la aplicación para funcionalidad completa
class AppServiceManager {
  static AppServiceManager? _instance;
  static AppServiceManager get instance => _instance ??= AppServiceManager._();

  AppServiceManager._();

  // Servicios principales
  late final MultiTenantSecurityService _securityService;
  late final BiometricAuthenticationService _biometricService;
  late final RealtimeNotificationService _notificationService;
  late final ApiService _apiService;

  bool _isInitialized = false;

  // Getters para acceder a los servicios
  MultiTenantSecurityService get security => _securityService;
  BiometricAuthenticationService get biometric => _biometricService;
  RealtimeNotificationService get notifications => _notificationService;
  ApiService get api => _apiService;

  /// 🚀 Inicializa todos los servicios de la aplicación
  Future<bool> initialize({
    String? serverUrl,
  }) async {
    try {
      print('🚀 [APP-MANAGER] Inicializando gestor de servicios...');

      // 1. Inicializar servicio de seguridad multi-tenant (base)
      _securityService = MultiTenantSecurityService();
      print('🛡️ [APP-MANAGER] Servicio de seguridad inicializado');

      // 2. Inicializar servicio de API con contexto de seguridad
      _apiService = ApiService(_securityService);
      await _apiService.initialize();
      print('🌐 [APP-MANAGER] Servicio de API inicializado');

      // 3. Inicializar servicio biométrico
      _biometricService = BiometricAuthenticationService(_securityService);
      await _biometricService.initialize();
      print('🔐 [APP-MANAGER] Servicio biométrico inicializado');

      // 4. Inicializar servicio de notificaciones
      _notificationService = RealtimeNotificationService(_securityService);
      await _notificationService.initialize(serverUrl: serverUrl);
      print('🔔 [APP-MANAGER] Servicio de notificaciones inicializado');

      // 5. Configurar manejadores de eventos entre servicios
      await _setupServiceIntegrations();

      _isInitialized = true;
      print('✅ [APP-MANAGER] Todos los servicios inicializados correctamente');

      return true;
    } catch (e) {
      print('❌ [APP-MANAGER] Error inicializando servicios: $e');
      return false;
    }
  }

  /// 🔗 Configura integraciones entre servicios
  Future<void> _setupServiceIntegrations() async {
    try {
      print('🔗 [APP-MANAGER] Configurando integraciones entre servicios...');

      // Integración: Notificaciones de autenticación biométrica
      _notificationService.registerMessageHandler('biometric_auth_request', (data) async {
        print('🔐 [INTEGRATION] Solicitud de autenticación biométrica recibida');
        // Aquí se podría mostrar una pantalla de autenticación automáticamente
      });

      // Integración: Notificaciones de asistencia
      _notificationService.registerMessageHandler('attendance_reminder', (data) async {
        print('⏰ [INTEGRATION] Recordatorio de asistencia recibido');
      });

      // Integración: Notificaciones de empresa
      _notificationService.registerMessageHandler('company_announcement', (data) async {
        print('📢 [INTEGRATION] Anuncio de empresa recibido: ${data['title']}');
      });

      print('✅ [INTEGRATION] Integraciones configuradas correctamente');
    } catch (e) {
      print('❌ [INTEGRATION] Error configurando integraciones: $e');
    }
  }

  /// 🔐 Autentica usuario con múltiples métodos
  Future<AuthenticationResult> authenticateUser({
    String? username,
    String? password,
    String? companySlug,
    String? biometricType,
    String? employeeId,
  }) async {
    try {
      print('🔐 [AUTH] Iniciando proceso de autenticación...');

      // Intentar autenticación tradicional primero
      if (username != null && password != null) {
        final response = await _apiService.login(username, password, companySlug: companySlug);

        if (response.isSuccess) {
          print('✅ [AUTH] Autenticación tradicional exitosa');
          return AuthenticationResult.success('traditional', response.data);
        }
      }

      // Si falla o no se proporciona, intentar autenticación biométrica
      if (biometricType != null && employeeId != null) {
        print('🔐 [AUTH] Intentando autenticación biométrica: $biometricType');

        AuthResult? biometricResult;

        switch (biometricType.toLowerCase()) {
          case 'fingerprint':
            biometricResult = await _biometricService.authenticateFingerprint(employeeId);
            break;
          case 'face':
            biometricResult = await _biometricService.authenticateFace(employeeId);
            break;
          case 'qr':
            biometricResult = await _biometricService.authenticateQR();
            break;
          case 'pattern':
            // Para patrón necesitaríamos el patrón específico
            print('⚠️ [AUTH] Autenticación por patrón requiere entrada específica');
            break;
          case 'password':
            // Para contraseña necesitaríamos la contraseña específica
            print('⚠️ [AUTH] Autenticación por contraseña requiere entrada específica');
            break;
          default:
            print('❌ [AUTH] Tipo biométrico no soportado: $biometricType');
        }

        if (biometricResult?.success == true) {
          print('✅ [AUTH] Autenticación biométrica exitosa');
          return AuthenticationResult.success(biometricType, {
            'biometric_auth': true,
            'employee_id': biometricResult!.employeeId,
            'method': biometricType,
          });
        }
      }

      print('❌ [AUTH] Falló la autenticación');
      return AuthenticationResult.failure('Autenticación fallida');
    } catch (e) {
      print('❌ [AUTH] Error en proceso de autenticación: $e');
      return AuthenticationResult.failure('Error en autenticación: $e');
    }
  }

  /// 📊 Registra asistencia con múltiples validaciones
  Future<AttendanceResult> recordAttendance({
    required String type, // 'check_in' or 'check_out'
    required double latitude,
    required double longitude,
    String? biometricType,
    Map<String, dynamic>? biometricData,
  }) async {
    try {
      print('📊 [ATTENDANCE] Registrando asistencia tipo: $type');

      // Obtener ID de empleado del contexto
      final employeeId = _apiService._employeeId;
      if (employeeId == null) {
        return AttendanceResult.failure('No hay sesión de empleado activa');
      }

      // Registrar en la API
      final response = await _apiService.recordAttendance(
        employeeId: employeeId,
        type: type,
        latitude: latitude,
        longitude: longitude,
        biometricType: biometricType,
        biometricData: biometricData,
      );

      if (response.isSuccess) {
        print('✅ [ATTENDANCE] Asistencia registrada exitosamente');

        // Enviar notificación a la empresa
        await _notificationService.sendNotificationToCompany(
          'attendance_recorded',
          {
            'employee_id': employeeId,
            'type': type,
            'timestamp': DateTime.now().toIso8601String(),
            'location': {'latitude': latitude, 'longitude': longitude},
            'biometric_type': biometricType,
          },
        );

        return AttendanceResult.success(response.data);
      } else {
        print('❌ [ATTENDANCE] Error registrando asistencia: ${response.error}');
        return AttendanceResult.failure(response.error ?? 'Error desconocido');
      }
    } catch (e) {
      print('❌ [ATTENDANCE] Error en registro de asistencia: $e');
      return AttendanceResult.failure('Error: $e');
    }
  }

  /// 🧹 Limpia todos los servicios
  Future<void> dispose() async {
    try {
      print('🧹 [APP-MANAGER] Limpiando servicios...');

      await _biometricService.dispose();
      await _notificationService.dispose();

      _isInitialized = false;
      print('✅ [APP-MANAGER] Servicios limpiados correctamente');
    } catch (e) {
      print('❌ [APP-MANAGER] Error limpiando servicios: $e');
    }
  }

  /// 📊 Estado general del sistema
  AppManagerStatus get status => AppManagerStatus(
    isInitialized: _isInitialized,
    hasCompanyContext: _securityService.hasTenantContext,
    currentCompanyId: _securityService.currentTenantId,
    isAuthenticated: _apiService._token != null,
    servicesStatus: {
      'security': _securityService.hasTenantContext,
      'biometric': _biometricService._isInitialized,
      'notifications': _notificationService.status.isInitialized,
      'api': _apiService._token != null,
    },
  );
}

/// 🔐 Resultado de autenticación
class AuthenticationResult {
  final bool success;
  final String? method;
  final Map<String, dynamic>? data;
  final String? error;

  AuthenticationResult._(this.success, this.method, this.data, this.error);

  factory AuthenticationResult.success(String method, Map<String, dynamic>? data) {
    return AuthenticationResult._(true, method, data, null);
  }

  factory AuthenticationResult.failure(String error) {
    return AuthenticationResult._(false, null, null, error);
  }
}

/// 📊 Resultado de registro de asistencia
class AttendanceResult {
  final bool success;
  final Map<String, dynamic>? data;
  final String? error;

  AttendanceResult._(this.success, this.data, this.error);

  factory AttendanceResult.success(Map<String, dynamic>? data) {
    return AttendanceResult._(true, data, null);
  }

  factory AttendanceResult.failure(String error) {
    return AttendanceResult._(false, null, error);
  }
}

/// 📊 Estado del gestor de aplicación
class AppManagerStatus {
  final bool isInitialized;
  final bool hasCompanyContext;
  final String? currentCompanyId;
  final bool isAuthenticated;
  final Map<String, bool> servicesStatus;

  AppManagerStatus({
    required this.isInitialized,
    required this.hasCompanyContext,
    required this.currentCompanyId,
    required this.isAuthenticated,
    required this.servicesStatus,
  });

  @override
  String toString() {
    return 'AppManagerStatus(initialized: $isInitialized, company: $currentCompanyId, authenticated: $isAuthenticated, services: $servicesStatus)';
  }
}