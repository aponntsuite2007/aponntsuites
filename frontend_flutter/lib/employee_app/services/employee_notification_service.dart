/*
 * 🔔 EMPLOYEE NOTIFICATION SERVICE
 * ==================================
 * Servicio de notificaciones para la APP DEL EMPLEADO
 * Mismos estándares que el kiosk pero adaptado para uso individual
 *
 * Tipos de notificaciones:
 * - Asistencia (entrada/salida)
 * - Médicas (solicitudes, documentos)
 * - Sistema (recordatorios, alertas)
 * - Autorización (llegadas tardías)
 *
 * Fecha: 2025-11-29
 * Versión: 1.0.0
 *
 * ⚠️ ESTE ARCHIVO ES INDEPENDIENTE - NO MODIFICA NADA DEL KIOSK
 */

import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// 🏷️ Tipo de notificación
enum EmployeeNotificationType {
  attendance,
  medical,
  system,
  authorization,
  reminder,
  warning,
  announcement,
}

/// ⚡ Prioridad de notificación
enum EmployeeNotificationPriority {
  low,
  medium,
  high,
  critical,
}

/// 📦 Modelo de notificación
class EmployeeNotification {
  final String id;
  final String title;
  final String body;
  final EmployeeNotificationType type;
  final EmployeeNotificationPriority priority;
  final DateTime timestamp;
  bool isRead;
  final Map<String, dynamic>? data;
  final String? actionRoute;

  EmployeeNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.type,
    this.priority = EmployeeNotificationPriority.medium,
    DateTime? timestamp,
    this.isRead = false,
    this.data,
    this.actionRoute,
  }) : timestamp = timestamp ?? DateTime.now();

  String get typeIcon {
    switch (type) {
      case EmployeeNotificationType.attendance:
        return '✅';
      case EmployeeNotificationType.medical:
        return '🏥';
      case EmployeeNotificationType.system:
        return '⚙️';
      case EmployeeNotificationType.authorization:
        return '🔐';
      case EmployeeNotificationType.reminder:
        return '⏰';
      case EmployeeNotificationType.warning:
        return '⚠️';
      case EmployeeNotificationType.announcement:
        return '📢';
    }
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'body': body,
        'type': type.name,
        'priority': priority.name,
        'timestamp': timestamp.toIso8601String(),
        'isRead': isRead,
        'data': data,
        'actionRoute': actionRoute,
      };

  factory EmployeeNotification.fromJson(Map<String, dynamic> json) {
    return EmployeeNotification(
      id: json['id'],
      title: json['title'],
      body: json['body'],
      type: EmployeeNotificationType.values.firstWhere(
        (e) => e.name == json['type'],
        orElse: () => EmployeeNotificationType.system,
      ),
      priority: EmployeeNotificationPriority.values.firstWhere(
        (e) => e.name == json['priority'],
        orElse: () => EmployeeNotificationPriority.medium,
      ),
      timestamp: DateTime.parse(json['timestamp']),
      isRead: json['isRead'] ?? false,
      data: json['data'],
      actionRoute: json['actionRoute'],
    );
  }

  EmployeeNotification copyWith({bool? isRead}) {
    return EmployeeNotification(
      id: id,
      title: title,
      body: body,
      type: type,
      priority: priority,
      timestamp: timestamp,
      isRead: isRead ?? this.isRead,
      data: data,
      actionRoute: actionRoute,
    );
  }
}

/// 🔔 EMPLOYEE NOTIFICATION SERVICE
class EmployeeNotificationService {
  static final EmployeeNotificationService _instance =
      EmployeeNotificationService._internal();
  factory EmployeeNotificationService() => _instance;
  EmployeeNotificationService._internal();

  SharedPreferences? _prefs;
  List<EmployeeNotification> _notifications = [];
  Function(List<EmployeeNotification>)? _onNotificationsChanged;

