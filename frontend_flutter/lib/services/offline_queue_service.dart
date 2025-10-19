import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import 'package:path_provider/path_provider.dart';

/// 💾 OFFLINE QUEUE SERVICE
/// Gestiona cola de registros de asistencia cuando no hay conexión
/// Sincroniza automáticamente cuando se restablece la conexión
class OfflineQueueService {
  static final OfflineQueueService _instance = OfflineQueueService._internal();
  factory OfflineQueueService() => _instance;
  OfflineQueueService._internal();

  Database? _database;
  bool _isInitialized = false;

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
      final String path = join(documentsDirectory.path, 'attendance_offline_queue.db');

      return await openDatabase(
        path,
        version: 1,
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
    debugPrint('📋 [OFFLINE-QUEUE] Creando tablas...');

    await db.execute('''
      CREATE TABLE attendance_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        gps_lat REAL,
        gps_lng REAL,
        photo TEXT,
        embedding TEXT,
        confidence REAL,
        device_info TEXT,
        hardware_profile TEXT,
        status TEXT DEFAULT 'pending',
        retry_count INTEGER DEFAULT 0,
        error_message TEXT,
        created_at TEXT NOT NULL,
        synced_at TEXT
      )
    ''');

    debugPrint('✅ [OFFLINE-QUEUE] Tablas creadas exitosamente');
  }

  /// 🔄 Actualizar base de datos (para versiones futuras)
  Future<void> _upgradeDatabase(Database db, int oldVersion, int newVersion) async {
    debugPrint('🔄 [OFFLINE-QUEUE] Actualizando BD de v$oldVersion a v$newVersion');
    // Agregar migraciones futuras aquí
  }

  /// ➕ Agregar registro a la cola offline
  Future<int> addToQueue(AttendanceQueueItem item) async {
    try {
      final db = await database;

      final id = await db.insert(
        'attendance_queue',
        item.toMap(),
        conflictAlgorithm: ConflictAlgorithm.replace,
      );

      debugPrint('✅ [OFFLINE-QUEUE] Registro agregado a cola: ID=$id');
      return id;
    } catch (error) {
      debugPrint('❌ [OFFLINE-QUEUE] Error agregando a cola: $error');
      rethrow;
    }
  }

  /// 📊 Obtener registros pendientes de sincronizar
  Future<List<AttendanceQueueItem>> getPendingItems() async {
    try {
      final db = await database;

      final List<Map<String, dynamic>> maps = await db.query(
        'attendance_queue',
        where: 'status = ?',
        whereArgs: ['pending'],
        orderBy: 'created_at ASC',
      );

      return List.generate(maps.length, (i) => AttendanceQueueItem.fromMap(maps[i]));
    } catch (error) {
      debugPrint('❌ [OFFLINE-QUEUE] Error obteniendo pendientes: $error');
      return [];
    }
  }

  /// ✅ Marcar registro como sincronizado
  Future<void> markAsSynced(int id) async {
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

      debugPrint('✅ [OFFLINE-QUEUE] Registro ID=$id marcado como sincronizado');
    } catch (error) {
      debugPrint('❌ [OFFLINE-QUEUE] Error marcando como sincronizado: $error');
    }
  }

  /// ❌ Marcar registro con error
  Future<void> markAsError(int id, String errorMessage) async {
    try {
      final db = await database;

      final item = await db.query(
        'attendance_queue',
        where: 'id = ?',
        whereArgs: [id],
      );

      final retryCount = (item.first['retry_count'] as int? ?? 0) + 1;

      await db.update(
        'attendance_queue',
        {
          'status': retryCount >= 3 ? 'failed' : 'error',
          'error_message': errorMessage,
          'retry_count': retryCount,
        },
        where: 'id = ?',
        whereArgs: [id],
      );

      debugPrint('⚠️ [OFFLINE-QUEUE] Registro ID=$id marcado con error (reintentos: $retryCount)');
    } catch (error) {
      debugPrint('❌ [OFFLINE-QUEUE] Error marcando error: $error');
    }
  }

  /// 🗑️ Eliminar registros sincronizados antiguos
  Future<void> cleanSyncedItems({int daysOld = 7}) async {
    try {
      final db = await database;

      final cutoffDate = DateTime.now().subtract(Duration(days: daysOld));

      final deletedCount = await db.delete(
        'attendance_queue',
        where: 'status = ? AND synced_at < ?',
        whereArgs: ['synced', cutoffDate.toIso8601String()],
      );

      debugPrint('🗑️ [OFFLINE-QUEUE] Eliminados $deletedCount registros antiguos');
    } catch (error) {
      debugPrint('❌ [OFFLINE-QUEUE] Error limpiando registros: $error');
    }
  }

  /// 📊 Obtener estadísticas de la cola
  Future<QueueStats> getStats() async {
    try {
      final db = await database;

      final pendingCount = Sqflite.firstIntValue(
        await db.rawQuery('SELECT COUNT(*) FROM attendance_queue WHERE status = ?', ['pending']),
      ) ?? 0;

      final syncedCount = Sqflite.firstIntValue(
        await db.rawQuery('SELECT COUNT(*) FROM attendance_queue WHERE status = ?', ['synced']),
      ) ?? 0;

      final errorCount = Sqflite.firstIntValue(
        await db.rawQuery('SELECT COUNT(*) FROM attendance_queue WHERE status IN (?, ?)', ['error', 'failed']),
      ) ?? 0;

      final totalCount = Sqflite.firstIntValue(
        await db.rawQuery('SELECT COUNT(*) FROM attendance_queue'),
      ) ?? 0;

      return QueueStats(
        pending: pendingCount,
        synced: syncedCount,
        errors: errorCount,
        total: totalCount,
      );
    } catch (error) {
      debugPrint('❌ [OFFLINE-QUEUE] Error obteniendo stats: $error');
      return QueueStats(pending: 0, synced: 0, errors: 0, total: 0);
    }
  }

  /// 🧹 Cerrar base de datos
  Future<void> close() async {
    final db = await database;
    await db.close();
    _isInitialized = false;
    _database = null;
    debugPrint('🧹 [OFFLINE-QUEUE] Base de datos cerrada');
  }
}

