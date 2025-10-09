import 'dart:async';
import 'dart:io';
import 'package:multicast_dns/multicast_dns.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

/// 🌐 SERVICIO DE DESCUBRIMIENTO AUTOMÁTICO DE SERVIDOR
/// - Busca servidor automáticamente en la red local usando mDNS
/// - Escanea puertos comunes si mDNS falla
/// - Guarda configuración automáticamente
/// - Funciona en todas las redes (192.168.1.x, 192.168.3.x, 192.168.137.x, etc)
class ServerDiscoveryService {
  static const String _SERVICE_TYPE = '_siac-biometric._tcp';
  static const String _SERVICE_NAME = 'siac-biometric-server';
  static const List<int> _COMMON_PORTS = [9997, 9998, 9999, 9900, 8080, 3000];
  static const Duration _SCAN_TIMEOUT = Duration(seconds: 10);

  /// 🔍 BUSCAR SERVIDOR AUTOMÁTICAMENTE
  /// Intenta mDNS primero, luego escaneo de red
  static Future<Map<String, String>?> discoverServer() async {
    print('🔍 [DISCOVERY] Iniciando búsqueda automática del servidor...');

    // 1. Intentar mDNS primero
    final mdnsResult = await _discoverViaMDNS();
    if (mdnsResult != null) {
      print('✅ [DISCOVERY] Servidor encontrado via mDNS: ${mdnsResult['baseUrl']}:${mdnsResult['port']}');
      await _saveDiscoveredConfig(mdnsResult);
      return mdnsResult;
    }

    // 2. Si mDNS falla, escanear red local
    print('🔄 [DISCOVERY] mDNS sin resultados, escaneando red local...');
    final scanResult = await _scanLocalNetwork();
    if (scanResult != null) {
      print('✅ [DISCOVERY] Servidor encontrado via escaneo: ${scanResult['baseUrl']}:${scanResult['port']}');
      await _saveDiscoveredConfig(scanResult);
      return scanResult;
    }

    print('❌ [DISCOVERY] No se pudo encontrar el servidor automáticamente');
    return null;
  }

  /// 📡 DESCUBRIMIENTO VIA mDNS (BONJOUR/ZEROCONF)
  static Future<Map<String, String>?> _discoverViaMDNS() async {
    try {
      final MDnsClient client = MDnsClient();
      await client.start();

      print('📡 [mDNS] Buscando servicio $_SERVICE_TYPE...');

      await for (final PtrResourceRecord ptr in client
          .lookup<PtrResourceRecord>(ResourceRecordQuery.serverPointer(_SERVICE_TYPE))
          .timeout(_SCAN_TIMEOUT)) {
        print('🔎 [mDNS] Servicio encontrado: ${ptr.domainName}');

        // Buscar dirección IP del servicio
        await for (final SrvResourceRecord srv in client
            .lookup<SrvResourceRecord>(ResourceRecordQuery.service(ptr.domainName))
            .timeout(Duration(seconds: 3))) {
          print('🔗 [mDNS] SRV: ${srv.target}:${srv.port}');

          // Obtener IP
          await for (final IPAddressResourceRecord ip in client
              .lookup<IPAddressResourceRecord>(ResourceRecordQuery.addressIPv4(srv.target))
              .timeout(Duration(seconds: 2))) {
            print('🌐 [mDNS] IP encontrada: ${ip.address.address}:${srv.port}');

            // Verificar que el servidor responde
            if (await _verifyServer(ip.address.address, srv.port.toString())) {
              client.stop();
              return {
                'baseUrl': ip.address.address,
                'port': srv.port.toString(),
                'companyName': 'Auto-detectado',
                'companyId': '11', // Default ISI
              };
            }
          }
        }
      }

      client.stop();
    } catch (e) {
      print('⚠️ [mDNS] Error: $e');
    }

    return null;
  }