  // Configuraciones
  bool _attendanceRemindersEnabled = true;
  bool _medicalNotificationsEnabled = true;
  bool _pushNotificationsEnabled = true;
  bool _soundEnabled = true;
  bool _vibrationEnabled = true;
  String _reminderTime = '08:00';

  // Contadores de badges médicos
  int _medicalRequestsCount = 0;
  int _urgentDocumentsCount = 0;
  int _overdueDocumentsCount = 0;

  // Getters
  List<EmployeeNotification> get notifications =>
      List.unmodifiable(_notifications);
  int get unreadCount => _notifications.where((n) => !n.isRead).length;

  bool get attendanceRemindersEnabled => _attendanceRemindersEnabled;
  bool get medicalNotificationsEnabled => _medicalNotificationsEnabled;
  bool get pushNotificationsEnabled => _pushNotificationsEnabled;
  bool get soundEnabled => _soundEnabled;
  bool get vibrationEnabled => _vibrationEnabled;
  String get reminderTime => _reminderTime;

  int get medicalRequestsCount => _medicalRequestsCount;
  int get urgentDocumentsCount => _urgentDocumentsCount;
  int get overdueDocumentsCount => _overdueDocumentsCount;
  int get totalMedicalBadgeCount =>
      _medicalRequestsCount + _urgentDocumentsCount + _overdueDocumentsCount;

  /// 🚀 Inicializar servicio
  Future<void> initialize() async {
    _prefs = await SharedPreferences.getInstance();
    _loadSettings();
    _loadNotifications();
    debugPrint('🔔 [EMPLOYEE-NOTIF] Servicio inicializado');
  }

  /// 📝 Registrar listener
  void setNotificationListener(
      Function(List<EmployeeNotification>) listener) {
    _onNotificationsChanged = listener;
  }

  // ====== NOTIFICACIONES DE ASISTENCIA ======

  /// ✅ Notificar check-in exitoso
  Future<void> showCheckInSuccess({
    required String location,
    String? employeeName,
  }) async {
    final notification = EmployeeNotification(
      id: 'checkin_${DateTime.now().millisecondsSinceEpoch}',
      title: '✅ Entrada Registrada',
      body: 'Tu entrada ha sido registrada en $location',
      type: EmployeeNotificationType.attendance,
      priority: EmployeeNotificationPriority.medium,
      data: {'location': location, 'employeeName': employeeName},
    );

    await _addNotification(notification);
    debugPrint('🔔 [EMPLOYEE-NOTIF] Check-in: $location');
  }

  /// 🚪 Notificar check-out exitoso
  Future<void> showCheckOutSuccess({
    required String workingHours,
    String? location,
  }) async {
    final notification = EmployeeNotification(
      id: 'checkout_${DateTime.now().millisecondsSinceEpoch}',
      title: '🚪 Salida Registrada',
      body: 'Salida registrada. Horas trabajadas: $workingHours',
      type: EmployeeNotificationType.attendance,
      priority: EmployeeNotificationPriority.medium,
      data: {'workingHours': workingHours, 'location': location},
    );

    await _addNotification(notification);
    debugPrint('🔔 [EMPLOYEE-NOTIF] Check-out: $workingHours');
  }

  /// ⚠️ Advertencia de llegada tardía
  Future<void> showLateArrivalWarning({
    int? lateMinutes,
    bool authorizationSent = false,
  }) async {
    final notification = EmployeeNotification(
      id: 'late_${DateTime.now().millisecondsSinceEpoch}',
      title: '⚠️ Llegada Tardía',
      body: authorizationSent
          ? 'Llegaste ${lateMinutes ?? ''} minutos tarde. Solicitud de autorización enviada.'
          : 'Has llegado tarde. Se registrará como tardanza.',
      type: EmployeeNotificationType.warning,
      priority: EmployeeNotificationPriority.high,
      data: {
        'lateMinutes': lateMinutes,
        'authorizationSent': authorizationSent
      },
    );

    await _addNotification(notification);
    debugPrint('🔔 [EMPLOYEE-NOTIF] Llegada tardía: $lateMinutes min');
  }

