import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import 'package:path_provider/path_provider.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart' as http_parser;
import 'package:encrypt/encrypt.dart' as encrypt;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// 💾 OFFLINE QUEUE SERVICE v2.0
/// ==============================
/// Gestiona cola de registros de asistencia cuando no hay conexión.
/// - Almacena fotos + timestamps en SQLite local
/// - Monitorea conectividad
/// - Sincroniza automáticamente vía /verify-real cuando hay red
/// - Reconocimiento diferido: el backend identifica la persona por la foto
/// - Máximo 500 registros para evitar uso excesivo de disco
/// - Limpieza automática de registros sincronizados (+7 días)
class OfflineQueueService {
  static final OfflineQueueService _instance = OfflineQueueService._internal();
  factory OfflineQueueService() => _instance;
  OfflineQueueService._internal();

  Database? _database;
  bool _isInitialized = false;
  Timer? _syncTimer;
  Timer? _connectivityTimer;
  bool _isSyncing = false;
  bool _isOnline = false;
  String? _serverUrl;
  String? _companyId;

  // 🔐 AES-256 Encryption para fotos en reposo
  static const _secureStorage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );
  static const String _encKeyName = 'offline_queue_aes_key';
  static const String _encIvName = 'offline_queue_aes_iv';
  encrypt.Key? _aesKey;
  encrypt.IV? _aesIV;

  /// Inicializar o recuperar claves AES-256 desde Secure Storage
  Future<void> _initEncryptionKeys() async {
    String? keyBase64 = await _secureStorage.read(key: _encKeyName);
    String? ivBase64 = await _secureStorage.read(key: _encIvName);

    if (keyBase64 == null || ivBase64 == null) {
      // Generar nuevas claves
      final random = Random.secure();
      final keyBytes = List<int>.generate(32, (_) => random.nextInt(256));
      final ivBytes = List<int>.generate(16, (_) => random.nextInt(256));

      keyBase64 = base64Encode(keyBytes);
      ivBase64 = base64Encode(ivBytes);

      await _secureStorage.write(key: _encKeyName, value: keyBase64);
      await _secureStorage.write(key: _encIvName, value: ivBase64);
      debugPrint('🔐 [OFFLINE-QUEUE] Claves AES-256 generadas y almacenadas');
    }

    _aesKey = encrypt.Key.fromBase64(keyBase64);
    _aesIV = encrypt.IV.fromBase64(ivBase64);
  }

  /// Encriptar foto (base64 string) con AES-256-CBC
  String _encryptPhoto(String photoBase64) {
    if (_aesKey == null || _aesIV == null) return photoBase64;
    final encrypter = encrypt.Encrypter(encrypt.AES(_aesKey!, mode: encrypt.AESMode.cbc));
    final encrypted = encrypter.encrypt(photoBase64, iv: _aesIV!);
    return 'ENC:${encrypted.base64}';
  }

  /// Desencriptar foto
  String _decryptPhoto(String encryptedData) {
    if (_aesKey == null || _aesIV == null) return encryptedData;
    if (!encryptedData.startsWith('ENC:')) return encryptedData; // No encriptada (legacy)
    final cipherText = encryptedData.substring(4);
    final encrypter = encrypt.Encrypter(encrypt.AES(_aesKey!, mode: encrypt.AESMode.cbc));
    return encrypter.decrypt64(cipherText, iv: _aesIV!);
  }

  // Configuración
  static const int _maxQueueSize = 500;
  static const int _maxRetries = 5;
  static const Duration _syncInterval = Duration(seconds: 60);
  static const Duration _connectivityCheckInterval = Duration(seconds: 30);
  static const Duration _httpTimeout = Duration(seconds: 15);

  // Stream para notificar cambios de estado
  final StreamController<QueueSyncEvent> _syncEventController =
      StreamController<QueueSyncEvent>.broadcast();
  Stream<QueueSyncEvent> get syncEvents => _syncEventController.stream;

  /// 🚀 Inicializar servicio con configuración del servidor
  Future<void> initialize({
    required String serverUrl,
    required String companyId,
  }) async {
    _serverUrl = serverUrl;
    _companyId = companyId;

    // Inicializar claves de encriptación
    await _initEncryptionKeys();

    // Inicializar base de datos
    await database;

    // Iniciar monitoreo de conectividad
    _startConnectivityMonitor();

    // Verificar si hay items pendientes e intentar sync
    final stats = await getStats();
    if (stats.pending > 0) {
      debugPrint('📋 [OFFLINE-QUEUE] ${stats.pending} registros pendientes de sincronización');
      _scheduleSyncAttempt();
    }

    debugPrint('✅ [OFFLINE-QUEUE] Servicio inicializado (server: $serverUrl, company: $companyId)');
  }

  /// Obtener instancia de la base de datos
  Future<Database> get database async {
    if (_database != null && _isInitialized) return _database!;
    _database = await _initDatabase();
    _isInitialized = true;
    return _database!;
  }

  /// 🚀 Inicializar base de datos SQLite
  Future<Database> _initDatabase() async {
    try {
      debugPrint('💾 [OFFLINE-QUEUE] Iniciando base de datos SQLite...');

      final Directory documentsDirectory = await getApplicationDocumentsDirectory();
      final String path = join(documentsDirectory.path, 'attendance_offline_queue_v2.db');

      return await openDatabase(
        path,
        version: 2,
        onCreate: _createDatabase,
        onUpgrade: _upgradeDatabase,
      );
    } catch (error) {
      debugPrint('❌ [OFFLINE-QUEUE] Error inicializando BD: $error');
      rethrow;
    }
  }

  /// 📋 Crear tablas de la base de datos
  Future<void> _createDatabase(Database db, int version) async {
    debugPrint('📋 [OFFLINE-QUEUE] Creando tablas v$version...');

    await db.execute('''
      CREATE TABLE attendance_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'check_in',
        timestamp TEXT NOT NULL,
        gps_lat REAL,
        gps_lng REAL,
        photo TEXT NOT NULL,
        device_info TEXT,
        kiosk_id TEXT,
        status TEXT DEFAULT 'pending',
        retry_count INTEGER DEFAULT 0,
        error_message TEXT,
        sync_result TEXT,
        created_at TEXT NOT NULL,
        synced_at TEXT
      )
    ''');

    // Índice para búsquedas eficientes
    await db.execute('''
      CREATE INDEX idx_queue_status ON attendance_queue(status)
    ''');

    await db.execute('''
      CREATE INDEX idx_queue_company ON attendance_queue(company_id)
    ''');

    debugPrint('✅ [OFFLINE-QUEUE] Tablas v$version creadas exitosamente');
  }

  /// 🔄 Actualizar base de datos
  Future<void> _upgradeDatabase(Database db, int oldVersion, int newVersion) async {
    debugPrint('🔄 [OFFLINE-QUEUE] Actualizando BD de v$oldVersion a v$newVersion');
    if (oldVersion < 2) {
      // Migrar de v1 a v2: recrear tabla con nuevo esquema
      await db.execute('DROP TABLE IF EXISTS attendance_queue');
      await _createDatabase(db, newVersion);
    }
  }

  // ==================== OPERACIONES DE COLA ====================

  /// ➕ Agregar registro a la cola offline
  /// Retorna el ID del registro o -1 si la cola está llena
  Future<int> addToQueue(AttendanceQueueItem item) async {
    try {
      final db = await database;

      // Verificar límite de cola
      final count = Sqflite.firstIntValue(
        await db.rawQuery('SELECT COUNT(*) FROM attendance_queue WHERE status = ?', ['pending']),
      ) ?? 0;

      if (count >= _maxQueueSize) {
        debugPrint('⚠️ [OFFLINE-QUEUE] Cola llena ($count/$_maxQueueSize) - descartando registro más antiguo');
        // Eliminar el registro pendiente más antiguo para hacer espacio
        await db.rawDelete('''
          DELETE FROM attendance_queue WHERE id = (
            SELECT id FROM attendance_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1
          )
        ''');
      }

      // 🔐 Encriptar foto antes de almacenar en SQLite
      final itemMap = item.toMap();
      if (itemMap['photo'] != null && itemMap['photo'].isNotEmpty) {
        itemMap['photo'] = _encryptPhoto(itemMap['photo']);
      }

      final id = await db.insert(
        'attendance_queue',
        itemMap,
        conflictAlgorithm: ConflictAlgorithm.replace,
      );

      debugPrint('✅ [OFFLINE-QUEUE] Registro agregado: ID=$id (cola: ${count + 1} items)');

      // Notificar evento
      _syncEventController.add(QueueSyncEvent(
        type: SyncEventType.itemQueued,
        message: 'Fichaje guardado offline',
        pendingCount: count + 1,
      ));

      return id;
    } catch (error) {
      debugPrint('❌ [OFFLINE-QUEUE] Error agregando a cola: $error');
      return -1;
    }
  }

  /// 📊 Obtener registros pendientes de sincronizar
  Future<List<AttendanceQueueItem>> getPendingItems({int limit = 10}) async {
    try {
      final db = await database;

      final List<Map<String, dynamic>> maps = await db.query(
        'attendance_queue',
        where: 'status IN (?, ?)',
        whereArgs: ['pending', 'error'],
        orderBy: 'created_at ASC',
        limit: limit,
      );

      return List.generate(maps.length, (i) => AttendanceQueueItem.fromMap(maps[i]));
    } catch (error) {
      debugPrint('❌ [OFFLINE-QUEUE] Error obteniendo pendientes: $error');
      return [];
    }
  }

  // ==================== SINCRONIZACIÓN ====================

  /// 🔄 SINCRONIZAR ITEMS PENDIENTES
  /// Envía cada foto al endpoint /verify-real para reconocimiento diferido
  /// El backend identifica a la persona y registra la asistencia con el timestamp original
  Future<SyncResult> syncPendingItems() async {
    if (_isSyncing) {
      debugPrint('⚠️ [OFFLINE-QUEUE] Sincronización ya en progreso');
      return SyncResult(synced: 0, failed: 0, remaining: 0);
    }

    if (_serverUrl == null || _companyId == null) {
      debugPrint('⚠️ [OFFLINE-QUEUE] No configurado (serverUrl o companyId null)');
      return SyncResult(synced: 0, failed: 0, remaining: 0);
    }

    _isSyncing = true;
    int syncedCount = 0;
    int failedCount = 0;

    try {
      final items = await getPendingItems(limit: 10); // Procesar de a 10
      if (items.isEmpty) {
        _isSyncing = false;
        return SyncResult(synced: 0, failed: 0, remaining: 0);
      }

      debugPrint('🔄 [OFFLINE-QUEUE] Sincronizando ${items.length} registros...');

      for (final item in items) {
        if (item.id == null) continue;

        try {
          final success = await _syncSingleItem(item);
          if (success) {
            await _markAsSynced(item.id!);
            syncedCount++;
          } else {
            await _markAsError(item.id!, 'No reconocido por el backend');
            failedCount++;
          }
        } catch (e) {
          await _markAsError(item.id!, e.toString());
          failedCount++;

          // Si hay error de red, no intentar más items
          if (_isNetworkError(e)) {
            debugPrint('📴 [OFFLINE-QUEUE] Error de red - deteniendo sync');
            _isOnline = false;
            break;
          }
        }

        // Pequeña pausa entre items para no saturar el servidor
        await Future.delayed(const Duration(milliseconds: 500));
      }

      // Obtener items restantes
      final remaining = await getPendingItems();
      final remainingCount = remaining.length;

      if (syncedCount > 0) {
        debugPrint('✅ [OFFLINE-QUEUE] Sync completado: $syncedCount OK, $failedCount errores, $remainingCount restantes');
        _syncEventController.add(QueueSyncEvent(
          type: SyncEventType.syncCompleted,
          message: '$syncedCount fichajes sincronizados',
          pendingCount: remainingCount,
        ));
      }

      // Si quedan items, programar otro intento
      if (remainingCount > 0 && _isOnline) {
        _scheduleSyncAttempt();
      }

      return SyncResult(synced: syncedCount, failed: failedCount, remaining: remainingCount);
    } finally {
      _isSyncing = false;
    }
  }

  /// 📡 Enviar un item individual al backend vía /verify-real
  Future<bool> _syncSingleItem(AttendanceQueueItem item) async {
    if (item.photo == null || item.photo!.isEmpty) {
      debugPrint('⚠️ [OFFLINE-QUEUE] Item ${item.id} sin foto - descartando');
      return false;
    }

    final uri = Uri.parse('$_serverUrl/api/v2/biometric-attendance/verify-real');
    final request = http.MultipartRequest('POST', uri);

    // Headers multi-tenant
    request.headers['X-Company-Id'] = item.companyId ?? _companyId!;
    request.headers['X-Kiosk-Mode'] = 'true';
    request.headers['X-Offline-Sync'] = 'true';
    request.headers['X-Original-Timestamp'] = item.timestamp.toIso8601String();

    // 🔐 Desencriptar foto antes de enviar
    final decryptedPhoto = _decryptPhoto(item.photo!);
    // Decodificar foto de base64 a bytes
    final photoBytes = base64Decode(decryptedPhoto);

    // Adjuntar foto
    request.files.add(http.MultipartFile.fromBytes(
      'photo',
      photoBytes,
      filename: 'offline_${item.id}_${item.timestamp.millisecondsSinceEpoch}.jpg',
      contentType: http_parser.MediaType('image', 'jpeg'),
    ));

    // Enviar con timeout
    final streamedResponse = await request.send().timeout(_httpTimeout);
    final response = await http.Response.fromStream(streamedResponse);

    if (response.statusCode == 200) {
      final body = jsonDecode(response.body);
      if (body['success'] == true) {
        final employeeName = body['employee']?['name'] ?? 'Desconocido';
        debugPrint('✅ [OFFLINE-QUEUE] Item ${item.id} sincronizado: $employeeName');
        return true;
      } else {
        debugPrint('⚠️ [OFFLINE-QUEUE] Item ${item.id} no reconocido: ${body['message']}');
        return false; // No reconocido pero no es error de red
      }
    } else if (response.statusCode >= 500) {
      throw Exception('Server error: ${response.statusCode}');
    } else {
      debugPrint('⚠️ [OFFLINE-QUEUE] Item ${item.id} rechazado: HTTP ${response.statusCode}');
      return false;
    }
  }

  bool _isNetworkError(dynamic error) {
    final msg = error.toString().toLowerCase();
    return msg.contains('socketexception') ||
        msg.contains('timeoutexception') ||
        msg.contains('clientexception') ||
        msg.contains('host lookup') ||
        msg.contains('connection refused');
  }

  // ==================== MONITOREO DE CONECTIVIDAD ====================

  /// 🌐 Iniciar monitoreo de conectividad
  void _startConnectivityMonitor() {
    _connectivityTimer?.cancel();
    _connectivityTimer = Timer.periodic(_connectivityCheckInterval, (_) async {
      await _checkConnectivity();
    });
    // Chequeo inicial
    _checkConnectivity();
  }

  /// 🔍 Verificar conectividad con el servidor
  Future<bool> _checkConnectivity() async {
    if (_serverUrl == null) return false;

    try {
      final uri = Uri.parse('$_serverUrl/api/v1/health');
      final response = await http.get(uri).timeout(const Duration(seconds: 5));

      final wasOffline = !_isOnline;
      _isOnline = response.statusCode == 200;

      if (_isOnline && wasOffline) {
        debugPrint('🌐 [OFFLINE-QUEUE] Conexión restaurada - iniciando sincronización');
        _syncEventController.add(QueueSyncEvent(
          type: SyncEventType.networkRestored,
          message: 'Conexión restaurada',
          pendingCount: 0,
        ));
        // Intentar sync inmediatamente
        syncPendingItems();
      }

      return _isOnline;
    } catch (e) {
      _isOnline = false;
      return false;
    }
  }

  /// ⏰ Programar intento de sincronización
  void _scheduleSyncAttempt() {
    _syncTimer?.cancel();
    _syncTimer = Timer(_syncInterval, () async {
      if (_isOnline && !_isSyncing) {
        await syncPendingItems();
      }
    });
  }

  /// 🌐 Estado actual de conectividad
  bool get isOnline => _isOnline;

  // ==================== OPERACIONES DE ESTADO ====================

  /// ✅ Marcar registro como sincronizado
  Future<void> _markAsSynced(int id) async {
    try {
      final db = await database;
      await db.update(
        'attendance_queue',
        {
          'status': 'synced',
          'synced_at': DateTime.now().toIso8601String(),
        },
        where: 'id = ?',
        whereArgs: [id],
      );
    } catch (error) {
      debugPrint('❌ [OFFLINE-QUEUE] Error marcando como sincronizado: $error');
    }
  }

  /// ❌ Marcar registro con error (con reintentos)
  Future<void> _markAsError(int id, String errorMessage) async {
    try {
      final db = await database;

      final item = await db.query(
        'attendance_queue',
        where: 'id = ?',
        whereArgs: [id],
      );

      if (item.isEmpty) return;

      final retryCount = (item.first['retry_count'] as int? ?? 0) + 1;
      final newStatus = retryCount >= _maxRetries ? 'failed' : 'pending'; // Vuelve a pending para reintentar

      await db.update(
        'attendance_queue',
        {
          'status': newStatus,
          'error_message': errorMessage,
          'retry_count': retryCount,
        },
        where: 'id = ?',
        whereArgs: [id],
      );

      if (newStatus == 'failed') {
        debugPrint('❌ [OFFLINE-QUEUE] ID=$id falló permanentemente tras $_maxRetries intentos');
      }
    } catch (error) {
      debugPrint('❌ [OFFLINE-QUEUE] Error marcando error: $error');
    }
  }

  /// 📊 Obtener estadísticas de la cola
  Future<QueueStats> getStats() async {
    try {
      final db = await database;

      final pendingCount = Sqflite.firstIntValue(
        await db.rawQuery('SELECT COUNT(*) FROM attendance_queue WHERE status IN (?, ?)', ['pending', 'error']),
      ) ?? 0;

      final syncedCount = Sqflite.firstIntValue(
        await db.rawQuery('SELECT COUNT(*) FROM attendance_queue WHERE status = ?', ['synced']),
      ) ?? 0;

      final failedCount = Sqflite.firstIntValue(
        await db.rawQuery('SELECT COUNT(*) FROM attendance_queue WHERE status = ?', ['failed']),
      ) ?? 0;

      final totalCount = Sqflite.firstIntValue(
        await db.rawQuery('SELECT COUNT(*) FROM attendance_queue'),
      ) ?? 0;

      return QueueStats(
        pending: pendingCount,
        synced: syncedCount,
        failed: failedCount,
        total: totalCount,
      );
    } catch (error) {
      debugPrint('❌ [OFFLINE-QUEUE] Error obteniendo stats: $error');
      return QueueStats(pending: 0, synced: 0, failed: 0, total: 0);
    }
  }

  /// 🗑️ Limpiar registros sincronizados antiguos
  Future<void> cleanOldRecords({int daysOld = 7}) async {
    try {
      final db = await database;
      final cutoffDate = DateTime.now().subtract(Duration(days: daysOld));

      // Eliminar sincronizados y fallidos antiguos
      final deletedCount = await db.delete(
        'attendance_queue',
        where: '(status = ? OR status = ?) AND created_at < ?',
        whereArgs: ['synced', 'failed', cutoffDate.toIso8601String()],
      );

      if (deletedCount > 0) {
        debugPrint('🗑️ [OFFLINE-QUEUE] Eliminados $deletedCount registros antiguos');
      }
    } catch (error) {
      debugPrint('❌ [OFFLINE-QUEUE] Error limpiando registros: $error');
    }
  }

  /// 🧹 Cerrar base de datos y detener timers
  Future<void> dispose() async {
    _syncTimer?.cancel();
    _connectivityTimer?.cancel();
    _syncEventController.close();
    if (_database != null) {
      await _database!.close();
      _isInitialized = false;
      _database = null;
    }
    debugPrint('🧹 [OFFLINE-QUEUE] Servicio detenido');
  }
}

