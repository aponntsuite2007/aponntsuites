import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:local_auth/local_auth.dart';
import 'dart:convert';

import '../services/api_service.dart';
import '../services/biometric_service.dart';
import '../models/user.dart';
import '../config/app_config.dart';

class EnhancedAuthProvider extends ChangeNotifier {
  final ApiService _apiService;
  final SharedPreferences _prefs;
  final LocalAuthentication _localAuth = LocalAuthentication();
  final BiometricService _biometricService = BiometricService();
  
  User? _currentUser;
  bool _isAuthenticated = false;
  bool _isBiometricSetup = false;
  bool _isLoading = false;
  String? _error;
  
  // Nueva funcionalidad: autenticación única por sesión
  bool _hasAuthenticatedThisSession = false;
  DateTime? _lastAuthTime;
  
  EnhancedAuthProvider(this._apiService, this._prefs) {
    _loadStoredAuth();
    _checkBiometricSetup();
  }
  
  // Getters
  User? get currentUser => _currentUser;
  bool get isAuthenticated => _isAuthenticated;
  bool get isBiometricSetup => _isBiometricSetup;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isAdmin => _currentUser?.role == 'admin';
  bool get isSupervisor => _currentUser?.role == 'supervisor' || isAdmin;
  bool get isEmployee => _currentUser?.role == 'employee';
  bool get isMedicalStaff => _currentUser?.role == 'medical' || isAdmin;
  bool get hasAuthenticatedThisSession => _hasAuthenticatedThisSession;
  
  /// Cargar autenticación almacenada
  Future<void> _loadStoredAuth() async {
    try {
      final token = _prefs.getString(StorageKeys.token);
      final userJson = _prefs.getString(StorageKeys.user);
      final lastAuthString = _prefs.getString('last_auth_time');
      
      if (token != null && userJson != null) {
        final userData = jsonDecode(userJson);
        _currentUser = User.fromJson(userData);
        _isAuthenticated = true;
        await _apiService.setToken(token);
        
        // Verificar si ya se autenticó en esta sesión (último 8 horas)
        if (lastAuthString != null) {
          _lastAuthTime = DateTime.parse(lastAuthString);
          final hoursSinceLastAuth = DateTime.now().difference(_lastAuthTime!).inHours;
          if (hoursSinceLastAuth < 8) {
            _hasAuthenticatedThisSession = true;
          }
        }
        
        // Solo verificar token si no se ha autenticado en esta sesión
        if (!_hasAuthenticatedThisSession) {
          await refreshUserData();
        }
      }
    } catch (e) {
      print('Error loading stored auth: \$e');
      await clearAuth();
    }
    notifyListeners();
  }
  
  /// Verificar si hay biometría configurada
  Future<void> _checkBiometricSetup() async {
    try {
      final isAvailable = await _localAuth.canCheckBiometrics;
      final isDeviceSupported = await _localAuth.isDeviceSupported();
      final availableBiometrics = await _localAuth.getAvailableBiometrics();
      
      _isBiometricSetup = isAvailable && 
                         isDeviceSupported && 
                         availableBiometrics.isNotEmpty;
    } catch (e) {
      print('Error checking biometric setup: \$e');
      _isBiometricSetup = false;
    }
    notifyListeners();
  }
  
  /// Autenticación principal - SE EJECUTA UNA SOLA VEZ POR SESIÓN
  Future<bool> performSessionAuthentication() async {
    if (_hasAuthenticatedThisSession) {
      return true; // Ya autenticado en esta sesión
    }
    
    _setLoading(true);
    _clearError();
    
    try {
      bool authSuccess = false;
      
      // 1. Intentar autenticación biométrica primero si está disponible
      if (_isBiometricSetup) {
        authSuccess = await _attemptBiometricAuth();
      }
      
      // 2. Si no hay biometría o falló, mostrar opciones de login
      if (!authSuccess) {
        _setLoading(false);
        return false; // Redirigir a pantalla de login manual
      }
      
      // 3. Marcar como autenticado para esta sesión
      _hasAuthenticatedThisSession = true;
      _lastAuthTime = DateTime.now();
      await _prefs.setString('last_auth_time', _lastAuthTime!.toIso8601String());
      
      _setLoading(false);
      return true;
      
    } catch (e) {
      _setError('Error en autenticación: \$e');
      _setLoading(false);
      return false;
    }
  }
  
