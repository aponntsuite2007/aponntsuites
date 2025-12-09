import 'dart:io';
import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Respuesta genérica de la API
class ApiResponse {
  final bool isSuccess;
  final dynamic data;
  final String? error;

  ApiResponse({required this.isSuccess, this.data, this.error});
}

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  final Dio _dio = Dio();
  String? _baseUrl;
  String? _token;

  void initialize(String baseUrl) {
    _baseUrl = baseUrl;
    _dio.options.baseUrl = baseUrl;
    _dio.options.connectTimeout = const Duration(seconds: 30);
    _dio.options.receiveTimeout = const Duration(seconds: 30);
  }

  // ============ TOKEN MANAGEMENT ============

  Future<void> setToken(String token) async {
    _token = token;
    _dio.options.headers['Authorization'] = 'Bearer $token';
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('auth_token', token);
  }

  Future<void> clearToken() async {
    _token = null;
    _dio.options.headers.remove('Authorization');
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
  }

  // ============ GENERIC HTTP METHODS ============

  Future<ApiResponse> get(String path, {Map<String, dynamic>? queryParams}) async {
    try {
      final response = await _dio.get(path, queryParameters: queryParams);
      return ApiResponse(isSuccess: true, data: response.data);
    } on DioException catch (e) {
      return ApiResponse(isSuccess: false, error: e.message ?? 'Error de conexión');
    } catch (e) {
      return ApiResponse(isSuccess: false, error: e.toString());
    }
  }

  Future<ApiResponse> post(String path, [dynamic data]) async {
    try {
      final response = await _dio.post(path, data: data);
      return ApiResponse(isSuccess: true, data: response.data);
    } on DioException catch (e) {
      return ApiResponse(isSuccess: false, error: e.message ?? 'Error de conexión');
    } catch (e) {
      return ApiResponse(isSuccess: false, error: e.toString());
    }
  }

  Future<ApiResponse> put(String path, [dynamic data]) async {
    try {
      final response = await _dio.put(path, data: data);
      return ApiResponse(isSuccess: true, data: response.data);
    } on DioException catch (e) {
      return ApiResponse(isSuccess: false, error: e.message ?? 'Error de conexión');
    } catch (e) {
      return ApiResponse(isSuccess: false, error: e.toString());
    }
  }

  Future<ApiResponse> delete(String path) async {
    try {
      final response = await _dio.delete(path);
      return ApiResponse(isSuccess: true, data: response.data);
    } on DioException catch (e) {
      return ApiResponse(isSuccess: false, error: e.message ?? 'Error de conexión');
    } catch (e) {
      return ApiResponse(isSuccess: false, error: e.toString());
    }
  }

  // ============ AUTH METHODS ============

  Future<ApiResponse> login(String identifier, String password) async {
    return post('/api/v1/auth/login', {
      'identifier': identifier,
      'password': password,
    });
  }

  Future<ApiResponse> pinLogin(String pin) async {
    return post('/api/v1/auth/pin-login', {'pin': pin});
  }

  Future<ApiResponse> biometricLogin(String template, String type, {String? userId}) async {
    return post('/api/v1/auth/biometric-login', {
      'template': template,
      'type': type,
      'user_id': userId,
    });
  }

  Future<ApiResponse> logout() async {
    return post('/api/v1/auth/logout');
  }

  Future<ApiResponse> getCurrentUser() async {
    return get('/api/v1/auth/me');
  }

  // ============ MEDICAL METHODS ============

  Future<List<Map<String, dynamic>>> getMyCertificates() async {
    final response = await get('/api/v1/medical/certificates/my');
    if (response.isSuccess && response.data != null) {
      return List<Map<String, dynamic>>.from(response.data);
    }
    return [];
  }

  Future<Map<String, dynamic>> detectEmployee({
    required String companyId,
    required String image,
    double threshold = 0.7,
    String? kioskId,
  }) async {
    try {
      final response = await _dio.post('/api/v2/kiosk-enterprise/detect-employee', data: {
        'company_id': companyId,
        'image': image,
        'threshold': threshold,
        'kiosk_id': kioskId,
      });

      return response.data;
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  Future<Map<String, dynamic>> registerAttendance({
    required String employeeId,
    required String companyId,
    String detectionMethod = 'facial_recognition',
    double? confidenceScore,
    String? kioskId,
  }) async {
    try {
      final response = await _dio.post('/api/v2/kiosk-enterprise/register-attendance', data: {
        'employee_id': employeeId,
        'company_id': companyId,
        'detection_method': detectionMethod,
        'confidence_score': confidenceScore,
        'kiosk_id': kioskId,
      });

      return response.data;
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  Future<Map<String, dynamic>> getKioskStats(String companyId) async {
    try {
      final response = await _dio.get('/api/v2/kiosk-enterprise/stats/$companyId');
      return response.data;
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  Future<Map<String, dynamic>> configureKiosk({
    required String companyId,
    required String kioskId,
    required String kioskName,
    String? location,
    Map<String, dynamic>? settings,
  }) async {
    try {
      final response = await _dio.post('/api/v2/kiosk-enterprise/configure', data: {
        'company_id': companyId,
        'kiosk_id': kioskId,
        'kiosk_name': kioskName,
        'location': location,
        'settings': settings,
      });

      return response.data;
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  // ============ FILE UPLOAD METHODS ============

  Future<ApiResponse> uploadFile(File file, String folder) async {
    try {
      String fileName = file.path.split('/').last;
      FormData formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(file.path, filename: fileName),
        'folder': folder,
      });

      final response = await _dio.post('/api/v1/uploads', data: formData);
      return ApiResponse(isSuccess: true, data: response.data);
    } on DioException catch (e) {
      return ApiResponse(isSuccess: false, error: e.message ?? 'Error subiendo archivo');
    } catch (e) {
      return ApiResponse(isSuccess: false, error: e.toString());
    }
  }
}