// ==================== MODELOS DE DATOS ====================

/// Item de la cola de asistencia offline
class AttendanceQueueItem {
  final int? id;
  final String companyId;
  final String type; // 'check_in' | 'check_out'
  final DateTime timestamp;
  final double? gpsLat;
  final double? gpsLng;
  final String? photo; // Base64 de la foto facial
  final String? deviceInfo;
  final String? kioskId;
  final String status; // 'pending' | 'synced' | 'error' | 'failed'
  final int retryCount;
  final String? errorMessage;
  final String? syncResult;
  final DateTime createdAt;
  final DateTime? syncedAt;

  AttendanceQueueItem({
    this.id,
    required this.companyId,
    required this.type,
    required this.timestamp,
    this.gpsLat,
    this.gpsLng,
    this.photo,
    this.deviceInfo,
    this.kioskId,
    this.status = 'pending',
    this.retryCount = 0,
    this.errorMessage,
    this.syncResult,
    required this.createdAt,
    this.syncedAt,
  });

  Map<String, dynamic> toMap() {
    return {
      if (id != null) 'id': id,
      'company_id': companyId,
      'type': type,
      'timestamp': timestamp.toIso8601String(),
      'gps_lat': gpsLat,
      'gps_lng': gpsLng,
      'photo': photo,
      'device_info': deviceInfo,
      'kiosk_id': kioskId,
      'status': status,
      'retry_count': retryCount,
      'error_message': errorMessage,
      'sync_result': syncResult,
      'created_at': createdAt.toIso8601String(),
      'synced_at': syncedAt?.toIso8601String(),
    };
  }

