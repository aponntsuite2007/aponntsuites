import 'dart:convert';
import 'dart:math';
import 'package:crypto/crypto.dart';
import 'package:encrypt/encrypt.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// 🛡️ Servicio de Seguridad Multi-Tenant
/// Garantiza blindaje total entre empresas con cifrado de nivel empresarial
class MultiTenantSecurityService {
  static const String _tenantIdKey = 'TENANT_ID';
  static const String _tenantKeyKey = 'TENANT_KEY';
  static const String _sessionKey = 'SESSION_TOKEN';
  static const String _biometricKeyKey = 'BIOMETRIC_KEY';

  late final Encrypter _encrypter;
  late final IV _iv;
  String? _currentTenantId;
  String? _tenantEncryptionKey;

  MultiTenantSecurityService() {
    _initializeSecurity();
  }

  /// 🔐 Inicializa el sistema de seguridad con cifrado AES-256
  void _initializeSecurity() {
    // Generar clave base para esta instalación
    final key = Key.fromSecureRandom(32); // AES-256
    _encrypter = Encrypter(AES(key));
    _iv = IV.fromSecureRandom(16);
  }

  /// 🏢 Establece el contexto de empresa (tenant) actual
  Future<bool> setTenantContext(String companyId, String companyKey) async {
    try {
      print('🛡️ [SECURITY] Estableciendo contexto de empresa: $companyId');

      // Validar que la empresa existe y el usuario tiene acceso
      if (!await _validateTenantAccess(companyId, companyKey)) {
        print('❌ [SECURITY] Acceso denegado para empresa: $companyId');
        return false;
      }

      _currentTenantId = companyId;
      _tenantEncryptionKey = _generateTenantKey(companyId, companyKey);

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_tenantIdKey, _encryptData(companyId));
      await prefs.setString(_tenantKeyKey, _encryptData(_tenantEncryptionKey!));

      print('✅ [SECURITY] Contexto de empresa establecido correctamente');
      return true;
    } catch (e) {
      print('❌ [SECURITY] Error estableciendo contexto: $e');
      return false;
    }
  }

  /// 🔍 Valida que el usuario tenga acceso a la empresa
  Future<bool> _validateTenantAccess(String companyId, String companyKey) async {
    // TODO: Implementar validación real contra la API
    // Por ahora simulamos validación básica
    return companyId.isNotEmpty && companyKey.isNotEmpty;
  }

  /// 🔑 Genera una clave única para cada empresa
  String _generateTenantKey(String companyId, String companyKey) {
    final data = '$companyId:$companyKey:${DateTime.now().millisecondsSinceEpoch}';
    final bytes = utf8.encode(data);
    final digest = sha256.convert(bytes);
    return digest.toString();
  }

  /// 🔒 Cifra datos específicos del tenant
  String encryptTenantData(String data) {
    if (_tenantEncryptionKey == null) {
      throw Exception('❌ [SECURITY] Contexto de empresa no establecido');
    }

    final tenantKey = Key.fromBase64(base64.encode(_tenantEncryptionKey!.codeUnits));
    final tenantEncrypter = Encrypter(AES(tenantKey));
    return tenantEncrypter.encrypt(data, iv: _iv).base64;
  }

  /// 🔓 Descifra datos específicos del tenant
  String decryptTenantData(String encryptedData) {
    if (_tenantEncryptionKey == null) {
      throw Exception('❌ [SECURITY] Contexto de empresa no establecido');
    }

    final tenantKey = Key.fromBase64(base64.encode(_tenantEncryptionKey!.codeUnits));
    final tenantEncrypter = Encrypter(AES(tenantKey));
    return tenantEncrypter.decrypt64(encryptedData, iv: _iv);
  }

  /// 🔒 Cifra datos generales
  String _encryptData(String data) {
    return _encrypter.encrypt(data, iv: _iv).base64;
  }

  /// 🔓 Descifra datos generales
  String _decryptData(String encryptedData) {
    return _encrypter.decrypt64(encryptedData, iv: _iv);
  }

  /// 🎯 Genera token QR con expiración de 15 segundos
  Future<String> generateQRToken(String employeeId) async {
    if (_currentTenantId == null) {
      throw Exception('❌ [SECURITY] Contexto de empresa requerido');
    }

    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final expiryTime = timestamp + 15000; // 15 segundos
    final random = Random().nextInt(999999);

    final tokenData = {
      'tenantId': _currentTenantId,
      'employeeId': employeeId,
      'timestamp': timestamp,
      'expiry': expiryTime,
      'nonce': random,
    };

    final tokenJson = json.encode(tokenData);
    return encryptTenantData(tokenJson);
  }

  /// ✅ Valida token QR considerando expiración
  Future<Map<String, dynamic>?> validateQRToken(String token) async {
    try {
      final decryptedJson = decryptTenantData(token);
      final tokenData = json.decode(decryptedJson) as Map<String, dynamic>;

      final currentTime = DateTime.now().millisecondsSinceEpoch;
      final expiryTime = tokenData['expiry'] as int;

      // Verificar expiración
      if (currentTime > expiryTime) {
        print('⏰ [SECURITY] Token QR expirado');
        return null;
      }

      // Verificar empresa
      if (tokenData['tenantId'] != _currentTenantId) {
        print('🚫 [SECURITY] Token QR de empresa diferente');
        return null;
      }

      print('✅ [SECURITY] Token QR válido');
      return tokenData;
    } catch (e) {
      print('❌ [SECURITY] Error validando token QR: $e');
      return null;
    }
  }

  /// 🗑️ Limpia datos de sesión (logout seguro)
  Future<void> clearTenantContext() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tenantIdKey);
    await prefs.remove(_tenantKeyKey);
    await prefs.remove(_sessionKey);
    await prefs.remove(_biometricKeyKey);

    _currentTenantId = null;
    _tenantEncryptionKey = null;

    print('🧹 [SECURITY] Contexto de empresa limpiado');
  }

  /// 🔐 Almacena datos biométricos cifrados por empresa
  Future<void> storeBiometricData(String employeeId, String biometricType, String data) async {
    if (_currentTenantId == null) {
      throw Exception('❌ [SECURITY] Contexto de empresa requerido');
    }

    final biometricKey = '$_currentTenantId:$employeeId:$biometricType';
    final encryptedData = encryptTenantData(data);

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('bio_$biometricKey', encryptedData);

    print('🔐 [SECURITY] Datos biométricos almacenados para $biometricType');
  }

  /// 🔍 Recupera datos biométricos cifrados
  Future<String?> getBiometricData(String employeeId, String biometricType) async {
    if (_currentTenantId == null) {
      throw Exception('❌ [SECURITY] Contexto de empresa requerido');
    }

    final biometricKey = '$_currentTenantId:$employeeId:$biometricType';
    final prefs = await SharedPreferences.getInstance();
    final encryptedData = prefs.getString('bio_$biometricKey');

    if (encryptedData == null) return null;

    try {
      return decryptTenantData(encryptedData);
    } catch (e) {
      print('❌ [SECURITY] Error descifrando datos biométricos: $e');
      return null;
    }
  }

  /// 🏢 Obtiene ID de empresa actual
  String? get currentTenantId => _currentTenantId;

  /// 🔍 Verifica si hay contexto de empresa establecido
  bool get hasTenantContext => _currentTenantId != null && _tenantEncryptionKey != null;

  /// 🛡️ Genera hash de seguridad para verificación de integridad
  String generateSecurityHash(String data) {
    final combined = '$data:$_currentTenantId:$_tenantEncryptionKey';
    final bytes = utf8.encode(combined);
    return sha256.convert(bytes).toString();
  }

  /// ✅ Verifica hash de seguridad
  bool verifySecurityHash(String data, String hash) {
    final expectedHash = generateSecurityHash(data);
    return expectedHash == hash;
  }
}