  /// 📢 Respuesta de autorización
  Future<void> showAuthorizationResponse({
    required bool approved,
    String? approverName,
    String? message,
  }) async {
    final notification = EmployeeNotification(
      id: 'auth_response_${DateTime.now().millisecondsSinceEpoch}',
      title: approved ? '✅ Autorización Aprobada' : '❌ Autorización Rechazada',
      body: message ??
          (approved
              ? 'Tu llegada tardía ha sido autorizada${approverName != null ? ' por $approverName' : ''}'
              : 'Tu solicitud de autorización ha sido rechazada'),
      type: EmployeeNotificationType.authorization,
      priority: EmployeeNotificationPriority.high,
      data: {'approved': approved, 'approverName': approverName},
    );

    await _addNotification(notification);
    debugPrint(
        '🔔 [EMPLOYEE-NOTIF] Autorización: ${approved ? 'APROBADA' : 'RECHAZADA'}');
  }

  /// ⏰ Recordatorio de asistencia
  Future<void> showAttendanceReminder() async {
    if (!_attendanceRemindersEnabled) return;

    final notification = EmployeeNotification(
      id: 'reminder_${DateTime.now().millisecondsSinceEpoch}',
      title: '⏰ Recordatorio de Asistencia',
      body: 'No olvides registrar tu asistencia de hoy',
      type: EmployeeNotificationType.reminder,
      priority: EmployeeNotificationPriority.high,
      actionRoute: '/attendance',
    );

    await _addNotification(notification);
    debugPrint('🔔 [EMPLOYEE-NOTIF] Recordatorio de asistencia');
  }

  // ====== NOTIFICACIONES MÉDICAS ======

  /// 🏥 Nueva solicitud médica
  Future<void> showMedicalRequestNotification({
    required String title,
    required String body,
    required String documentType,
    Map<String, dynamic>? data,
  }) async {
    if (!_medicalNotificationsEnabled) return;

    final notification = EmployeeNotification(
      id: 'medical_${DateTime.now().millisecondsSinceEpoch}',
      title: '🏥 $title',
      body: body,
      type: EmployeeNotificationType.medical,
      priority: EmployeeNotificationPriority.high,
      data: {'documentType': documentType, ...?data},
      actionRoute: '/medical',
    );

    await _addNotification(notification);
    _medicalRequestsCount++;
    _notifyListeners();
    debugPrint('🔔 [EMPLOYEE-NOTIF] Solicitud médica: $documentType');
  }

  /// ⚡ Documento urgente
  Future<void> showUrgentDocumentNotification({
    required String title,
    required String body,
    required String documentType,
    int? daysUntilDue,
    Map<String, dynamic>? data,
  }) async {
    if (!_medicalNotificationsEnabled) return;

    final notification = EmployeeNotification(
      id: 'urgent_${DateTime.now().millisecondsSinceEpoch}',
      title: '⚡ $title',
      body: body,
      type: EmployeeNotificationType.medical,
      priority: EmployeeNotificationPriority.critical,
      data: {
        'documentType': documentType,
        'daysUntilDue': daysUntilDue,
        ...?data
      },
      actionRoute: '/medical',
    );

    await _addNotification(notification);
    _urgentDocumentsCount++;
    _notifyListeners();
    debugPrint(
        '🔔 [EMPLOYEE-NOTIF] Documento urgente: $documentType ($daysUntilDue días)');
  }

  /// ❌ Documento vencido
  Future<void> showOverdueDocumentNotification({
    required String title,
    required String body,
    required String documentType,
    int? daysOverdue,
    Map<String, dynamic>? data,
  }) async {
    if (!_medicalNotificationsEnabled) return;

    final notification = EmployeeNotification(
      id: 'overdue_${DateTime.now().millisecondsSinceEpoch}',
      title: '❌ $title',
      body: body,
      type: EmployeeNotificationType.medical,
      priority: EmployeeNotificationPriority.critical,
      data: {
        'documentType': documentType,
        'daysOverdue': daysOverdue,
        ...?data
      },
      actionRoute: '/medical',
    );

    await _addNotification(notification);
    _overdueDocumentsCount++;
    _notifyListeners();
    debugPrint(
        '🔔 [EMPLOYEE-NOTIF] Documento vencido: $documentType ($daysOverdue días)');
  }