  /// 🌐 ESCANEO DE RED LOCAL
  /// Escanea IPs comunes en todas las subredes locales
  static Future<Map<String, String>?> _scanLocalNetwork() async {
    try {
      // Obtener todas las interfaces de red
      final interfaces = await NetworkInterface.list(
        includeLinkLocal: false,
        includeLoopback: false,
        type: InternetAddressType.IPv4,
      );

      print('🔍 [SCAN] Interfaces encontradas: ${interfaces.length}');

      for (final interface in interfaces) {
        for (final address in interface.addresses) {
          // Obtener subnet base (ej: 192.168.1 de 192.168.1.54)
          final parts = address.address.split('.');
          if (parts.length != 4) continue;

          final subnet = '${parts[0]}.${parts[1]}.${parts[2]}';
          print('🔍 [SCAN] Escaneando subnet: $subnet.x');

          // Escanear IPs comunes en esta subnet
          for (int lastOctet in [1, 9, 54, 100, 101]) {
            final ip = '$subnet.$lastOctet';

            // Saltar IP propia
            if (ip == address.address) continue;

            // Probar puertos comunes
            for (final port in _COMMON_PORTS) {
              print('🔎 [SCAN] Probando $ip:$port...');
              if (await _verifyServer(ip, port.toString())) {
                print('✅ [SCAN] Servidor encontrado en $ip:$port');
                return {
                  'baseUrl': ip,
                  'port': port.toString(),
                  'companyName': 'Auto-detectado',
                  'companyId': '11', // Default ISI
                };
              }
            }
          }
        }
      }
    } catch (e) {
      print('❌ [SCAN] Error escaneando red: $e');
    }

    return null;
  }

  /// ✅ VERIFICAR QUE EL SERVIDOR RESPONDE
  static Future<bool> _verifyServer(String ip, String port) async {
    try {
      final url = 'http://$ip:$port/api/v1/health';
      final response = await http.get(Uri.parse(url)).timeout(Duration(seconds: 2));

      if (response.statusCode == 200) {
        print('✅ [VERIFY] Servidor verificado en $ip:$port');
        return true;
      }
    } catch (e) {
      // Silenciar errores (normal durante escaneo)
    }
    return false;
  }

  /// 💾 GUARDAR CONFIGURACIÓN DESCUBIERTA
  static Future<void> _saveDiscoveredConfig(Map<String, String> config) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('config_base_url', config['baseUrl']!);
    await prefs.setString('config_port', config['port']!);
    await prefs.setString('config_company_name', config['companyName']!);
    await prefs.setString('config_company_id', config['companyId']!);
    await prefs.setBool('config_is_configured', true);
    print('💾 [DISCOVERY] Configuración guardada automáticamente');
  }

  /// 🔄 RE-DESCUBRIR SERVIDOR (cuando cambia de red)
  static Future<Map<String, String>?> rediscoverServer() async {
    print('🔄 [DISCOVERY] Re-descubriendo servidor (cambio de red detectado)...');
    return await discoverServer();
  }

  /// 📋 OBTENER CONFIGURACIÓN ACTUAL O DESCUBRIR
  static Future<Map<String, String>> getOrDiscoverConfig() async {
    final prefs = await SharedPreferences.getInstance();
    final isConfigured = prefs.getBool('config_is_configured') ?? false;

    if (isConfigured) {
      // Verificar que la configuración guardada sigue funcionando
      final baseUrl = prefs.getString('config_base_url');
      final port = prefs.getString('config_port');

      if (baseUrl != null && port != null) {
        if (await _verifyServer(baseUrl, port)) {
          print('✅ [DISCOVERY] Usando configuración guardada: $baseUrl:$port');
          return {
            'baseUrl': baseUrl,
            'port': port,
            'companyName': prefs.getString('config_company_name') ?? 'Auto-detectado',
            'companyId': prefs.getString('config_company_id') ?? '11',
          };
        } else {
          print('⚠️ [DISCOVERY] Configuración guardada no responde, re-descubriendo...');
        }
      }
    }

    // Si no hay configuración o no funciona, descubrir
    final discovered = await discoverServer();
    if (discovered != null) {
      return discovered;
    }

    // Fallback a valores por defecto
    return {
      'baseUrl': '192.168.1.9',
      'port': '9997',
      'companyName': 'Mi Empresa',
      'companyId': '11',
    };
  }
}
