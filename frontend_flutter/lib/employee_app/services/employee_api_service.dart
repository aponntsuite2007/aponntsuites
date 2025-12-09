/*
 * 🌐 EMPLOYEE API SERVICE
 * ========================
 * Servicio central de APIs para la APP DEL EMPLEADO
 * Conecta con TODOS los endpoints reales del backend
 *
 * Multi-tenant: Incluye company_id en headers
 * Autenticación: JWT Bearer token
 *
 * Fecha: 2025-11-30
 * Versión: 1.0.0
 */

import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart' as http_parser;
import 'package:shared_preferences/shared_preferences.dart';

/// 📦 Respuesta genérica de API
class ApiResponse<T> {
  final bool success;
  final T? data;
  final String? error;
  final int statusCode;

  ApiResponse({
    required this.success,
    this.data,
    this.error,
    required this.statusCode,
  });

  bool get isSuccess => success && statusCode >= 200 && statusCode < 300;
}

/// 🌐 EMPLOYEE API SERVICE
class EmployeeApiService {
  static final EmployeeApiService _instance = EmployeeApiService._internal();
  factory EmployeeApiService() => _instance;
  EmployeeApiService._internal();

  String? _serverUrl;
  String? _authToken;
  String? _companyId;
  String? _userId;

  // Getters
  String? get userId => _userId;
  String? get companyId => _companyId;
  bool get isConfigured => _serverUrl != null && _authToken != null;

  /// 🚀 Inicializar servicio
  Future<void> initialize() async {
    final prefs = await SharedPreferences.getInstance();

    _authToken = prefs.getString('auth_token');
    _companyId = prefs.getString('config_company_id');
    _userId = prefs.getString('user_id');

    final serverIp = prefs.getString('config_server_ip') ?? '';
    final serverPort = prefs.getString('config_server_port') ?? '';
    final useHttps = prefs.getBool('config_use_https') ?? false;

    if (serverIp.isNotEmpty) {
      final protocol = useHttps ? 'https' : 'http';
      _serverUrl = serverPort.isNotEmpty
          ? '$protocol://$serverIp:$serverPort'
          : '$protocol://$serverIp';
    }

    debugPrint('🌐 [API] Inicializado: $_serverUrl | User: $_userId | Company: $_companyId');
  }

  /// 🔄 Actualizar credenciales
  Future<void> updateCredentials({
    String? authToken,
    String? userId,
    String? companyId,
  }) async {
    if (authToken != null) _authToken = authToken;
    if (userId != null) _userId = userId;
    if (companyId != null) _companyId = companyId;

    final prefs = await SharedPreferences.getInstance();
    if (authToken != null) await prefs.setString('auth_token', authToken);
    if (userId != null) await prefs.setString('user_id', userId);
    if (companyId != null) await prefs.setString('config_company_id', companyId);
  }

