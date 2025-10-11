import 'dart:io';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class DynamicServerConfig {
  static const String _serverConfigKey = 'dynamic_server_config';
  static const String _lastWorkingConfigKey = 'last_working_config';
  static const int _connectionTimeout = 5;
  
  // Configuraciones posibles para diferentes entornos
  static const Map<String, Map<String, dynamic>> _environments = {
    'local_dev': {
      'name': 'Desarrollo Local',
      'host': 'localhost',
      'port': 3001,
      'protocol': 'http'
    },
    'local_network': {
      'name': 'Red Local',
      'host': '192.168.1.6',
      'port': 3001,
      'protocol': 'http'
    },
    'production': {
      'name': 'Producción Render',
      'host': 'aponntsuites.onrender.com',
      'port': 443,
      'protocol': 'https'
    }
  };

  // IPs comunes para autodetección (ampliada y mejorada)
  static const List<String> _commonIPs = [
    // Red local común
    '192.168.1.1', '192.168.1.6', '192.168.1.100', '192.168.1.101', '192.168.1.102',
    '192.168.0.1', '192.168.0.100', '192.168.0.101', '192.168.0.102',
    '192.168.137.1', // Hotspot móvil común
    // Redes corporativas
    '10.0.0.1', '10.0.0.100', '10.0.0.101', '10.0.0.102',
    '172.16.0.1', '172.16.0.100', '172.16.0.101', '172.16.0.102',
    // Docker y contenedores
    '172.17.0.1', '172.18.0.1',
    // localhost alternativo
    '127.0.0.1'
  ];

  static const List<int> _commonPorts = [3001, 3000, 8080, 80, 443];

  static Future<Map<String, dynamic>?> getCurrentConfig() async {
    final prefs = await SharedPreferences.getInstance();
    final configJson = prefs.getString(_serverConfigKey);
    if (configJson != null) {
      return json.decode(configJson);
    }
    return null;
  }

  static Future<void> saveConfig(Map<String, dynamic> config) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_serverConfigKey, json.encode(config));
  }

  static Future<void> saveLastWorkingConfig(Map<String, dynamic> config) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_lastWorkingConfigKey, json.encode(config));
  }

  static Future<Map<String, dynamic>?> getLastWorkingConfig() async {
    final prefs = await SharedPreferences.getInstance();
    final configJson = prefs.getString(_lastWorkingConfigKey);
    if (configJson != null) {
      return json.decode(configJson);
    }
    return null;
  }

  static Future<ServerTestResult> testConnection(String host, int port, {String protocol = 'http'}) async {
    try {
      final url = '$protocol://$host:$port/api/v1/config/mobile-connection';
      
      final response = await http.get(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ).timeout(Duration(seconds: _connectionTimeout));

      if (response.statusCode == 200) {
        try {
          final data = json.decode(response.body);
          return ServerTestResult(
            success: true,
            host: host,
            port: port,
            protocol: protocol,
            message: 'Conexión exitosa',
            serverInfo: data,
          );
        } catch (e) {
          return ServerTestResult(
            success: true,
            host: host,
            port: port,
            protocol: protocol,
            message: 'Conectado pero respuesta no válida',
          );
        }
      } else {
        return ServerTestResult(
          success: false,
          host: host,
          port: port,
          protocol: protocol,
          message: 'Servidor respondió con código ${response.statusCode}',
        );
      }
    } catch (e) {
      String errorType = 'desconocido';
      String errorMessage = e.toString();
      
      if (errorMessage.contains('SocketException')) {
        errorType = 'conexión';
        errorMessage = 'No se puede conectar al servidor';
      } else if (errorMessage.contains('TimeoutException')) {
        errorType = 'timeout';
        errorMessage = 'Tiempo de espera agotado';
      } else if (errorMessage.contains('FormatException')) {
        errorType = 'formato';
        errorMessage = 'Respuesta del servidor mal formada';
      }
      
      return ServerTestResult(
        success: false,
        host: host,
        port: port,
        protocol: protocol,
        message: errorMessage,
        errorType: errorType,
      );
    }
  }

  static Future<List<ServerTestResult>> autoDetectServers({
    Function(String)? onProgress,
  }) async {
    List<ServerTestResult> validServers = [];
    int totalTests = _commonIPs.length * _commonPorts.length;
    int currentTest = 0;

    for (String ip in _commonIPs) {
      for (int port in _commonPorts) {
        currentTest++;
        if (onProgress != null) {
          onProgress('Probando $ip:$port ($currentTest/$totalTests)');
        }

        final result = await testConnection(ip, port);
        if (result.success) {
          validServers.add(result);
          
          // Si encontramos uno que funciona, probamos también HTTPS si es puerto 443
          if (port == 443) {
            final httpsResult = await testConnection(ip, port, protocol: 'https');
            if (httpsResult.success) {
              validServers.add(httpsResult);
            }
          }
        }
      }
    }

    return validServers;
  }

  static Future<ServerTestResult?> findBestServer({
    Function(String)? onProgress,
  }) async {
    if (onProgress != null) {
      onProgress('Iniciando búsqueda automática de servidor...');
    }

    // Primero intentar con la última configuración que funcionó
    final lastWorking = await getLastWorkingConfig();
    if (lastWorking != null) {
      if (onProgress != null) {
        onProgress('Probando última configuración conocida...');
      }
      
      final result = await testConnection(
        lastWorking['host'],
        lastWorking['port'],
        protocol: lastWorking['protocol'] ?? 'http',
      );
      
      if (result.success) {
        return result;
      }
    }

    // Luego intentar detección automática
    final servers = await autoDetectServers(onProgress: onProgress);
    
    if (servers.isEmpty) {
      return null;
    }

    // Priorizar servidores por protocolo y puerto
    servers.sort((a, b) {
      // HTTPS tiene prioridad
      if (a.protocol == 'https' && b.protocol == 'http') return -1;
      if (a.protocol == 'http' && b.protocol == 'https') return 1;
      
      // Puertos estándar tienen prioridad
      final standardPorts = [3001, 3000, 443, 80, 8080];
      final aIndex = standardPorts.indexOf(a.port);
      final bIndex = standardPorts.indexOf(b.port);
      
      if (aIndex != -1 && bIndex != -1) {
        return aIndex.compareTo(bIndex);
      } else if (aIndex != -1) {
        return -1;
      } else if (bIndex != -1) {
        return 1;
      }
      
      return 0;
    });

    return servers.first;
  }

  static Map<String, dynamic> createConfig(String host, int port, {String protocol = 'http'}) {
    return {
      'host': host,
      'port': port,
      'protocol': protocol,
      'baseUrl': '$protocol://$host:$port',
      'apiBaseUrl': '$protocol://$host:$port/api/v1',
      'wsUrl': '$protocol://$host:$port',
      'createdAt': DateTime.now().toIso8601String(),
    };
  }

  static Future<void> applyConfiguration(Map<String, dynamic> config) async {
    await saveConfig(config);
    // También guardamos como última configuración que funcionó
    await saveLastWorkingConfig(config);
  }

  // Configuraciones predeterminadas para hosting común
  static Map<String, dynamic> getHostingConfig(String domain) {
    return createConfig(
      domain,
      443, // HTTPS por defecto para hosting
      protocol: 'https',
    );
  }

  // Configuración para desarrollo local
  static Map<String, dynamic> getLocalConfig({String host = 'localhost', int port = 3001}) {
    return createConfig(host, port, protocol: 'http');
  }

  // Configuración para red local
  static Map<String, dynamic> getNetworkConfig(String ip, {int port = 3001}) {
    return createConfig(ip, port, protocol: 'http');
  }
}

class ServerTestResult {
  final bool success;
  final String host;
  final int port;
  final String protocol;
  final String message;
  final String? errorType;
  final Map<String, dynamic>? serverInfo;

  ServerTestResult({
    required this.success,
    required this.host,
    required this.port,
    required this.protocol,
    required this.message,
    this.errorType,
    this.serverInfo,
  });

  String get fullUrl => '$protocol://$host:$port';
  String get displayName => '$host:$port ($protocol)';

  Map<String, dynamic> toConfig() {
    return DynamicServerConfig.createConfig(host, port, protocol: protocol);
  }

  @override
  String toString() {
    return 'ServerTestResult{success: $success, host: $host, port: $port, protocol: $protocol, message: $message}';
  }
}