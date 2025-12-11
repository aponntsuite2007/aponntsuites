import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;

class ConfigService {
  // Claves consistentes con main.dart y kiosk_screen.dart
  static const String _baseUrlKey = 'config_baseUrl';
  static const String _portKey = 'config_port';
  static const String _companyNameKey = 'config_companyName';
  static const String _companyIdKey = 'config_company_id';
  static const String _isConfiguredKey = 'config_is_configured';

  // VALORES HARDCODEADOS - www.aponnt.com
  static const String DEFAULT_BASE_URL = 'www.aponnt.com';
  static const String DEFAULT_PORT = ''; // HTTPS estándar (puerto 443)
  static const String DEFAULT_COMPANY_ID = '1'; // Default, usuario debe especificar

  // Obtener configuración actual (retorna valores guardados o valores por defecto de Render)
  static Future<Map<String, String>> getConfig() async {
    final prefs = await SharedPreferences.getInstance();
    return {
      'baseUrl': prefs.getString(_baseUrlKey) ?? DEFAULT_BASE_URL,
      'port': prefs.getString(_portKey) ?? DEFAULT_PORT,
      'companyName': prefs.getString(_companyNameKey) ?? 'MLK IT',
      'companyId': prefs.getString(_companyIdKey) ?? DEFAULT_COMPANY_ID,
    };
  }

  // Guardar configuración
  static Future<void> saveConfig({
    required String baseUrl,
    required String port,
    required String companyName,
    required String companyId,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_baseUrlKey, baseUrl);
    await prefs.setString(_portKey, port);
    await prefs.setString(_companyNameKey, companyName);
    await prefs.setString(_companyIdKey, companyId);
    await prefs.setBool(_isConfiguredKey, true);
  }

  // SIEMPRE configurado - hardcoded a www.aponnt.com
  static Future<bool> isConfigured() async {
    // Siempre retorna true porque está hardcodeado
    return true;
  }

  // Obtener URL completa para API (HARDCODED)
  static Future<String> getApiBaseUrl() async {
    // Hardcoded a www.aponnt.com
    return 'https://www.aponnt.com/api/v1';
  }

  // Obtener URL base para WebSocket (HARDCODED)
  static Future<String> getWebSocketUrl() async {
    // Hardcoded a www.aponnt.com
    return 'https://www.aponnt.com';
  }

  // Obtener URL completa del servidor (HARDCODED)
  static Future<String> getServerUrl() async {
    // Hardcoded a www.aponnt.com
    return 'https://www.aponnt.com';
  }

  // Resetear configuración
  static Future<void> resetConfig() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_baseUrlKey);
    await prefs.remove(_portKey);
    await prefs.remove(_companyNameKey);
    await prefs.remove(_companyIdKey);
    await prefs.remove(_isConfiguredKey);
  }

  // Validar URL
  static bool isValidUrl(String url) {
    try {
      final uri = Uri.parse('http://$url');
      return uri.host.isNotEmpty;
    } catch (e) {
      return false;
    }
  }

  // Validar puerto
  static bool isValidPort(String port) {
    try {
      final portNum = int.parse(port);
      return portNum > 0 && portNum <= 65535;
    } catch (e) {
      return false;
    }
  }

  // Intentar autodetección del servidor (busca en red local)
  static Future<Map<String, String>?> tryAutoDetect() async {
    // Lista de IPs comunes para probar (192.168.x.x)
    final commonIps = [
      '192.168.0.200',  // WiFi actual
      '192.168.137.1', // Hotspot móvil
      '192.168.1.1',
      '192.168.0.1',
      '10.0.0.1',
    ];

    final commonPorts = ['9999', '3000', '3001'];

    print('🔍 [AUTO-DETECT] Iniciando búsqueda de servidor...');

    for (final ip in commonIps) {
      for (final port in commonPorts) {
        try {
          final url = 'http://$ip:$port/api/v1/health';
          print('🔍 [AUTO-DETECT] Probando: $url');

          final response = await http.get(Uri.parse(url))
              .timeout(Duration(seconds: 2));

          if (response.statusCode == 200) {
            print('✅ [AUTO-DETECT] Servidor encontrado en $ip:$port');
            return {
              'baseUrl': ip,
              'port': port,
            };
          }
        } catch (e) {
          // Continuar buscando
        }
      }
    }

    print('❌ [AUTO-DETECT] No se encontró servidor automáticamente');
    return null;
  }
}