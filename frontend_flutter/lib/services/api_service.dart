import 'dart:io';
import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

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
}