  /// Intento de autenticación biométrica
  Future<bool> _attemptBiometricAuth() async {
    try {
      final bool isAuthenticated = await _localAuth.authenticate(
        localizedReason: 'Verifica tu identidad para acceder a la aplicación',
        options: AuthenticationOptions(
          biometricOnly: false, // Permitir PIN como backup
          stickyAuth: true,
        ),
      );
      
      if (isAuthenticated && _currentUser != null) {
        // Si ya tenemos usuario guardado y la biometría es exitosa
        return true;
      }
      
      return false;
    } catch (e) {
      print('Error in biometric authentication: \$e');
      return false;
    }
  }
  
  /// Login manual con credenciales
  Future<bool> loginWithCredentials(String identifier, String password) async {
    _setLoading(true);
    _clearError();
    
    try {
      final response = await _apiService.login(identifier, password);
      
      if (response.isSuccess && response.data != null) {
        final data = response.data!;
        
        // Guardar token
        final token = data['token'] as String;
        await _apiService.setToken(token);
        await _prefs.setString(StorageKeys.token, token);
        
        // Guardar refresh token si existe
        final refreshToken = data['refreshToken'] as String?;
        if (refreshToken != null) {
          await _prefs.setString(StorageKeys.refreshToken, refreshToken);
        }
        
        // Guardar datos del usuario
        final userData = data['user'] as Map<String, dynamic>;
        _currentUser = User.fromJson(userData);
        await _prefs.setString(StorageKeys.user, jsonEncode(userData));
        
        _isAuthenticated = true;
        _hasAuthenticatedThisSession = true;
        _lastAuthTime = DateTime.now();
        await _prefs.setString('last_auth_time', _lastAuthTime!.toIso8601String());
        
        _setLoading(false);
        notifyListeners();
        return true;
      } else {
        _setError(response.error ?? 'Error de autenticación');
        _setLoading(false);
        return false;
      }
    } catch (e) {
      _setError('Error inesperado: \$e');
      _setLoading(false);
      return false;
    }
  }
  
  /// Login con PIN específico
  Future<bool> loginWithPIN(String pin) async {
    _setLoading(true);
    _clearError();
    
    try {
      final response = await _apiService.pinLogin(pin);
      
      if (response.isSuccess && response.data != null) {
        final data = response.data!;
        
        // Guardar token
        final token = data['token'] as String;
        await _apiService.setToken(token);
        await _prefs.setString(StorageKeys.token, token);
        
        // Guardar datos del usuario
        final userData = data['user'] as Map<String, dynamic>;
        _currentUser = User.fromJson(userData);
        await _prefs.setString(StorageKeys.user, jsonEncode(userData));
        
        _isAuthenticated = true;
        _hasAuthenticatedThisSession = true;
        _lastAuthTime = DateTime.now();
        await _prefs.setString('last_auth_time', _lastAuthTime!.toIso8601String());
        
        _setLoading(false);
        notifyListeners();
        return true;
      } else {
        _setError(response.error ?? 'PIN incorrecto');
        _setLoading(false);
        return false;
      }
    } catch (e) {
      _setError('Error inesperado: \$e');
      _setLoading(false);
      return false;
    }
  }
  