  factory AttendanceQueueItem.fromMap(Map<String, dynamic> map) {
    return AttendanceQueueItem(
      id: map['id'] as int?,
      companyId: map['company_id'] as String? ?? '',
      type: map['type'] as String? ?? 'check_in',
      timestamp: DateTime.parse(map['timestamp'] as String),
      gpsLat: map['gps_lat'] as double?,
      gpsLng: map['gps_lng'] as double?,
      photo: map['photo'] as String?,
      deviceInfo: map['device_info'] as String?,
      kioskId: map['kiosk_id'] as String?,
      status: map['status'] as String? ?? 'pending',
      retryCount: map['retry_count'] as int? ?? 0,
      errorMessage: map['error_message'] as String?,
      syncResult: map['sync_result'] as String?,
      createdAt: DateTime.parse(map['created_at'] as String),
      syncedAt: map['synced_at'] != null ? DateTime.parse(map['synced_at'] as String) : null,
    );
  }
}

/// Estadísticas de la cola
class QueueStats {
  final int pending;
  final int synced;
  final int failed;
  final int total;

  QueueStats({
    required this.pending,
    required this.synced,
    required this.failed,
    required this.total,
  });

  bool get hasPending => pending > 0;

  @override
  String toString() {
    return 'QueueStats(pending: $pending, synced: $synced, failed: $failed, total: $total)';
  }
}

/// Evento de sincronización
class QueueSyncEvent {
  final SyncEventType type;
  final String message;
  final int pendingCount;

  QueueSyncEvent({
    required this.type,
    required this.message,
    required this.pendingCount,
  });
}

enum SyncEventType {
  itemQueued,
  syncStarted,
  syncCompleted,
  syncFailed,
  networkRestored,
  networkLost,
}

/// Resultado de sincronización
class SyncResult {
  final int synced;
  final int failed;
  final int remaining;

  SyncResult({
    required this.synced,
    required this.failed,
    required this.remaining,
  });

  bool get hasErrors => failed > 0;
  bool get allSynced => remaining == 0;
}