  /// ✅ Confirmación de documento subido
  Future<void> showDocumentUploadConfirmation({
    required String documentType,
    String? message,
  }) async {
    final notification = EmployeeNotification(
      id: 'upload_${DateTime.now().millisecondsSinceEpoch}',
      title: '✅ Documento Enviado',
      body: message ?? 'Tu $documentType ha sido enviado exitosamente',
      type: EmployeeNotificationType.medical,
      priority: EmployeeNotificationPriority.medium,
      data: {'documentType': documentType},
    );

    await _addNotification(notification);
    debugPrint('🔔 [EMPLOYEE-NOTIF] Documento subido: $documentType');
  }

  // ====== NOTIFICACIONES DEL SISTEMA ======

  /// 📢 Anuncio del sistema
  Future<void> showSystemAnnouncement(String title, String message) async {
    final notification = EmployeeNotification(
      id: 'announcement_${DateTime.now().millisecondsSinceEpoch}',
      title: '📢 $title',
      body: message,
      type: EmployeeNotificationType.announcement,
      priority: EmployeeNotificationPriority.high,
    );

    await _addNotification(notification);
    debugPrint('🔔 [EMPLOYEE-NOTIF] Anuncio: $title');
  }

  /// ⚙️ Notificación del sistema genérica
  Future<void> showSystemNotification({
    required String title,
    required String body,
    EmployeeNotificationPriority priority = EmployeeNotificationPriority.medium,
    Map<String, dynamic>? data,
    String? actionRoute,
  }) async {
    final notification = EmployeeNotification(
      id: 'system_${DateTime.now().millisecondsSinceEpoch}',
      title: title,
      body: body,
      type: EmployeeNotificationType.system,
      priority: priority,
      data: data,
      actionRoute: actionRoute,
    );

    await _addNotification(notification);
    debugPrint('🔔 [EMPLOYEE-NOTIF] Sistema: $title');
  }

  // ====== GESTIÓN DE NOTIFICACIONES ======

  /// ➕ Agregar notificación
  Future<void> _addNotification(EmployeeNotification notification) async {
    _notifications.insert(0, notification);

    // Mantener máximo 100 notificaciones
    if (_notifications.length > 100) {
      _notifications = _notifications.take(100).toList();
    }

    _notifyListeners();
    await _saveNotifications();
  }

  /// ✅ Marcar como leída
  void markAsRead(String notificationId) {
    final index = _notifications.indexWhere((n) => n.id == notificationId);
    if (index >= 0) {
      _notifications[index] = _notifications[index].copyWith(isRead: true);

      // Actualizar contadores médicos si aplica
      final notif = _notifications[index];
      if (notif.type == EmployeeNotificationType.medical) {
        final docType = notif.data?['documentType'];
        if (notif.id.startsWith('medical_') && _medicalRequestsCount > 0) {
          _medicalRequestsCount--;
        } else if (notif.id.startsWith('urgent_') && _urgentDocumentsCount > 0) {
          _urgentDocumentsCount--;
        } else if (notif.id.startsWith('overdue_') &&
            _overdueDocumentsCount > 0) {
          _overdueDocumentsCount--;
        }
      }

      _notifyListeners();
      _saveNotifications();
    }
  }

  /// ✅ Marcar todas como leídas
  void markAllAsRead() {
    _notifications = _notifications.map((n) => n.copyWith(isRead: true)).toList();
    _medicalRequestsCount = 0;
    _urgentDocumentsCount = 0;
    _overdueDocumentsCount = 0;
    _notifyListeners();
    _saveNotifications();
  }

