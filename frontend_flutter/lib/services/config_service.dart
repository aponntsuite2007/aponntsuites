import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

/// ConfigService - Servicio de Configuración del Kiosko
///
/// URL DEL SERVIDOR HARDCODEADA - No se pide al usuario
/// Solo se configura: Empresa, Kiosko, GPS
class ConfigService {
  // =====================================================
  // 🔒 URL HARDCODEADA - DOMINIO PRINCIPAL
  // =====================================================
  // www.aponnt.com apunta a aponntsuites.onrender.com
  // Usamos el dominio propio para mayor profesionalismo
  static const String BACKEND_URL = 'https://www.aponnt.com';
  static const String API_BASE = '$BACKEND_URL/api/v1';

  // Claves de SharedPreferences
  static const String _companyIdKey = 'kiosk_company_id';
  static const String _companyNameKey = 'kiosk_company_name';
  static const String _companySlugKey = 'kiosk_company_slug';
  static const String _kioskIdKey = 'kiosk_id';
  static const String _kioskNameKey = 'kiosk_name';
  static const String _kioskLocationKey = 'kiosk_location';
  static const String _gpsLatKey = 'kiosk_gps_lat';
  static const String _gpsLngKey = 'kiosk_gps_lng';
  static const String _isKioskConfiguredKey = 'kiosk_is_configured';
  static const String _adminTokenKey = 'kiosk_admin_token';

  // Legacy keys (para compatibilidad)
  static const String _baseUrlKey = 'config_baseUrl';
  static const String _portKey = 'config_port';
  static const String _isConfiguredKey = 'config_is_configured';

  // =====================================================
  // MÉTODOS DE CONFIGURACIÓN DEL KIOSKO
  // =====================================================

  /// Verificar si el kiosko está configurado (empresa + kiosko seleccionados)
  static Future<bool> isKioskConfigured() async {
    final prefs = await SharedPreferences.getInstance();
    final hasCompany = prefs.getString(_companyIdKey) != null;
    final hasKiosk = prefs.getString(_kioskIdKey) != null;
    return hasCompany && hasKiosk;
  }

  /// Guardar configuración del kiosko
  static Future<void> saveKioskConfig({
    required String companyId,
    required String companyName,
    required String companySlug,
    required String kioskId,
    required String kioskName,
    String? kioskLocation,
    double? gpsLat,
    double? gpsLng,
  }) async {
    final prefs = await SharedPreferences.getInstance();

    await prefs.setString(_companyIdKey, companyId);
    await prefs.setString(_companyNameKey, companyName);
    await prefs.setString(_companySlugKey, companySlug);
    await prefs.setString(_kioskIdKey, kioskId);
    await prefs.setString(_kioskNameKey, kioskName);

    if (kioskLocation != null) {
      await prefs.setString(_kioskLocationKey, kioskLocation);
    }
    if (gpsLat != null) {
      await prefs.setDouble(_gpsLatKey, gpsLat);
    }
    if (gpsLng != null) {
      await prefs.setDouble(_gpsLngKey, gpsLng);
    }

    await prefs.setBool(_isKioskConfiguredKey, true);

    // Legacy compatibility
    await prefs.setString(_companyIdKey.replaceFirst('kiosk_', 'config_'), companyId);
    await prefs.setBool(_isConfiguredKey, true);

    print('✅ [CONFIG] Kiosko configurado: $kioskName (Empresa: $companyName)');
  }

  /// Obtener configuración actual del kiosko
  static Future<Map<String, dynamic>> getKioskConfig() async {
    final prefs = await SharedPreferences.getInstance();
    return {
      'companyId': prefs.getString(_companyIdKey),
      'companyName': prefs.getString(_companyNameKey),
      'companySlug': prefs.getString(_companySlugKey),
      'kioskId': prefs.getString(_kioskIdKey),
      'kioskName': prefs.getString(_kioskNameKey),
      'kioskLocation': prefs.getString(_kioskLocationKey),
      'gpsLat': prefs.getDouble(_gpsLatKey),
      'gpsLng': prefs.getDouble(_gpsLngKey),
      'isConfigured': prefs.getBool(_isKioskConfiguredKey) ?? false,
    };
  }