  /// Login biométrico con template
  Future<bool> biometricLogin(String template, String type, {String? userId}) async {
    _setLoading(true);
    _clearError();
    
    try {
      final response = await _apiService.biometricLogin(template, type, userId: userId);
      
      if (response.isSuccess && response.data != null) {
        final data = response.data!;
        
        // Guardar token
        final token = data['token'] as String;
        await _apiService.setToken(token);
        await _prefs.setString(StorageKeys.token, token);
        
        // Guardar datos del usuario
        final userData = data['user'] as Map<String, dynamic>;
        _currentUser = User.fromJson(userData);
        await _prefs.setString(StorageKeys.user, jsonEncode(userData));
        
        _isAuthenticated = true;
        _hasAuthenticatedThisSession = true;
        _lastAuthTime = DateTime.now();
        await _prefs.setString('last_auth_time', _lastAuthTime!.toIso8601String());
        
        _setLoading(false);
        notifyListeners();
        return true;
      } else {
        _setError(response.error ?? 'Error en autenticación biométrica');
        _setLoading(false);
        return false;
      }
    } catch (e) {
      _setError('Error inesperado: \$e');
      _setLoading(false);
      return false;
    }
  }
  
  /// Cerrar sesión
  Future<void> logout() async {
    _setLoading(true);
    
    try {
      await _apiService.logout();
    } catch (e) {
      print('Error during logout: \$e');
    } finally {
      await clearAuth();
      _setLoading(false);
    }
  }
  
  /// Limpiar datos de autenticación
  Future<void> clearAuth() async {
    _currentUser = null;
    _isAuthenticated = false;
    _hasAuthenticatedThisSession = false;
    _lastAuthTime = null;
    
    await _apiService.clearToken();
    await _prefs.remove(StorageKeys.token);
    await _prefs.remove(StorageKeys.refreshToken);
    await _prefs.remove(StorageKeys.user);
    await _prefs.remove('last_auth_time');
    notifyListeners();
  }
  
  /// Verificar si necesita re-autenticación
  bool needsReAuthentication() {
    if (!_isAuthenticated) return true;
    if (!_hasAuthenticatedThisSession) return true;
    
    // Re-autenticar después de 8 horas
    if (_lastAuthTime != null) {
      final hoursSinceAuth = DateTime.now().difference(_lastAuthTime!).inHours;
      if (hoursSinceAuth > 8) {
        _hasAuthenticatedThisSession = false;
        return true;
      }
    }
    
    return false;
  }
  
  /// Refrescar datos del usuario
  Future<void> refreshUserData() async {
    if (!_isAuthenticated) return;
    
    try {
      final response = await _apiService.getCurrentUser();
      
      if (response.isSuccess && response.data != null) {
        _currentUser = response.data!;
        await _prefs.setString(StorageKeys.user, jsonEncode(_currentUser!.toJson()));
        notifyListeners();
      } else if (response.error?.contains('401') == true) {
        // Token inválido o expirado
        await clearAuth();
      }
    } catch (e) {
      print('Error refreshing user data: \$e');
    }
  }
  
  /// Verificar permisos específicos
  bool hasPermission(String permission) {
    if (!_isAuthenticated || _currentUser == null) return false;
    
    switch (permission) {
      case 'admin':
        return _currentUser!.role == 'admin';
      case 'supervisor':
        return _currentUser!.role == 'supervisor' || _currentUser!.role == 'admin';
      case 'medical':
        return _currentUser!.role == 'medical' || _currentUser!.role == 'admin';
      case 'manage_users':
        return _currentUser!.role == 'admin' || _currentUser!.role == 'supervisor';
      case 'view_reports':
        return _currentUser!.role == 'admin' || _currentUser!.role == 'supervisor';
      case 'manage_attendance':
        return _currentUser!.role == 'admin' || _currentUser!.role == 'supervisor';
      case 'medical_certificates':
        return _currentUser!.role == 'medical' || _currentUser!.role == 'admin';
      case 'submit_medical_absence':
        return true; // Todos los usuarios pueden reportar ausencias médicas
      default:
        return false;
    }
  }
  
  // Helper methods
  void _setLoading(bool loading) {
    _isLoading = loading;
    if (loading) _error = null;
    notifyListeners();
  }
  
  void _setError(String error) {
    _error = error;
    _isLoading = false;
    notifyListeners();
  }
  
  void _clearError() {
    _error = null;
    notifyListeners();
  }
  
  @override
  void dispose() {
    super.dispose();
  }
}