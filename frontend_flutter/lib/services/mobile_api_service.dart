import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';

// Mobile API Service - Comunicación completa con backend
class MobileApiService {
  static const String _tokenKey = 'auth_token';
  static const String _userIdKey = 'user_id';

  String baseUrl;
  String? _authToken;

  MobileApiService({required this.baseUrl});

  // Headers con autenticación
  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    if (_authToken != null) 'Authorization': 'Bearer $_authToken',
  };

  Map<String, String> get _multipartHeaders => {
    if (_authToken != null) 'Authorization': 'Bearer $_authToken',
  };

  // ====================================
  // 🔧 CONFIGURACIÓN Y CONEXIÓN
  // ====================================

  Future<Map<String, dynamic>> getServerConfig() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/config/mobile-connection'),
        headers: {'Content-Type': 'application/json'},
      );

      if (response.statusCode == 200) {
        final config = json.decode(response.body);

        // 🌐 Configuración multi-tenant inteligente
        if (config['success'] == true) {
          print('📱 [CONFIG] Tipo de red: ${config['server']['networkType']}');
          print('📱 [CONFIG] Cliente IP: ${config['client']['ip']}');
          print('📱 [CONFIG] Red detectada: ${config['client']['detectedNetwork']}');

          // Actualizar configuración según tipo de red
          if (config['server']['networkType'] == 'local') {
            print('🏠 [CONFIG] Configurando para red local (LAN)');
          } else {
            print('🌍 [CONFIG] Configurando para internet (WAN)');
          }

          // Actualizar endpoints si vienen en la configuración
          if (config['endpoints'] != null) {
            print('🔗 [CONFIG] Endpoints actualizados desde servidor');
          }
        }

        return config;
      } else {
        throw Exception('Error obteniendo configuración del servidor');
      }
    } catch (e) {
      throw Exception('Error de conexión: $e');
    }
  }

  Future<bool> checkHealth() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/health'),
        headers: {'Content-Type': 'application/json'},
      );
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  // ====================================
  // 🔐 AUTENTICACIÓN
  // ====================================

  Future<Map<String, dynamic>> login({
    required String username,
    required String password,
    String? biometricType,
    String? companySlug,
    int? tenantId,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'username': username,
          'password': password,
          if (biometricType != null) 'biometricType': biometricType,
          if (companySlug != null) 'companySlug': companySlug,
          if (tenantId != null) 'tenantId': tenantId,
        }),
      );

      final data = json.decode(response.body);

      if (response.statusCode == 200 && data['success']) {
        _authToken = data['token'];

        // Guardar token en SharedPreferences
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(_tokenKey, _authToken!);
        await prefs.setString(_userIdKey, data['user']['id'].toString());

        return data;
      } else {
        throw Exception(data['message'] ?? 'Error en login');
      }
    } catch (e) {
      throw Exception('Error de conexión en login: $e');
    }
  }

  Future<void> logout() async {
    try {
      await http.post(
        Uri.parse('$baseUrl/auth/logout'),
        headers: _headers,
      );
    } catch (e) {
      print('Error en logout: $e');
    } finally {
      _authToken = null;
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_tokenKey);
      await prefs.remove(_userIdKey);
    }
  }

  Future<void> loadStoredToken() async {
    final prefs = await SharedPreferences.getInstance();
    _authToken = prefs.getString(_tokenKey);
  }

  // ====================================
  // 📸 BIOMETRÍA AVANZADA
  // ====================================

  Future<Map<String, dynamic>> registerFacialBiometric({
    required String userId,
    required String companyId,
    required File faceImage,
  }) async {
    try {
      var request = http.MultipartRequest(
        'POST',
        Uri.parse('$baseUrl/biometric/face/register'),
      );

      request.headers.addAll(_multipartHeaders);
      request.fields['userId'] = userId;
      request.fields['companyId'] = companyId;

      request.files.add(
        await http.MultipartFile.fromPath('faceImage', faceImage.path),
      );

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);
      final data = json.decode(response.body);

      if (response.statusCode == 200 && data['success']) {
        return data;
      } else {
        throw Exception(data['message'] ?? 'Error en registro facial');
      }
    } catch (e) {
      throw Exception('Error en registro facial: $e');
    }
  }

  Future<Map<String, dynamic>> verifyFacialBiometric({
    required String userId,
    required String companyId,
    required File faceImage,
    Map<String, double>? location,
  }) async {
    try {
      var request = http.MultipartRequest(
        'POST',
        Uri.parse('$baseUrl/biometric/face/verify'),
      );

      request.headers.addAll(_multipartHeaders);
      request.fields['userId'] = userId;
      request.fields['companyId'] = companyId;
      if (location != null) {
        request.fields['location'] = json.encode(location);
      }

      request.files.add(
        await http.MultipartFile.fromPath('faceImage', faceImage.path),
      );

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);
      final data = json.decode(response.body);

      return data;
    } catch (e) {
      throw Exception('Error en verificación facial: $e');
    }
  }

  Future<Map<String, dynamic>> registerFingerprint({
    required String userId,
    required String fingerprintData,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/biometric/fingerprint/register'),
        headers: _headers,
        body: json.encode({
          'userId': userId,
          'fingerprintData': fingerprintData,
        }),
      );

      return json.decode(response.body);
    } catch (e) {
      throw Exception('Error en registro de huella: $e');
    }
  }

  Future<Map<String, dynamic>> verifyFingerprint({
    required String userId,
    required String fingerprintData,
    Map<String, double>? location,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/biometric/fingerprint/verify'),
        headers: _headers,
        body: json.encode({
          'userId': userId,
          'fingerprintData': fingerprintData,
          if (location != null) 'location': location,
        }),
      );

      return json.decode(response.body);
    } catch (e) {
      throw Exception('Error en verificación de huella: $e');
    }
  }

  // ====================================
  // 📱 QR CODE CON VENCIMIENTO
  // ====================================

  Future<Map<String, dynamic>> generateTemporaryQR({
    required String userId,
    required String companyId,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/qr/generate'),
        headers: _headers,
        body: json.encode({
          'userId': userId,
          'companyId': companyId,
        }),
      );

      return json.decode(response.body);
    } catch (e) {
      throw Exception('Error generando QR: $e');
    }
  }

  Future<Map<String, dynamic>> verifyQRCode({
    required String qrCode,
    Map<String, double>? location,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/qr/verify'),
        headers: _headers,
        body: json.encode({
          'qrCode': qrCode,
          if (location != null) 'location': location,
        }),
      );

      return json.decode(response.body);
    } catch (e) {
      throw Exception('Error verificando QR: $e');
    }
  }

  // ====================================
  // 📋 GESTIÓN DE PERMISOS Y SOLICITUDES
  // ====================================

  Future<Map<String, dynamic>> requestPermission({
    required String type, // 'absence', 'vacation', 'shift_change'
    required String startDate,
    required String endDate,
    required String reason,
    List<String>? documents,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/requests/permission'),
        headers: _headers,
        body: json.encode({
          'type': type,
          'startDate': startDate,
          'endDate': endDate,
          'reason': reason,
          if (documents != null) 'documents': documents,
        }),
      );

      return json.decode(response.body);
    } catch (e) {
      throw Exception('Error solicitando permiso: $e');
    }
  }

  Future<List<dynamic>> getMyRequests() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/requests/my-requests'),
        headers: _headers,
      );

      final data = json.decode(response.body);
      if (response.statusCode == 200 && data['success']) {
        return data['requests'];
      } else {
        throw Exception(data['message'] ?? 'Error obteniendo solicitudes');
      }
    } catch (e) {
      throw Exception('Error obteniendo solicitudes: $e');
    }
  }

  // ====================================
  // 💬 NOTIFICACIONES BIDIRECCIONALES
  // ====================================

  Future<Map<String, dynamic>> getNotifications() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/notifications'),
        headers: _headers,
      );

      return json.decode(response.body);
    } catch (e) {
      throw Exception('Error obteniendo notificaciones: $e');
    }
  }

  Future<Map<String, dynamic>> markNotificationAsRead(String notificationId) async {
    try {
      final response = await http.patch(
        Uri.parse('$baseUrl/notifications/$notificationId/read'),
        headers: _headers,
      );

      return json.decode(response.body);
    } catch (e) {
      throw Exception('Error marcando notificación: $e');
    }
  }

  // ====================================
  // 📊 DASHBOARD EMPLEADO
  // ====================================

  Future<Map<String, dynamic>> getDashboardSummary() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/dashboard/summary'),
        headers: _headers,
      );

      return json.decode(response.body);
    } catch (e) {
      throw Exception('Error obteniendo resumen: $e');
    }
  }

  // ====================================
  // 🏥 INTEGRACIÓN MÉDICA
  // ====================================

  Future<Map<String, dynamic>> requestMedicalAppointment({
    required String type,
    required String preferredDate,
    required String symptoms,
    required String urgency,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/medical/appointment'),
        headers: _headers,
        body: json.encode({
          'type': type,
          'preferredDate': preferredDate,
          'symptoms': symptoms,
          'urgency': urgency,
        }),
      );

      return json.decode(response.body);
    } catch (e) {
      throw Exception('Error solicitando cita médica: $e');
    }
  }

  Future<Map<String, dynamic>> uploadMedicalCertificate(File certificate) async {
    try {
      var request = http.MultipartRequest(
        'POST',
        Uri.parse('$baseUrl/medical/certificate'),
      );

      request.headers.addAll(_multipartHeaders);
      request.files.add(
        await http.MultipartFile.fromPath('certificate', certificate.path),
      );

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      return json.decode(response.body);
    } catch (e) {
      throw Exception('Error subiendo certificado: $e');
    }
  }

  // ====================================
  // 📚 CAPACITACIONES
  // ====================================

  Future<List<dynamic>> getAssignedTrainings() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/training/assigned'),
        headers: _headers,
      );

      final data = json.decode(response.body);
      if (response.statusCode == 200 && data['success']) {
        return data['trainings'];
      } else {
        throw Exception(data['message'] ?? 'Error obteniendo capacitaciones');
      }
    } catch (e) {
      throw Exception('Error obteniendo capacitaciones: $e');
    }
  }

  Future<Map<String, dynamic>> completeTraining({
    required String trainingId,
    int? score,
    String? feedback,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/training/$trainingId/complete'),
        headers: _headers,
        body: json.encode({
          if (score != null) 'score': score,
          if (feedback != null) 'feedback': feedback,
        }),
      );

      return json.decode(response.body);
    } catch (e) {
      throw Exception('Error completando capacitación: $e');
    }
  }

  // ====================================
  // 🔄 UTILIDADES
  // ====================================

  bool get isAuthenticated => _authToken != null && _authToken!.isNotEmpty;

  void updateBaseUrl(String newBaseUrl) {
    baseUrl = newBaseUrl;
  }
}