import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';
import '../config/app_config.dart';

class ConfigProvider extends ChangeNotifier {
  final ApiService _apiService;
  final SharedPreferences _prefs;
  
  // Configuración de la empresa
  String _companyName = 'Mi Empresa';
  String? _companyLogo;
  String _timezone = 'America/Argentina/Buenos_Aires';
  String _locale = 'es-AR';
  
  // Configuración de la app
  bool _isDarkMode = false;
  bool _biometricEnabled = true;
  bool _notificationsEnabled = true;
  bool _locationEnabled = true;
  bool _offlineMode = false;
  bool _remindersEnabled = true;
  bool _systemNotificationsEnabled = true;
  
  // Configuración biométrica
  bool _fingerprintEnabled = true;
  bool _faceRecognitionEnabled = true;
  int _maxFingerprints = 5;
  String _readerType = 'zkteco';
  
  bool _isLoading = false;
  String? _error;
  
  ConfigProvider(this._apiService, this._prefs) {
    _loadLocalConfig();
    _loadRemoteConfig();
  }
  
  // Getters
  String get companyName => _companyName;
  String? get companyLogo => _companyLogo;
  String get timezone => _timezone;
  String get locale => _locale;
  bool get isDarkMode => _isDarkMode;
  bool get biometricEnabled => _biometricEnabled;
  bool get notificationsEnabled => _notificationsEnabled;
  bool get locationEnabled => _locationEnabled;
  bool get offlineMode => _offlineMode;
  bool get fingerprintEnabled => _fingerprintEnabled;
  bool get faceRecognitionEnabled => _faceRecognitionEnabled;
  int get maxFingerprints => _maxFingerprints;
  String get readerType => _readerType;
  bool get remindersEnabled => _remindersEnabled;
  bool get systemNotificationsEnabled => _systemNotificationsEnabled;
  bool get isLoading => _isLoading;
  String? get error => _error;
  
  /// Cargar configuración local
  void _loadLocalConfig() {
    _isDarkMode = _prefs.getBool(StorageKeys.darkMode) ?? false;
    _biometricEnabled = _prefs.getBool(StorageKeys.biometricEnabled) ?? true;
    _notificationsEnabled = _prefs.getBool(StorageKeys.notifications) ?? true;
    _offlineMode = _prefs.getBool('offline_mode') ?? false;
    _locationEnabled = _prefs.getBool('location_enabled') ?? true;
    _remindersEnabled = _prefs.getBool('reminders_enabled') ?? true;
    _systemNotificationsEnabled = _prefs.getBool('system_notifications_enabled') ?? true;
    
    notifyListeners();
  }
  
  /// Cargar configuración remota
  Future<void> _loadRemoteConfig() async {
    _setLoading(true);
    
    try {
      // Cargar configuración de la empresa
      final companyResponse = await _apiService.getCompanyConfig();
      if (companyResponse.isSuccess && companyResponse.data != null) {
        final data = companyResponse.data!;
        _companyName = data['companyName'] ?? 'Mi Empresa';
        _companyLogo = data['companyLogo'];
        _timezone = data['timezone'] ?? 'America/Argentina/Buenos_Aires';
        _locale = data['locale'] ?? 'es-AR';
      }
      
      // Cargar configuración biométrica
      final biometricResponse = await _apiService.getBiometricConfig();
      if (biometricResponse.isSuccess && biometricResponse.data != null) {
        final data = biometricResponse.data!;
        _fingerprintEnabled = data['fingerprintEnabled'] ?? true;
        _faceRecognitionEnabled = data['faceRecognitionEnabled'] ?? true;
        _maxFingerprints = data['maxFingerprints'] ?? 5;
        _readerType = data['readerType'] ?? 'zkteco';
      }
      
      _clearError();
    } catch (e) {
      _setError('Error cargando configuración: $e');
    } finally {
      _setLoading(false);
    }
  }
  
