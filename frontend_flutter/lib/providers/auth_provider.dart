import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

import '../services/api_service.dart';
import '../models/user.dart';
import '../config/app_config.dart';

class AuthProvider extends ChangeNotifier {
  final ApiService _apiService;
  final SharedPreferences _prefs;
  
  User? _currentUser;
  bool _isAuthenticated = false;
  bool _isLoading = false;
  String? _error;
  
  AuthProvider(this._apiService, this._prefs) {
    _loadStoredAuth();
  }
  
  // Getters
  User? get currentUser => _currentUser;
  bool get isAuthenticated => _isAuthenticated;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isAdmin => _currentUser?.role == 'admin';
  bool get isSupervisor => _currentUser?.role == 'supervisor' || isAdmin;
  bool get isEmployee => _currentUser?.role == 'employee';
  
  /// Cargar autenticación almacenada
  Future<void> _loadStoredAuth() async {
    try {
      final token = _prefs.getString(StorageKeys.token);
      final userJson = _prefs.getString(StorageKeys.user);
      
      if (token != null && userJson != null) {
        final userData = jsonDecode(userJson);
        _currentUser = User.fromJson(userData);
        _isAuthenticated = true;
        await _apiService.setToken(token);
        
        // Verificar si el token es válido
        await refreshUserData();
      }
    } catch (e) {
      print('Error loading stored auth: $e');
      await clearAuth();
    }
    notifyListeners();
  }
  
  /// Login con email/legajo y contraseña
  Future<bool> login(String identifier, String password) async {
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
        _setLoading(false);
        notifyListeners();
        return true;
      } else {
        _setError(response.error ?? 'Error de autenticación');
        _setLoading(false);
        return false;
      }
    } catch (e) {
      _setError('Error inesperado: $e');
      _setLoading(false);
      return false;
    }
  }
  
  /// Login biométrico
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
        _setLoading(false);
        notifyListeners();
        return true;
      } else {
        _setError(response.error ?? 'Error en autenticación biométrica');
        _setLoading(false);
        return false;
      }
    } catch (e) {
      _setError('Error inesperado: $e');
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
      print('Error during logout: $e');
    } finally {
      await clearAuth();
      _setLoading(false);
    }
  }
  
  /// Limpiar datos de autenticación
  Future<void> clearAuth() async {
    _currentUser = null;
    _isAuthenticated = false;
    await _apiService.clearToken();
    await _prefs.remove(StorageKeys.token);
    await _prefs.remove(StorageKeys.refreshToken);
    await _prefs.remove(StorageKeys.user);
    notifyListeners();
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
      print('Error refreshing user data: $e');
    }
  }
  
  /// Actualizar datos del usuario local
  void updateUser(User updatedUser) {
    _currentUser = updatedUser;
    _prefs.setString(StorageKeys.user, jsonEncode(updatedUser.toJson()));
    notifyListeners();
  }
  
  /// Verificar si el usuario tiene permisos específicos
  bool hasPermission(String permission) {
    if (!_isAuthenticated || _currentUser == null) return false;
    
    switch (permission) {
      case 'admin':
        return _currentUser!.role == 'admin';
      case 'supervisor':
        return _currentUser!.role == 'supervisor' || _currentUser!.role == 'admin';
      case 'manage_users':
        return _currentUser!.role == 'admin' || _currentUser!.role == 'supervisor';
      case 'view_reports':
        return _currentUser!.role == 'admin' || _currentUser!.role == 'supervisor';
      case 'manage_attendance':
        return _currentUser!.role == 'admin' || _currentUser!.role == 'supervisor';
      default:
        return false;
    }
  }
  
  /// Verificar si puede ver datos de otro usuario
  bool canViewUser(String userId) {
    if (!_isAuthenticated || _currentUser == null) return false;
    
    // Admin y supervisores pueden ver todos los usuarios
    if (_currentUser!.role == 'admin' || _currentUser!.role == 'supervisor') {
      return true;
    }
    
    // Los empleados solo pueden ver sus propios datos
    return _currentUser!.id == userId;
  }
  
  /// Obtener saludo personalizado
  String getGreeting() {
    if (_currentUser == null) return 'Usuario';
    
    return '${_currentUser!.firstName}';
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