  /// 📡 Headers comunes
  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        if (_authToken != null) 'Authorization': 'Bearer $_authToken',
        if (_companyId != null) 'X-Company-Id': _companyId!,
      };

  /// 🔵 GET request
  Future<ApiResponse<dynamic>> get(String endpoint, {Map<String, String>? queryParams}) async {
    try {
      var uri = Uri.parse('$_serverUrl$endpoint');
      if (queryParams != null && queryParams.isNotEmpty) {
        uri = uri.replace(queryParameters: queryParams);
      }

      debugPrint('🔵 GET: $uri');
      final response = await http.get(uri, headers: _headers).timeout(const Duration(seconds: 30));

      return _handleResponse(response);
    } catch (e) {
      debugPrint('❌ GET Error: $e');
      return ApiResponse(success: false, error: e.toString(), statusCode: 0);
    }
  }

  /// 🟢 POST request
  Future<ApiResponse<dynamic>> post(String endpoint, Map<String, dynamic> body) async {
    try {
      final uri = Uri.parse('$_serverUrl$endpoint');
      debugPrint('🟢 POST: $uri');

      final response = await http
          .post(uri, headers: _headers, body: jsonEncode(body))
          .timeout(const Duration(seconds: 30));

      return _handleResponse(response);
    } catch (e) {
      debugPrint('❌ POST Error: $e');
      return ApiResponse(success: false, error: e.toString(), statusCode: 0);
    }
  }

  /// 🟡 PUT request
  Future<ApiResponse<dynamic>> put(String endpoint, Map<String, dynamic> body) async {
    try {
      final uri = Uri.parse('$_serverUrl$endpoint');
      debugPrint('🟡 PUT: $uri');

      final response = await http
          .put(uri, headers: _headers, body: jsonEncode(body))
          .timeout(const Duration(seconds: 30));

      return _handleResponse(response);
    } catch (e) {
      debugPrint('❌ PUT Error: $e');
      return ApiResponse(success: false, error: e.toString(), statusCode: 0);
    }
  }

  /// 🔴 DELETE request
  Future<ApiResponse<dynamic>> delete(String endpoint) async {
    try {
      final uri = Uri.parse('$_serverUrl$endpoint');
      debugPrint('🔴 DELETE: $uri');

      final response = await http.delete(uri, headers: _headers).timeout(const Duration(seconds: 30));

      return _handleResponse(response);
    } catch (e) {
      debugPrint('❌ DELETE Error: $e');
      return ApiResponse(success: false, error: e.toString(), statusCode: 0);
    }
  }

  /// 📤 Upload file
  Future<ApiResponse<dynamic>> uploadFile(String endpoint, File file, String fieldName) async {
    try {
      final uri = Uri.parse('$_serverUrl$endpoint');
      debugPrint('📤 UPLOAD: $uri');

      final request = http.MultipartRequest('POST', uri);
      request.headers.addAll(_headers);
      request.headers.remove('Content-Type'); // Multipart sets its own

      final bytes = await file.readAsBytes();
      final extension = file.path.split('.').last.toLowerCase();
      final mimeType = _getMimeType(extension);

      request.files.add(http.MultipartFile.fromBytes(
        fieldName,
        bytes,
        filename: 'upload.$extension',
        contentType: http_parser.MediaType.parse(mimeType),
      ));

      final streamedResponse = await request.send().timeout(const Duration(seconds: 60));
      final response = await http.Response.fromStream(streamedResponse);

      return _handleResponse(response);
    } catch (e) {
      debugPrint('❌ UPLOAD Error: $e');
      return ApiResponse(success: false, error: e.toString(), statusCode: 0);
    }
  }

  /// 📥 Download file
  Future<List<int>?> downloadFile(String endpoint) async {
    try {
      final uri = Uri.parse('$_serverUrl$endpoint');
      debugPrint('📥 DOWNLOAD: $uri');

      final response = await http.get(uri, headers: _headers).timeout(const Duration(seconds: 60));

      if (response.statusCode == 200) {
        return response.bodyBytes;
      }
      return null;
    } catch (e) {
      debugPrint('❌ DOWNLOAD Error: $e');
      return null;
    }
  }

  /// 🔄 Handle response
  ApiResponse<dynamic> _handleResponse(http.Response response) {
    try {
      final body = response.body.isNotEmpty ? jsonDecode(response.body) : null;

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return ApiResponse(
          success: true,
          data: body,
          statusCode: response.statusCode,
        );
      } else {
        final errorMsg = body?['message'] ?? body?['error'] ?? 'Error ${response.statusCode}';
        return ApiResponse(
          success: false,
          error: errorMsg,
          statusCode: response.statusCode,
          data: body,
        );
      }
    } catch (e) {
      return ApiResponse(
        success: false,
        error: 'Error parsing response: $e',
        statusCode: response.statusCode,
      );
    }
  }

  String _getMimeType(String extension) {
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'pdf':
        return 'application/pdf';
      default:
        return 'application/octet-stream';
    }
  }

  // ========================================
  // 👤 PERFIL DE USUARIO
  // ========================================

  /// Obtener perfil completo del usuario
  Future<ApiResponse<dynamic>> getMyProfile() async {
    return get('/api/v1/users/$_userId');
  }

  /// Solicitar cambio de datos (no editar directo)
  Future<ApiResponse<dynamic>> requestProfileChange(Map<String, dynamic> changes) async {
    return post('/api/v1/users/$_userId/change-requests', {
      'requested_changes': changes,
      'reason': changes['reason'] ?? 'Actualización de datos personales',
    });
  }

  /// Actualizar foto de perfil
  Future<ApiResponse<dynamic>> uploadProfilePhoto(File photo) async {
    return uploadFile('/api/v1/users/$_userId/upload-photo', photo, 'photo');
  }

  // ========================================
  // 📄 DOCUMENTOS VENCIBLES
  // ========================================

  /// Obtener todos los documentos del usuario
  Future<ApiResponse<dynamic>> getMyDocuments() async {
    return get('/api/v1/users/$_userId/documents');
  }

  /// Obtener documentos próximos a vencer
  Future<ApiResponse<dynamic>> getExpiringDocuments({int daysAhead = 30}) async {
    return get('/api/v1/users/$_userId/documents', queryParams: {
      'expiring_within': daysAhead.toString(),
    });
  }

  /// Subir documento
  Future<ApiResponse<dynamic>> uploadDocument(File file, Map<String, dynamic> metadata) async {
    try {
      final uri = Uri.parse('$_serverUrl/api/v1/users/$_userId/documents');
      final request = http.MultipartRequest('POST', uri);
      request.headers.addAll(_headers);
      request.headers.remove('Content-Type');

      // Agregar archivo
      final bytes = await file.readAsBytes();
      request.files.add(http.MultipartFile.fromBytes(
        'document',
        bytes,
        filename: metadata['filename'] ?? 'document.pdf',
      ));

      // Agregar metadata
      metadata.forEach((key, value) {
        if (value != null) request.fields[key] = value.toString();
      });

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);
      return _handleResponse(response);
    } catch (e) {
      return ApiResponse(success: false, error: e.toString(), statusCode: 0);
    }
  }

  // ========================================
  // 🔐 BIOMETRÍA
  // ========================================

  /// Obtener estado del registro biométrico
  Future<ApiResponse<dynamic>> getBiometricStatus() async {
    return get('/api/v2/biometric/status');
  }

  /// Obtener consentimiento biométrico
  Future<ApiResponse<dynamic>> getBiometricConsent() async {
    return get('/api/v2/biometric/consent');
  }

  /// Dar consentimiento biométrico
  Future<ApiResponse<dynamic>> giveBiometricConsent() async {
    return post('/api/v2/biometric/consent', {
      'consent_given': true,
      'legal_agreement_accepted': true,
      'gdpr_compliant': true,
    });
  }

  /// Capturar template biométrico
  Future<ApiResponse<dynamic>> captureBiometric(File photo) async {
    return uploadFile('/api/v2/biometric/capture', photo, 'biometricImage');
  }

  // ========================================
  // 💰 LIQUIDACIONES Y SALARIO
  // ========================================

  /// Obtener configuración salarial
  Future<ApiResponse<dynamic>> getMySalaryConfig() async {
    return get('/api/v1/users/$_userId/salary-config');
  }

  /// Obtener liquidaciones (recibos de sueldo)
  Future<ApiResponse<dynamic>> getMyPayslips({int? year, int? month}) async {
    final params = <String, String>{};
    if (year != null) params['year'] = year.toString();
    if (month != null) params['month'] = month.toString();
    return get('/api/v1/payroll/liquidations/employee/$_userId', queryParams: params);
  }

  /// Descargar recibo de sueldo PDF
  Future<List<int>?> downloadPayslipPdf(String liquidationId) async {
    return downloadFile('/api/v1/payroll/liquidations/$liquidationId/pdf');
  }

  // ========================================
  // 📋 ASISTENCIA
  // ========================================

  /// Obtener asistencias del usuario
  Future<ApiResponse<dynamic>> getMyAttendance({DateTime? startDate, DateTime? endDate}) async {
    final params = <String, String>{};
    if (startDate != null) params['start_date'] = startDate.toIso8601String().split('T')[0];
    if (endDate != null) params['end_date'] = endDate.toIso8601String().split('T')[0];
    return get('/api/v1/attendance', queryParams: params);
  }

  /// Obtener asistencia de hoy
  Future<ApiResponse<dynamic>> getTodayAttendance() async {
    return get('/api/v1/attendance/today');
  }

  /// Check-in
  Future<ApiResponse<dynamic>> checkIn({
    required String method,
    String? biometricType,
    double? latitude,
    double? longitude,
    String? notes,
  }) async {
    return post('/api/v1/attendance/checkin', {
      'method': method,
      if (biometricType != null) 'biometricType': biometricType,
      if (latitude != null && longitude != null)
        'location': {'latitude': latitude, 'longitude': longitude},
      if (notes != null) 'notes': notes,
    });
  }

  /// Check-out
  Future<ApiResponse<dynamic>> checkOut({String? notes}) async {
    return post('/api/v1/attendance/checkout', {
      if (notes != null) 'notes': notes,
    });
  }

  /// Análisis de asistencia
  Future<ApiResponse<dynamic>> getAttendanceAnalytics() async {
    return get('/api/attendance-analytics/employee/$_userId');
  }

  // ========================================
  // ⚖️ SANCIONES
  // ========================================

  /// Obtener mis sanciones
  Future<ApiResponse<dynamic>> getMySanctions() async {
    return get('/api/v1/sanctions', queryParams: {'user_id': _userId!});
  }

  /// Obtener detalle de sanción
  Future<ApiResponse<dynamic>> getSanctionDetail(String sanctionId) async {
    return get('/api/v1/sanctions/$sanctionId');
  }

  // ========================================
  // 🏖️ VACACIONES
  // ========================================

  /// Obtener configuración de vacaciones de la empresa
  Future<ApiResponse<dynamic>> getVacationConfig() async {
    return get('/api/v1/vacation/config');
  }

  /// Obtener mis solicitudes de vacaciones
  Future<ApiResponse<dynamic>> getMyVacationRequests() async {
    return get('/api/v1/vacation/requests', queryParams: {'user_id': _userId!});
  }

  /// Obtener balance de días de vacaciones
  Future<ApiResponse<dynamic>> getVacationBalance() async {
    return get('/api/v1/vacation/balance/$_userId');
  }

  /// Solicitar vacaciones
  Future<ApiResponse<dynamic>> requestVacation({
    required DateTime startDate,
    required DateTime endDate,
    String? notes,
  }) async {
    return post('/api/v1/vacation/requests', {
      'user_id': _userId,
      'start_date': startDate.toIso8601String().split('T')[0],
      'end_date': endDate.toIso8601String().split('T')[0],
      if (notes != null) 'notes': notes,
    });
  }

  /// Cancelar solicitud de vacaciones
  Future<ApiResponse<dynamic>> cancelVacationRequest(String requestId) async {
    return delete('/api/v1/vacation/requests/$requestId');
  }

  // ========================================
  // 📚 CAPACITACIONES (Mobile API)
  // ========================================

  /// Obtener capacitaciones asignadas (Mobile API - REAL)
  Future<ApiResponse<dynamic>> getMyTrainings() async {
    // Usa la API Mobile que retorna datos reales
    return get('/api/v1/mobile/training/assigned');
  }

  /// Obtener detalle de capacitación
  Future<ApiResponse<dynamic>> getTrainingDetail(String trainingId) async {
    return get('/api/v1/trainings/$trainingId');
  }

  /// Obtener progreso de capacitación
  Future<ApiResponse<dynamic>> getTrainingProgress(String trainingId) async {
    return get('/api/v1/trainings/$trainingId/progress');
  }

  /// Actualizar progreso de capacitación
  Future<ApiResponse<dynamic>> updateTrainingProgress(
    String trainingId, {
    required int progressPercentage,
    int? score,
    String? status,
  }) async {
    return post('/api/v1/trainings/$trainingId/progress', {
      'progress_percentage': progressPercentage,
      if (score != null) 'score': score,
      if (status != null) 'status': status,
    });
  }

  /// Completar capacitación (Mobile API - REAL)
  Future<ApiResponse<dynamic>> completeTraining(String trainingId, {int? score}) async {
    return post('/api/v1/mobile/training/$trainingId/complete', {
      if (score != null) 'score': score,
    });
  }

  // ========================================
  // ✅ TAREAS ASIGNADAS
  // ========================================

  /// Obtener mis tareas asignadas
  Future<ApiResponse<dynamic>> getMyTasks() async {
    return get('/api/v1/users/$_userId/assigned-tasks');
  }

  /// Obtener detalle de tarea
  Future<ApiResponse<dynamic>> getTaskDetail(String taskId) async {
    return get('/api/v1/users/$_userId/assigned-tasks/$taskId');
  }

  /// Actualizar progreso de tarea
  Future<ApiResponse<dynamic>> updateTaskProgress(
    String taskId, {
    required String status,
    int? progress,
    String? notes,
  }) async {
    return put('/api/v1/users/$_userId/assigned-tasks/$taskId', {
      'status': status,
      if (progress != null) 'progress': progress,
      if (notes != null) 'notes': notes,
    });
  }

  // ========================================
  // 📝 PERMISOS Y SOLICITUDES (Mobile API)
  // ========================================

  /// Obtener mis solicitudes de permisos (Mobile API - REAL)
  Future<ApiResponse<dynamic>> getMyPermissions() async {
    return get('/api/v1/mobile/requests/my-requests');
  }

  /// Solicitar permiso (Mobile API - REAL)
  Future<ApiResponse<dynamic>> requestPermission({
    required String permissionType,
    required DateTime startDate,
    required DateTime endDate,
    required String reason,
    File? attachment,
  }) async {
    if (attachment != null) {
      // Con adjunto - usar endpoint multipart
      try {
        final uri = Uri.parse('$_serverUrl/api/v1/mobile/requests/permission');
        final request = http.MultipartRequest('POST', uri);
        request.headers.addAll(_headers);
        request.headers.remove('Content-Type');

        request.fields['type'] = permissionType;
        request.fields['startDate'] = startDate.toIso8601String().split('T')[0];
        request.fields['endDate'] = endDate.toIso8601String().split('T')[0];
        request.fields['reason'] = reason;
        request.fields['requiresApproval'] = 'true';

        final bytes = await attachment.readAsBytes();
        request.files.add(http.MultipartFile.fromBytes(
          'attachment',
          bytes,
          filename: 'adjunto.pdf',
        ));

        final streamedResponse = await request.send();
        final response = await http.Response.fromStream(streamedResponse);
        return _handleResponse(response);
      } catch (e) {
        return ApiResponse(success: false, error: e.toString(), statusCode: 0);
      }
    } else {
      // Sin adjunto - Mobile API estándar
      return post('/api/v1/mobile/requests/permission', {
        'type': permissionType,
        'startDate': startDate.toIso8601String().split('T')[0],
        'endDate': endDate.toIso8601String().split('T')[0],
        'reason': reason,
        'requiresApproval': true,
      });
    }
  }

  /// Cancelar solicitud de permiso
  Future<ApiResponse<dynamic>> cancelPermissionRequest(String permissionId) async {
    return delete('/api/v1/mobile/requests/$permissionId');
  }

  // ========================================
  // 🏥 INFORMACIÓN MÉDICA
  // ========================================

  /// Obtener información médica completa
  Future<ApiResponse<dynamic>> getMyMedicalInfo() async {
    return get('/api/v1/users/$_userId/medical');
  }

  /// Obtener alergias
  Future<ApiResponse<dynamic>> getMyAllergies() async {
    return get('/api/v1/users/$_userId/allergies');
  }

  /// Agregar alergia
  Future<ApiResponse<dynamic>> addAllergy(Map<String, dynamic> allergyData) async {
    return post('/api/v1/users/$_userId/allergies', allergyData);
  }

  /// Obtener medicamentos
  Future<ApiResponse<dynamic>> getMyMedications() async {
    return get('/api/v1/users/$_userId/medications');
  }

  /// Agregar medicamento
  Future<ApiResponse<dynamic>> addMedication(Map<String, dynamic> medicationData) async {
    return post('/api/v1/users/$_userId/medications', medicationData);
  }

  /// Obtener enfermedades crónicas
  Future<ApiResponse<dynamic>> getMyChronicConditions() async {
    return get('/api/v1/users/$_userId/chronic-conditions');
  }

  /// Obtener restricciones de trabajo
  Future<ApiResponse<dynamic>> getMyWorkRestrictions() async {
    return get('/api/v1/users/$_userId/work-restrictions');
  }

  /// Obtener vacunas
  Future<ApiResponse<dynamic>> getMyVaccinations() async {
    return get('/api/v1/users/$_userId/vaccinations');
  }

  /// Obtener exámenes médicos
  Future<ApiResponse<dynamic>> getMyMedicalExams() async {
    return get('/api/v1/users/$_userId/medical-exams');
  }

  // ========================================
  // 👨‍👩‍👧 INFORMACIÓN FAMILIAR
  // ========================================

  /// Obtener información familiar
  Future<ApiResponse<dynamic>> getMyFamilyInfo() async {
    return get('/api/v1/users/$_userId/family-members');
  }

  /// Obtener hijos
  Future<ApiResponse<dynamic>> getMyChildren() async {
    return get('/api/v1/users/$_userId/children');
  }

  /// Obtener contacto de emergencia
  Future<ApiResponse<dynamic>> getEmergencyContact() async {
    return get('/api/v1/users/$_userId/emergency-contact');
  }

  /// Actualizar contacto de emergencia
  Future<ApiResponse<dynamic>> updateEmergencyContact(Map<String, dynamic> contactData) async {
    return put('/api/v1/users/$_userId/emergency-contact', contactData);
  }

  // ========================================
  // 🎓 EDUCACIÓN E HISTORIAL
  // ========================================

  /// Obtener educación
  Future<ApiResponse<dynamic>> getMyEducation() async {
    return get('/api/v1/users/$_userId/education');
  }

  /// Obtener historial laboral
  Future<ApiResponse<dynamic>> getMyWorkHistory() async {
    return get('/api/v1/users/$_userId/work-history');
  }

  // ========================================
  // 📅 CALENDARIO Y TURNOS
  // ========================================

  /// Obtener mi turno asignado
  Future<ApiResponse<dynamic>> getMyShift() async {
    return get('/api/v1/shifts/user/$_userId');
  }

  /// Obtener calendario del mes
  Future<ApiResponse<dynamic>> getMyCalendar({int? year, int? month}) async {
    final now = DateTime.now();
    final y = year ?? now.year;
    final m = month ?? now.month;
    return get('/api/v1/calendar/user/$_userId', queryParams: {
      'year': y.toString(),
      'month': m.toString(),
    });
  }

  // ========================================
  // 🔔 NOTIFICACIONES (Mobile API)
  // ========================================

  /// Obtener notificaciones pendientes (Mobile API - REAL)
  Future<ApiResponse<dynamic>> getServerNotifications() async {
    return get('/api/v1/mobile/notifications');
  }

  /// Marcar notificación como leída
  Future<ApiResponse<dynamic>> markNotificationRead(String notificationId) async {
    return put('/api/v1/notifications/$notificationId/read', {});
  }

  // ========================================
  // 📊 DASHBOARD RESUMEN (Mobile API)
  // ========================================

  /// Obtener resumen del dashboard (Mobile API - REAL)
  /// Retorna: attendance, scoring, training, sanctions, medical
  Future<ApiResponse<dynamic>> getDashboardSummary() async {
    return get('/api/v1/mobile/dashboard/summary');
  }

  /// Health check del servidor mobile
  Future<ApiResponse<dynamic>> getMobileHealth() async {
    return get('/api/v1/mobile/health');
  }

  // ========================================
  // 🔐 BIOMETRIC (Mobile API)
  // ========================================

  /// Registrar rostro (Mobile API)
  Future<ApiResponse<dynamic>> registerFace(File faceImage) async {
    return uploadFile('/api/v1/mobile/biometric/face/register', faceImage, 'faceImage');
  }

  /// Verificar rostro (Mobile API)
  Future<ApiResponse<dynamic>> verifyFace(File faceImage) async {
    return uploadFile('/api/v1/mobile/biometric/face/verify', faceImage, 'faceImage');
  }

  /// Health check biométrico
  Future<ApiResponse<dynamic>> getBiometricHealth() async {
    return get('/api/v2/biometric-attendance/health');
  }

  /// Clock-in biométrico
  Future<ApiResponse<dynamic>> biometricClockIn({
    required File faceImage,
    double? latitude,
    double? longitude,
  }) async {
    try {
      final uri = Uri.parse('$_serverUrl/api/v2/biometric-attendance/clock-in');
      final request = http.MultipartRequest('POST', uri);
      request.headers.addAll(_headers);
      request.headers.remove('Content-Type');

      if (latitude != null) request.fields['latitude'] = latitude.toString();
      if (longitude != null) request.fields['longitude'] = longitude.toString();

      final bytes = await faceImage.readAsBytes();
      request.files.add(http.MultipartFile.fromBytes(
        'biometricImage',
        bytes,
        filename: 'face.jpg',
        contentType: http_parser.MediaType('image', 'jpeg'),
      ));

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);
      return _handleResponse(response);
    } catch (e) {
      return ApiResponse(success: false, error: e.toString(), statusCode: 0);
    }
  }

  /// Clock-out biométrico
  Future<ApiResponse<dynamic>> biometricClockOut({
    required File faceImage,
    double? latitude,
    double? longitude,
  }) async {
    try {
      final uri = Uri.parse('$_serverUrl/api/v2/biometric-attendance/clock-out');
      final request = http.MultipartRequest('POST', uri);
      request.headers.addAll(_headers);
      request.headers.remove('Content-Type');

      if (latitude != null) request.fields['latitude'] = latitude.toString();
      if (longitude != null) request.fields['longitude'] = longitude.toString();

      final bytes = await faceImage.readAsBytes();
      request.files.add(http.MultipartFile.fromBytes(
        'biometricImage',
        bytes,
        filename: 'face.jpg',
        contentType: http_parser.MediaType('image', 'jpeg'),
      ));

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);
      return _handleResponse(response);
    } catch (e) {
      return ApiResponse(success: false, error: e.toString(), statusCode: 0);
    }
  }

  // ====================================================================
  // PROCEDIMIENTOS - Manual de Procedimientos
  // ====================================================================

  /// Obtener procedimientos del empleado
  Future<ApiResponse<dynamic>> getMyProcedures() async {
    return get('/api/procedures/employee/my-procedures');
  }

  /// Obtener procedimientos pendientes de acuse
  Future<ApiResponse<dynamic>> getMyPendingProcedures() async {
    return get('/api/procedures/employee/my-pending');
  }

  /// Obtener resumen de procedimientos para Mi Espacio
  Future<ApiResponse<dynamic>> getMyProceduresSummary() async {
    return get('/api/procedures/employee/my-summary');
  }

  /// Registrar acuse de recibo de procedimiento
  Future<ApiResponse<dynamic>> acknowledgeProcedure(String procedureId, {String method = 'mobile_app'}) async {
    return post('/api/procedures/$procedureId/acknowledge', {'method': method});
  }

  /// Obtener detalle de un procedimiento
  Future<ApiResponse<dynamic>> getProcedure(String procedureId) async {
    return get('/api/procedures/$procedureId');
  }

  // ====================================================================
  // HSE - Seguridad e Higiene (EPP Compliance)
  // ====================================================================

  /// Obtener cumplimiento HSE del empleado
  Future<ApiResponse<dynamic>> getMyHseCompliance() async {
    final userId = await _getUserId();
    if (userId == null) {
      return ApiResponse(success: false, error: 'Usuario no identificado', statusCode: 0);
    }
    return get('/api/v1/hse/compliance/$userId');
  }

  /// Obtener entregas de EPP del empleado
  Future<ApiResponse<dynamic>> getMyEppDeliveries() async {
    final userId = await _getUserId();
    if (userId == null) {
      return ApiResponse(success: false, error: 'Usuario no identificado', statusCode: 0);
    }
    return get('/api/v1/hse/deliveries/employee/$userId');
  }

  /// Firmar recepción de EPP
  Future<ApiResponse<dynamic>> signEppDelivery(int deliveryId, {String signatureMethod = 'mobile_app'}) async {
    return post('/api/v1/hse/deliveries/$deliveryId/sign', {'signatureMethod': signatureMethod});
  }

  /// Obtener categorías de EPP
  Future<ApiResponse<dynamic>> getEppCategories() async {
    return get('/api/v1/hse/categories');
  }

  /// Obtener dashboard HSE
  Future<ApiResponse<dynamic>> getHseDashboard() async {
    return get('/api/v1/hse/dashboard');
  }

  /// Helper para obtener userId
  Future<String?> _getUserId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('user_id');
  }

  // ====================================================================
  // LEGAL - Comunicaciones e Información Legal
  // ====================================================================

  /// Obtener comunicaciones legales del empleado
  Future<ApiResponse<dynamic>> getMyLegalCommunications() async {
    final userId = await _getUserId();
    if (userId == null) {
      return ApiResponse(success: false, error: 'Usuario no identificado', statusCode: 0);
    }
    return get('/api/v1/legal/communications?employee_id=$userId');
  }

  /// Obtener expediente legal 360 del empleado
  Future<ApiResponse<dynamic>> getMyLegal360() async {
    final userId = await _getUserId();
    if (userId == null) {
      return ApiResponse(success: false, error: 'Usuario no identificado', statusCode: 0);
    }
    return get('/api/v1/legal/employee/$userId/legal-360');
  }

  /// Obtener jurisdicción legal de la empresa
  Future<ApiResponse<dynamic>> getLegalJurisdiction() async {
    return get('/api/v1/legal/jurisdiction');
  }

  /// Obtener detalle de comunicación legal
  Future<ApiResponse<dynamic>> getLegalCommunication(String communicationId) async {
    return get('/api/v1/legal/communications/$communicationId');
  }
}