// ==================== MODELOS DE DATOS ====================

/// Item de la cola de asistencia offline
class AttendanceQueueItem {
  final int? id;
  final int userId;
  final String type; // 'checkin' | 'checkout'
  final DateTime timestamp;
  final double? gpsLat;
  final double? gpsLng;
  final String? photo; // Base64
  final String? embedding; // JSON array de embeddings faciales
  final double? confidence;
  final String? deviceInfo;
  final String? hardwareProfile;
  final String status; // 'pending' | 'synced' | 'error' | 'failed'
  final int retryCount;
  final String? errorMessage;
  final DateTime createdAt;
  final DateTime? syncedAt;

  AttendanceQueueItem({
    this.id,
    required this.userId,
    required this.type,
    required this.timestamp,
    this.gpsLat,
    this.gpsLng,
    this.photo,
    this.embedding,
    this.confidence,
    this.deviceInfo,
    this.hardwareProfile,
    this.status = 'pending',
    this.retryCount = 0,
    this.errorMessage,
    required this.createdAt,
    this.syncedAt,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'user_id': userId,
      'type': type,
      'timestamp': timestamp.toIso8601String(),
      'gps_lat': gpsLat,
      'gps_lng': gpsLng,
      'photo': photo,
      'embedding': embedding,
      'confidence': confidence,
      'device_info': deviceInfo,
      'hardware_profile': hardwareProfile,
      'status': status,
      'retry_count': retryCount,
      'error_message': errorMessage,
      'created_at': createdAt.toIso8601String(),
      'synced_at': syncedAt?.toIso8601String(),
    };
  }

  Map<String, dynamic> toApiJson() {
    return {
      'user_id': userId,
      'type': type,
      'timestamp': timestamp.toIso8601String(),
      'location': (gpsLat != null && gpsLng != null)
          ? {'latitude': gpsLat, 'longitude': gpsLng}
          : null,
      'photo': photo,
      'embedding': embedding != null ? jsonDecode(embedding!) : null,
      'confidence': confidence,
      'device_info': deviceInfo != null ? jsonDecode(deviceInfo!) : null,
      'hardware_profile': hardwareProfile,
    };
  }

  factory AttendanceQueueItem.fromMap(Map<String, dynamic> map) {
    return AttendanceQueueItem(
      id: map['id'] as int?,
      userId: map['user_id'] as int,
      type: map['type'] as String,
      timestamp: DateTime.parse(map['timestamp'] as String),
      gpsLat: map['gps_lat'] as double?,
      gpsLng: map['gps_lng'] as double?,
      photo: map['photo'] as String?,
      embedding: map['embedding'] as String?,
      confidence: map['confidence'] as double?,
      deviceInfo: map['device_info'] as String?,
      hardwareProfile: map['hardware_profile'] as String?,
      status: map['status'] as String? ?? 'pending',
      retryCount: map['retry_count'] as int? ?? 0,
      errorMessage: map['error_message'] as String?,
      createdAt: DateTime.parse(map['created_at'] as String),
      syncedAt: map['synced_at'] != null ? DateTime.parse(map['synced_at'] as String) : null,
    );
  }
}

/// Estadísticas de la cola
class QueueStats {
  final int pending;
  final int synced;
  final int errors;
  final int total;

  QueueStats({
    required this.pending,
    required this.synced,
    required this.errors,
    required this.total,
  });

  @override
  String toString() {
    return 'QueueStats(pending: $pending, synced: $synced, errors: $errors, total: $total)';
  }
}
