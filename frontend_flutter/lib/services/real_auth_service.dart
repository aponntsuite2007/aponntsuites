import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/app_config.dart';

class RealAuthService {
  static const String _baseUrl = 'http://10.168.100.5:9998/api/v1';
  static const String _tokenKey = 'auth_token';
  static const String _userKey = 'user_data';
  
  static SharedPreferences? _prefs;
  static String? _authToken;
  static Map<String, dynamic>? _currentUser;
  
  /// Initialize the service
  static Future<void> initialize() async {
    _prefs = await SharedPreferences.getInstance();
    _authToken = _prefs?.getString(_tokenKey);
    final userData = _prefs?.getString(_userKey);
    if (userData != null) {
      _currentUser = json.decode(userData);
    }
  }
  
  /// Login with email/employeeId and password
  static Future<Map<String, dynamic>> login({
    required String identifier, // email or employeeId
    required String password,
    String companySlug = 'aponnt-empresa-demo',
  }) async {
    try {
      print('🔐 [AUTH] Attempting login for: $identifier @ $companySlug');

      final response = await http.post(
        Uri.parse('$_baseUrl/auth/login'),
        headers: {
          'Content-Type': 'application/json',
        },
        body: json.encode({
          'identifier': identifier,
          'password': password,
          'companySlug': companySlug,
        }),
      );
      
      print('🔐 [AUTH] Response status: ${response.statusCode}');
      print('🔐 [AUTH] Response body: ${response.body}');
      
      final data = json.decode(response.body);
      
      if (response.statusCode == 200 && data['token'] != null) {
        // Save authentication data
        _authToken = data['token'];
        _currentUser = data['user'];
        
        await _prefs?.setString(_tokenKey, _authToken!);
        await _prefs?.setString(_userKey, json.encode(_currentUser!));
        
        print('✅ [AUTH] Login successful for user: ${_currentUser!['firstName']} ${_currentUser!['lastName']}');
        
        return {
          'success': true,
          'message': data['message'] ?? 'Login exitoso',
          'token': data['token'],
          'user': data['user'],
          'refreshToken': data['refreshToken'],
        };
      } else {
        print('❌ [AUTH] Login failed: ${data['error'] ?? 'Unknown error'}');
        return {
          'success': false,
          'error': data['error'] ?? 'Error de autenticación',
        };
      }
    } catch (e) {
      print('❌ [AUTH] Exception during login: $e');
      return {
        'success': false,
        'error': 'Error de conexión: $e',
      };
    }
  }
  
  /// Register facial biometric data
  static Future<Map<String, dynamic>> registerFacialBiometric({
    required String userId,
    required String faceEmbedding,
    double qualityScore = 85.0,
    double confidenceThreshold = 0.85,
    String algorithm = 'mlkit',
    String? deviceModel,
    String? appVersion,
    bool isPrimary = true,
    String? notes,
  }) async {
    try {
      if (_authToken == null) {
        return {'success': false, 'error': 'No hay token de autenticación'};
      }
      
      print('🎭 [BIOMETRIC] Registering facial biometric for user: $userId');
      
      final response = await http.post(
        Uri.parse('$_baseUrl/facial-biometric/register'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $_authToken',
        },
        body: json.encode({
          'userId': userId,
          'faceEmbedding': faceEmbedding,
          'qualityScore': qualityScore,
          'confidenceThreshold': confidenceThreshold,
          'algorithm': algorithm,
          'algorithmVersion': '1.0',
          'deviceModel': deviceModel,
          'appVersion': appVersion,
          'isPrimary': isPrimary,
          'notes': notes,
        }),
      );
      
      print('🎭 [BIOMETRIC] Response status: ${response.statusCode}');
      final data = json.decode(response.body);
      
      if (response.statusCode == 200 && data['success'] == true) {
        print('✅ [BIOMETRIC] Facial biometric registered successfully');
        return {
          'success': true,
          'message': data['message'],
          'data': data['data'],
        };
      } else {
        print('❌ [BIOMETRIC] Registration failed: ${data['error']}');
        return {
          'success': false,
          'error': data['error'] ?? 'Error registering biometric data',
        };
      }
    } catch (e) {
      print('❌ [BIOMETRIC] Exception: $e');
      return {
        'success': false,
        'error': 'Error de conexión: $e',
      };
    }
  }
  
