import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'ssl_pinning_service.dart';

/// ConfigService - Servicio de Configuración del Kiosko
///
/// URL DEL SERVIDOR HARDCODEADA - No se pide al usuario
/// Solo se configura: Empresa, Kiosko, GPS
class ConfigService {
  // 🔐 Secure Storage para tokens sensibles (AES-256 en Android)
  static const _secureStorage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );
  static const String _secureTokenKey = 'kiosk_admin_token_secure';

  // =====================================================
  // 🔒 URL HARDCODEADA - DOMINIO PRINCIPAL
  // =====================================================
  static const String BACKEND_URL = 'https://www.aponnt.com';
  static const String API_BASE = '$BACKEND_URL/api/v1';

  // Legacy constants (compatibilidad con config_screen.dart de otros flavors)
  static const String DEFAULT_BASE_URL = 'www.aponnt.com';
  static const String DEFAULT_PORT = '';

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

  /// Guardar token de admin en Secure Storage (AES-256 encrypted)
  static Future<void> saveAdminToken(String token) async {
    await _secureStorage.write(key: _secureTokenKey, value: token);
    // Limpiar token inseguro de SharedPreferences si existe (migración)
    final prefs = await SharedPreferences.getInstance();
    if (prefs.containsKey(_adminTokenKey)) {
      await prefs.remove(_adminTokenKey);
    }
  }

  /// Obtener token de admin desde Secure Storage
  static Future<String?> getAdminToken() async {
    final secureToken = await _secureStorage.read(key: _secureTokenKey);
    if (secureToken != null) return secureToken;

    // Migración: si hay token en SharedPreferences, moverlo a Secure Storage
    final prefs = await SharedPreferences.getInstance();
    final legacyToken = prefs.getString(_adminTokenKey);
    if (legacyToken != null) {
      await _secureStorage.write(key: _secureTokenKey, value: legacyToken);
      await prefs.remove(_adminTokenKey);
      return legacyToken;
    }
    return null;
  }

  /// Limpiar token de admin de Secure Storage
  static Future<void> clearAdminToken() async {
    await _secureStorage.delete(key: _secureTokenKey);
    // También limpiar legacy por si acaso
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

    // Limpiar Secure Storage
    await _secureStorage.delete(key: _secureTokenKey);

    // Legacy
    await prefs.remove(_baseUrlKey);
    await prefs.remove(_portKey);
    await prefs.remove(_isConfiguredKey);

    print('🗑️ [CONFIG] Configuración del kiosko reseteada');
  }

  // =====================================================
  // 🔐 HTTP CLIENT CON SSL PINNING
  // =====================================================

  /// Obtener HTTP client con certificate pinning habilitado
  static http.Client _getPinnedClient() => SSLPinningService.createPinnedClient();

  // =====================================================
  // MÉTODOS DE API - HARDCODEADOS A PRODUCCIÓN
  // =====================================================

  /// URL base del servidor (HARDCODEADA)
  static String getServerUrl() => BACKEND_URL;

  /// URL base de la API (HARDCODEADA)
  static String getApiBaseUrl() => API_BASE;

  /// URL del WebSocket (HARDCODEADA)
  static String getWebSocketUrl() => BACKEND_URL;

  /// Obtener lista de empresas disponibles
  static Future<List<Map<String, dynamic>>> getAvailableCompanies() async {
    final client = _getPinnedClient();
    try {
      final url = '$API_BASE/companies/public-list';
      print('📡 [CONFIG] Obteniendo empresas desde: $url');

      final response = await client.get(
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
    } finally {
      client.close();
    }
  }

  /// Obtener kioscos disponibles para una empresa
  static Future<List<Map<String, dynamic>>> getAvailableKiosks(String companyId) async {
    final client = _getPinnedClient();
    try {
      final url = '$API_BASE/kiosks/available?company_id=$companyId';
      print('📡 [CONFIG] Obteniendo kioscos desde: $url');

      final response = await client.get(
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
    } finally {
      client.close();
    }
  }

  /// Probar conexión con el servidor
  static Future<bool> testConnection() async {
    final client = _getPinnedClient();
    try {
      final url = '$API_BASE/health';
      print('🔍 [CONFIG] Probando conexión: $url');

      final response = await client.get(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
      ).timeout(const Duration(seconds: 10));

      final success = response.statusCode == 200;
      print(success ? '✅ [CONFIG] Conexión exitosa' : '❌ [CONFIG] Error de conexión');
      return success;
    } catch (e) {
      print('❌ [CONFIG] Error probando conexión: $e');
      return false;
    } finally {
      client.close();
    }
  }

  /// Validar credenciales de administrador
  static Future<Map<String, dynamic>?> validateAdminCredentials({
    required String companyId,
    required String username,
    required String password,
  }) async {
    final client = _getPinnedClient();
    try {
      final url = '$API_BASE/auth/login';
      print('🔐 [CONFIG] Validando admin para empresa $companyId');

      final response = await client.post(
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
    } finally {
      client.close();
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
    final client = _getPinnedClient();
    try {
      final url = '$API_BASE/kiosks/$kioskId/activate';
      print('📱 [CONFIG] Registrando activación del kiosko $kioskId');

      final response = await client.post(
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
    } finally {
      client.close();
    }
  }

  /// Desactivar kiosko (liberar device_id, desmarcar como activo)
  static Future<bool> deactivateKiosk({
    required String kioskId,
    required String companyId,
    String? deviceId,
  }) async {
    final client = _getPinnedClient();
    try {
      final url = '$API_BASE/kiosks/$kioskId/deactivate';
      print('📱 [CONFIG] Desactivando kiosko $kioskId');

      final response = await client.post(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'company_id': companyId,
          'device_id': deviceId,
        }),
      ).timeout(const Duration(seconds: 15));

      final success = response.statusCode == 200;
      if (success) {
        // Limpiar configuración local
        await resetKioskConfig();
        print('✅ [CONFIG] Kiosko desactivado');
      }
      return success;
    } catch (e) {
      print('❌ [CONFIG] Error desactivando kiosko: $e');
      return false;
    } finally {
      client.close();
    }
  }

  /// Actualizar GPS del kiosko en el backend
  static Future<bool> updateKioskGPS({
    required String kioskId,
    required String companyId,
    required double gpsLat,
    required double gpsLng,
    String? deviceId,
  }) async {
    final client = _getPinnedClient();
    try {
      final url = '$API_BASE/kiosks/$kioskId/update-gps';
      print('📍 [CONFIG] Actualizando GPS del kiosko $kioskId: $gpsLat, $gpsLng');

      final response = await client.post(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'company_id': companyId,
          'gps_lat': gpsLat,
          'gps_lng': gpsLng,
          'device_id': deviceId,
        }),
      ).timeout(const Duration(seconds: 15));

      final success = response.statusCode == 200;
      if (success) {
        // Guardar GPS localmente
        final prefs = await SharedPreferences.getInstance();
        await prefs.setDouble(_gpsLatKey, gpsLat);
        await prefs.setDouble(_gpsLngKey, gpsLng);
        print('✅ [CONFIG] GPS actualizado en backend');
      }
      return success;
    } catch (e) {
      print('❌ [CONFIG] Error actualizando GPS: $e');
      return false;
    } finally {
      client.close();
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