  /// Guardar token de admin (para edición de configuración)
  static Future<void> saveAdminToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_adminTokenKey, token);
  }

  /// Obtener token de admin
  static Future<String?> getAdminToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_adminTokenKey);
  }

  /// Limpiar token de admin
  static Future<void> clearAdminToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_adminTokenKey);
  }

  /// Resetear toda la configuración del kiosko
  static Future<void> resetKioskConfig() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_companyIdKey);
    await prefs.remove(_companyNameKey);
    await prefs.remove(_companySlugKey);
    await prefs.remove(_kioskIdKey);
    await prefs.remove(_kioskNameKey);
    await prefs.remove(_kioskLocationKey);
    await prefs.remove(_gpsLatKey);
    await prefs.remove(_gpsLngKey);
    await prefs.remove(_isKioskConfiguredKey);
    await prefs.remove(_adminTokenKey);

    // Legacy
    await prefs.remove(_baseUrlKey);
    await prefs.remove(_portKey);
    await prefs.remove(_isConfiguredKey);

    print('🗑️ [CONFIG] Configuración del kiosko reseteada');
  }

  // =====================================================
  // MÉTODOS DE API - HARDCODEADOS A RENDER
  // =====================================================

  /// URL base del servidor (HARDCODEADA)
  static String getServerUrl() => BACKEND_URL;

  /// URL base de la API (HARDCODEADA)
  static String getApiBaseUrl() => API_BASE;

  /// URL del WebSocket (HARDCODEADA)
  static String getWebSocketUrl() => BACKEND_URL;

  /// Obtener lista de empresas disponibles
  static Future<List<Map<String, dynamic>>> getAvailableCompanies() async {
    try {
      final url = '$API_BASE/companies/public-list';
      print('📡 [CONFIG] Obteniendo empresas desde: $url');

      final response = await http.get(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
      ).timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final companies = List<Map<String, dynamic>>.from(data['companies'] ?? data['data'] ?? []);
        print('✅ [CONFIG] ${companies.length} empresas encontradas');
        return companies;
      } else {
        print('❌ [CONFIG] Error ${response.statusCode}: ${response.body}');
        return [];
      }
    } catch (e) {
      print('❌ [CONFIG] Error obteniendo empresas: $e');
      return [];
    }
  }

  /// Obtener kioscos disponibles para una empresa
  static Future<List<Map<String, dynamic>>> getAvailableKiosks(String companyId) async {
    try {
      final url = '$API_BASE/kiosks/available?company_id=$companyId';
      print('📡 [CONFIG] Obteniendo kioscos desde: $url');

      final response = await http.get(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
      ).timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final kiosks = List<Map<String, dynamic>>.from(data['kiosks'] ?? []);
        print('✅ [CONFIG] ${kiosks.length} kioscos encontrados');
        return kiosks;
      } else {
        print('❌ [CONFIG] Error ${response.statusCode}: ${response.body}');
        return [];
      }
    } catch (e) {
      print('❌ [CONFIG] Error obteniendo kioscos: $e');
      return [];
    }
  }

  /// Probar conexión con el servidor
  static Future<bool> testConnection() async {
    try {
      final url = '$API_BASE/health';
      print('🔍 [CONFIG] Probando conexión: $url');

      final response = await http.get(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
      ).timeout(const Duration(seconds: 10));

      final success = response.statusCode == 200;
      print(success ? '✅ [CONFIG] Conexión exitosa' : '❌ [CONFIG] Error de conexión');
      return success;
    } catch (e) {
      print('❌ [CONFIG] Error probando conexión: $e');
      return false;
    }
  }

  /// Validar credenciales de administrador
  static Future<Map<String, dynamic>?> validateAdminCredentials({
    required String companyId,
    required String username,
    required String password,
  }) async {
    try {
      final url = '$API_BASE/auth/login';
      print('🔐 [CONFIG] Validando admin para empresa $companyId');

      final response = await http.post(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'email': username,
          'password': password,
          'company_id': companyId,
        }),
      ).timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final user = data['user'] ?? data['data'];
        final role = user?['role'] ?? user?['roleName'] ?? '';

        // Verificar que sea admin
        if (role.toString().toLowerCase().contains('admin')) {
          print('✅ [CONFIG] Admin validado: ${user?['email']}');
          return {
            'success': true,
            'token': data['token'],
            'user': user,
          };
        } else {
          print('❌ [CONFIG] Usuario no es administrador');
          return {'success': false, 'error': 'Se requiere rol de administrador'};
        }
      } else {
        final error = json.decode(response.body);
        print('❌ [CONFIG] Error de login: ${error['message'] ?? error['error']}');
        return {'success': false, 'error': error['message'] ?? 'Credenciales inválidas'};
      }
    } catch (e) {
      print('❌ [CONFIG] Error validando admin: $e');
      return {'success': false, 'error': 'Error de conexión'};
    }
  }

  /// Registrar activación del kiosko en el backend
  static Future<bool> registerKioskActivation({
    required String kioskId,
    required String companyId,
    required String deviceId,
    double? gpsLat,
    double? gpsLng,
  }) async {
    try {
      final url = '$API_BASE/kiosks/$kioskId/activate';
      print('📱 [CONFIG] Registrando activación del kiosko $kioskId');

      final response = await http.post(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'device_id': deviceId,
          'company_id': companyId,
          'gps_lat': gpsLat,
          'gps_lng': gpsLng,
          'activated_at': DateTime.now().toIso8601String(),
        }),
      ).timeout(const Duration(seconds: 15));

      final success = response.statusCode == 200 || response.statusCode == 201;
      print(success ? '✅ [CONFIG] Kiosko activado' : '⚠️ [CONFIG] Kiosko configurado localmente');
      return success;
    } catch (e) {
      print('⚠️ [CONFIG] No se pudo registrar en backend (funcionará offline): $e');
      return false;
    }
  }

  // =====================================================
  // MÉTODOS LEGACY (compatibilidad)
  // =====================================================

  /// [LEGACY] Siempre configurado porque URL está hardcodeada
  static Future<bool> isConfigured() async => true;

  /// [LEGACY] Obtener configuración en formato antiguo
  static Future<Map<String, String>> getConfig() async {
    final kioskConfig = await getKioskConfig();
    return {
      'baseUrl': BACKEND_URL.replaceAll('https://', ''),
      'port': '',
      'companyName': kioskConfig['companyName'] ?? '',
      'companyId': kioskConfig['companyId'] ?? '',
    };
  }

  /// [LEGACY] Guardar configuración en formato antiguo
  static Future<void> saveConfig({
    required String baseUrl,
    required String port,
    required String companyName,
    required String companyId,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_companyIdKey, companyId);
    await prefs.setString(_companyNameKey, companyName);
    await prefs.setBool(_isConfiguredKey, true);
  }

  /// [LEGACY] Resetear configuración
  static Future<void> resetConfig() async => resetKioskConfig();

  /// [LEGACY] Validar URL
  static bool isValidUrl(String url) {
    try {
      final uri = Uri.parse('http://$url');
      return uri.host.isNotEmpty;
    } catch (e) {
      return false;
    }
  }

  /// [LEGACY] Validar puerto
  static bool isValidPort(String port) {
    if (port.isEmpty) return true; // Puerto vacío es válido para HTTPS
    try {
      final portNum = int.parse(port);
      return portNum > 0 && portNum <= 65535;
    } catch (e) {
      return false;
    }
  }
}