  /// Cambiar modo oscuro
  Future<void> setDarkMode(bool enabled) async {
    _isDarkMode = enabled;
    await _prefs.setBool(StorageKeys.darkMode, enabled);
    notifyListeners();
  }
  
  /// Cambiar biometría habilitada
  Future<void> setBiometricEnabled(bool enabled) async {
    _biometricEnabled = enabled;
    await _prefs.setBool(StorageKeys.biometricEnabled, enabled);
    notifyListeners();
  }
  
  /// Cambiar notificaciones habilitadas
  Future<void> setNotificationsEnabled(bool enabled) async {
    _notificationsEnabled = enabled;
    await _prefs.setBool(StorageKeys.notifications, enabled);
    notifyListeners();
  }
  
  /// Cambiar ubicación habilitada
  Future<void> setLocationEnabled(bool enabled) async {
    _locationEnabled = enabled;
    await _prefs.setBool('location_enabled', enabled);
    notifyListeners();
  }
  
  /// Cambiar modo offline
  Future<void> setOfflineMode(bool enabled) async {
    _offlineMode = enabled;
    await _prefs.setBool('offline_mode', enabled);
    notifyListeners();
  }
  
  /// Cambiar idioma
  Future<void> setLanguage(String language) async {
    await _prefs.setString(StorageKeys.language, language);
    // Aquí se podría implementar el cambio de idioma
    notifyListeners();
  }
  
  /// Cambiar recordatorios habilitados
  Future<void> setRemindersEnabled(bool enabled) async {
    _remindersEnabled = enabled;
    await _prefs.setBool('reminders_enabled', enabled);
    notifyListeners();
  }
  
  /// Cambiar notificaciones de sistema habilitadas
  Future<void> setSystemNotificationsEnabled(bool enabled) async {
    _systemNotificationsEnabled = enabled;
    await _prefs.setBool('system_notifications_enabled', enabled);
    notifyListeners();
  }
  
  /// Refrescar configuración
  Future<void> refresh() async {
    await _loadRemoteConfig();
  }
  
  /// Obtener configuración completa como mapa
  Map<String, dynamic> getAllConfig() {
    return {
      'company': {
        'name': _companyName,
        'logo': _companyLogo,
        'timezone': _timezone,
        'locale': _locale,
      },
      'app': {
        'darkMode': _isDarkMode,
        'biometricEnabled': _biometricEnabled,
        'notificationsEnabled': _notificationsEnabled,
        'locationEnabled': _locationEnabled,
        'offlineMode': _offlineMode,
      },
      'biometric': {
        'fingerprintEnabled': _fingerprintEnabled,
        'faceRecognitionEnabled': _faceRecognitionEnabled,
        'maxFingerprints': _maxFingerprints,
        'readerType': _readerType,
      },
    };
  }
  
  /// Resetear configuración a valores por defecto
  Future<void> resetToDefaults() async {
    _isDarkMode = false;
    _biometricEnabled = true;
    _notificationsEnabled = true;
    _locationEnabled = true;
    _offlineMode = false;
    
    await _prefs.setBool(StorageKeys.darkMode, false);
    await _prefs.setBool(StorageKeys.biometricEnabled, true);
    await _prefs.setBool(StorageKeys.notifications, true);
    await _prefs.setBool('location_enabled', true);
    await _prefs.setBool('offline_mode', false);
    
    notifyListeners();
  }
  
  /// Validar configuración
  bool validateConfig() {
    if (_companyName.isEmpty) return false;
    if (_timezone.isEmpty) return false;
    if (_locale.isEmpty) return false;
    if (_maxFingerprints < 1 || _maxFingerprints > 10) return false;
    
    return true;
  }
  
  /// Obtener configuración de tema basada en el modo oscuro
  Map<String, dynamic> getThemeConfig() {
    return {
      'isDark': _isDarkMode,
      'primaryColor': '#1976D2',
      'accentColor': '#4CAF50',
    };
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