  /// Verify facial biometric
  static Future<Map<String, dynamic>> verifyFacialBiometric({
    required String userId,
    required String faceEmbedding,
    double qualityScore = 85.0,
    String algorithm = 'mlkit',
  }) async {
    try {
      if (_authToken == null) {
        return {'success': false, 'error': 'No hay token de autenticación'};
      }
      
      print('🔍 [BIOMETRIC] Verifying facial biometric for user: $userId');
      
      final response = await http.post(
        Uri.parse('$_baseUrl/facial-biometric/verify'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $_authToken',
        },
        body: json.encode({
          'userId': userId,
          'faceEmbedding': faceEmbedding,
          'qualityScore': qualityScore,
          'algorithm': algorithm,
        }),
      );
      
      print('🔍 [BIOMETRIC] Response status: ${response.statusCode}');
      final data = json.decode(response.body);
      
      if (response.statusCode == 200 && data['success'] == true) {
        print('✅ [BIOMETRIC] Verification result: ${data['verified']}');
        return {
          'success': true,
          'verified': data['verified'],
          'message': data['message'],
          'data': data['data'],
        };
      } else {
        print('❌ [BIOMETRIC] Verification failed: ${data['error']}');
        return {
          'success': false,
          'error': data['error'] ?? 'Error verifying biometric data',
        };
      }
    } catch (e) {
      print('❌ [BIOMETRIC] Exception: $e');
      return {
        'success': false,
        'error': 'Error de conexión: $e',
      };
    }
  }
  
  /// Get current user data
  static Map<String, dynamic>? get currentUser => _currentUser;
  
  /// Get current auth token
  static String? get authToken => _authToken;
  
  /// Check if user is authenticated
  static bool get isAuthenticated => _authToken != null && _currentUser != null;
  
  /// Logout
  static Future<void> logout() async {
    _authToken = null;
    _currentUser = null;
    await _prefs?.remove(_tokenKey);
    await _prefs?.remove(_userKey);
    print('🔓 [AUTH] User logged out');
  }
  
  /// Get users list (for admins)
  static Future<Map<String, dynamic>> getUsers() async {
    try {
      if (_authToken == null) {
        return {'success': false, 'error': 'No hay token de autenticación'};
      }
      
      print('👥 [API] Getting users list');
      
      final response = await http.get(
        Uri.parse('$_baseUrl/users'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $_authToken',
        },
      );
      
      print('👥 [API] Response status: ${response.statusCode}');
      final data = json.decode(response.body);
      
      if (response.statusCode == 200) {
        return {
          'success': true,
          'users': data['users'] ?? data,
        };
      } else {
        return {
          'success': false,
          'error': data['error'] ?? 'Error getting users',
        };
      }
    } catch (e) {
      print('❌ [API] Exception: $e');
      return {
        'success': false,
        'error': 'Error de conexión: $e',
      };
    }
  }
  
  /// Report location (for employee tracking)
  static Future<Map<String, dynamic>> reportLocation({
    required double latitude,
    required double longitude,
    double? accuracy,
    bool isWorkingHours = true,
    bool isOnBreak = false,
    String currentActivity = 'working',
    int? batteryLevel,
    String connectionType = 'unknown',
    String? address,
  }) async {
    try {
      if (_authToken == null) {
        return {'success': false, 'error': 'No hay token de autenticación'};
      }
      
      print('📍 [LOCATION] Reporting location: $latitude, $longitude');
      
      final response = await http.post(
        Uri.parse('$_baseUrl/location/report'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $_authToken',
        },
        body: json.encode({
          'latitude': latitude,
          'longitude': longitude,
          'accuracy': accuracy,
          'isWorkingHours': isWorkingHours,
          'isOnBreak': isOnBreak,
          'currentActivity': currentActivity,
          'batteryLevel': batteryLevel,
          'connectionType': connectionType,
          'address': address,
        }),
      );
      
      print('📍 [LOCATION] Response status: ${response.statusCode}');
      final data = json.decode(response.body);
      
      if (response.statusCode == 200 && data['success'] == true) {
        print('✅ [LOCATION] Location reported successfully');
        return {
          'success': true,
          'message': data['message'],
          'data': data['data'],
        };
      } else {
        print('❌ [LOCATION] Report failed: ${data['error']}');
        return {
          'success': false,
          'error': data['error'] ?? 'Error reporting location',
        };
      }
    } catch (e) {
      print('❌ [LOCATION] Exception: $e');
      return {
        'success': false,
        'error': 'Error de conexión: $e',
      };
    }
  }
  
  /// Update server base URL (for network configuration)
  static void updateBaseUrl(String newBaseUrl) {
    // This would be used to dynamically change server IP
    print('🔧 [CONFIG] Base URL updated to: $newBaseUrl');
    // Note: In a real implementation, you might want to update a global configuration
  }
}