  /// 🗑️ Eliminar notificación
  void deleteNotification(String notificationId) {
    _notifications.removeWhere((n) => n.id == notificationId);
    _notifyListeners();
    _saveNotifications();
  }

  /// 🗑️ Limpiar todas las notificaciones
  void clearAllNotifications() {
    _notifications.clear();
    _medicalRequestsCount = 0;
    _urgentDocumentsCount = 0;
    _overdueDocumentsCount = 0;
    _notifyListeners();
    _saveNotifications();
  }

  /// 🔍 Obtener por tipo
  List<EmployeeNotification> getByType(EmployeeNotificationType type) {
    return _notifications.where((n) => n.type == type).toList();
  }

  /// 🔍 Obtener no leídas
  List<EmployeeNotification> getUnread() {
    return _notifications.where((n) => !n.isRead).toList();
  }

  /// 🔍 Obtener de hoy
  List<EmployeeNotification> getToday() {
    final today = DateTime.now();
    return _notifications.where((n) {
      return n.timestamp.year == today.year &&
          n.timestamp.month == today.month &&
          n.timestamp.day == today.day;
    }).toList();
  }

  // ====== CONFIGURACIÓN ======

  Future<void> setAttendanceRemindersEnabled(bool enabled) async {
    _attendanceRemindersEnabled = enabled;
    await _prefs?.setBool('emp_attendance_reminders', enabled);
    _notifyListeners();
  }

  Future<void> setMedicalNotificationsEnabled(bool enabled) async {
    _medicalNotificationsEnabled = enabled;
    await _prefs?.setBool('emp_medical_notifications', enabled);
    _notifyListeners();
  }

  Future<void> setPushNotificationsEnabled(bool enabled) async {
    _pushNotificationsEnabled = enabled;
    await _prefs?.setBool('emp_push_notifications', enabled);
    _notifyListeners();
  }

  Future<void> setSoundEnabled(bool enabled) async {
    _soundEnabled = enabled;
    await _prefs?.setBool('emp_sound', enabled);
    _notifyListeners();
  }

  Future<void> setVibrationEnabled(bool enabled) async {
    _vibrationEnabled = enabled;
    await _prefs?.setBool('emp_vibration', enabled);
    _notifyListeners();
  }

  Future<void> setReminderTime(String time) async {
    _reminderTime = time;
    await _prefs?.setString('emp_reminder_time', time);
    _notifyListeners();
  }

  // ====== PERSISTENCIA ======

  void _loadSettings() {
    _attendanceRemindersEnabled =
        _prefs?.getBool('emp_attendance_reminders') ?? true;
    _medicalNotificationsEnabled =
        _prefs?.getBool('emp_medical_notifications') ?? true;
    _pushNotificationsEnabled =
        _prefs?.getBool('emp_push_notifications') ?? true;
    _soundEnabled = _prefs?.getBool('emp_sound') ?? true;
    _vibrationEnabled = _prefs?.getBool('emp_vibration') ?? true;
    _reminderTime = _prefs?.getString('emp_reminder_time') ?? '08:00';
  }

  void _loadNotifications() {
    final notificationsString = _prefs?.getString('emp_notifications');
    if (notificationsString != null) {
      try {
        final List<dynamic> notificationsJson = jsonDecode(notificationsString);
        _notifications = notificationsJson
            .map((json) => EmployeeNotification.fromJson(json))
            .toList();
      } catch (e) {
        debugPrint('❌ [EMPLOYEE-NOTIF] Error cargando: $e');
        _notifications = [];
      }
    }
  }

  Future<void> _saveNotifications() async {
    final notificationsJson = _notifications.map((n) => n.toJson()).toList();
    await _prefs?.setString('emp_notifications', jsonEncode(notificationsJson));
  }

  void _notifyListeners() {
    _onNotificationsChanged?.call(_notifications);
  }

  /// 🧪 Notificación de prueba
  Future<void> testNotification() async {
    await showSystemAnnouncement(
      'Prueba',
      'Esta es una notificación de prueba para verificar el sistema.',
    );
  }
}
