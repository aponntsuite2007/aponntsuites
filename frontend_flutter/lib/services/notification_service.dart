import 'dart:convert';
import 'package:flutter/foundation.dart';
// import 'package:flutter_local_notifications/flutter_local_notifications.dart';  // Temporalmente deshabilitado
import 'package:shared_preferences/shared_preferences.dart';
import 'package:timezone/timezone.dart' as tz;
import 'package:timezone/data/latest.dart' as tz;
import '../models/notification.dart' as AppNotification;

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  // final FlutterLocalNotificationsPlugin _localNotifications = FlutterLocalNotificationsPlugin();  // Temporalmente deshabilitado
  SharedPreferences? _prefs;
  
  List<AppNotification.Notification> _notifications = [];
  Function(List<AppNotification.Notification>)? _onNotificationsChanged;

  // Configuraciones
  bool _attendanceRemindersEnabled = true;
  bool _pushNotificationsEnabled = true;
  bool _soundEnabled = true;
  bool _vibrationEnabled = true;
  String _reminderTime = '08:00';

  bool get attendanceRemindersEnabled => _attendanceRemindersEnabled;
  bool get pushNotificationsEnabled => _pushNotificationsEnabled;
  bool get soundEnabled => _soundEnabled;
  bool get vibrationEnabled => _vibrationEnabled;
  String get reminderTime => _reminderTime;
  List<AppNotification.Notification> get notifications => List.unmodifiable(_notifications);

  // Contadores para badges médicos
  int _medicalRequestsCount = 0;
  int _urgentDocumentsCount = 0;
  int _overdueDocumentsCount = 0;

  int get medicalRequestsCount => _medicalRequestsCount;
  int get urgentDocumentsCount => _urgentDocumentsCount;
  int get overdueDocumentsCount => _overdueDocumentsCount;
  int get totalMedicalBadgeCount => _medicalRequestsCount + _urgentDocumentsCount + _overdueDocumentsCount;

  Future<void> initialize() async {
    // Inicializar timezone
    tz.initializeTimeZones();
    
    _prefs = await SharedPreferences.getInstance();
    _loadSettings();
    // await _initializeLocalNotifications();  // Temporalmente deshabilitado
    // await _scheduleAttendanceReminders();   // Temporalmente deshabilitado
  }

  void setNotificationListener(Function(List<AppNotification.Notification>) listener) {
    _onNotificationsChanged = listener;
  }

  // Métodos temporalmente deshabilitados pero manteniendo la interfaz
  Future<void> showAttendanceReminder() async {
    if (!_attendanceRemindersEnabled) return;
    
    final notification = AppNotification.Notification(
      id: 'reminder_${DateTime.now().millisecondsSinceEpoch}',
      title: '⏰ Recordatorio de Asistencia',
      body: 'No olvides registrar tu asistencia de hoy',
      type: AppNotification.NotificationType.reminder,
      timestamp: DateTime.now(),
      isRead: false,
      priority: AppNotification.NotificationPriority.high,
    );

    _addNotification(notification);
    // await _showLocalNotification(notification);  // Temporalmente deshabilitado
  }

  Future<void> showCheckInSuccess(String location) async {
    final notification = AppNotification.Notification(
      id: 'checkin_${DateTime.now().millisecondsSinceEpoch}',
      title: '✅ Entrada Registrada',
      body: 'Entrada registrada exitosamente en $location',
      type: AppNotification.NotificationType.attendance,
      timestamp: DateTime.now(),
      isRead: false,
      priority: AppNotification.NotificationPriority.medium,
    );

    _addNotification(notification);
    // await _showLocalNotification(notification);  // Temporalmente deshabilitado
  }

  Future<void> showCheckOutSuccess(String workingHours) async {
    final notification = AppNotification.Notification(
      id: 'checkout_${DateTime.now().millisecondsSinceEpoch}',
      title: '🏁 Salida Registrada',
      body: 'Salida registrada. Horas trabajadas: $workingHours',
      type: AppNotification.NotificationType.attendance,
      timestamp: DateTime.now(),
      isRead: false,
      priority: AppNotification.NotificationPriority.medium,
    );

    _addNotification(notification);
    // await _showLocalNotification(notification);  // Temporalmente deshabilitado
  }

  Future<void> showLateArrivalWarning() async {
    final notification = AppNotification.Notification(
      id: 'late_${DateTime.now().millisecondsSinceEpoch}',
      title: '⚠️ Llegada Tardía',
      body: 'Has llegado tarde. Se registrará como tardanza.',
      type: AppNotification.NotificationType.warning,
      timestamp: DateTime.now(),
      isRead: false,
      priority: AppNotification.NotificationPriority.high,
    );

    _addNotification(notification);
    // await _showLocalNotification(notification);  // Temporalmente deshabilitado
  }

  Future<void> showSystemAnnouncement(String title, String message) async {
    final notification = AppNotification.Notification(
      id: 'announcement_${DateTime.now().millisecondsSinceEpoch}',
      title: '📢 $title',
      body: message,
      type: AppNotification.NotificationType.announcement,
      timestamp: DateTime.now(),
      isRead: false,
      priority: AppNotification.NotificationPriority.high,
    );

    _addNotification(notification);
    // await _showLocalNotification(notification);  // Temporalmente deshabilitado
  }

  Future<void> showAbsenceConfirmation(String absenceType, String date) async {
    final notification = AppNotification.Notification(
      id: 'absence_${DateTime.now().millisecondsSinceEpoch}',
      title: '📋 Inasistencia Notificada',
      body: 'Tu inasistencia $absenceType para el $date ha sido enviada y registrada',
      type: AppNotification.NotificationType.attendance,
      timestamp: DateTime.now(),
      isRead: false,
      priority: AppNotification.NotificationPriority.medium,
    );

    _addNotification(notification);
    // await _showLocalNotification(notification);  // Temporalmente deshabilitado
  }

  Future<void> showAbsenceResponse(String responseType, String message) async {
    final notification = AppNotification.Notification(
      id: 'absence_response_${DateTime.now().millisecondsSinceEpoch}',
      title: responseType == 'approved' ? '✅ Inasistencia Aprobada' : '❌ Inasistencia Rechazada',
      body: message,
      type: AppNotification.NotificationType.announcement,
      timestamp: DateTime.now(),
      isRead: false,
      priority: AppNotification.NotificationPriority.high,
    );

    _addNotification(notification);
    // await _showLocalNotification(notification);  // Temporalmente deshabilitado
  }

  void _addNotification(AppNotification.Notification notification) {
    _notifications.insert(0, notification);
    
    // Mantener solo las últimas 100 notificaciones
    if (_notifications.length > 100) {
      _notifications = _notifications.take(100).toList();
    }
    
    _onNotificationsChanged?.call(_notifications);
    _saveNotifications();
  }

  void markAsRead(String notificationId) {
    final index = _notifications.indexWhere((n) => n.id == notificationId);
    if (index >= 0) {
      _notifications[index] = _notifications[index].copyWith(isRead: true);
      _onNotificationsChanged?.call(_notifications);
      _saveNotifications();
    }
  }

  void markAllAsRead() {
    _notifications = _notifications.map((n) => n.copyWith(isRead: true)).toList();
    _onNotificationsChanged?.call(_notifications);
    _saveNotifications();
  }

  void deleteNotification(String notificationId) {
    _notifications.removeWhere((n) => n.id == notificationId);
    _onNotificationsChanged?.call(_notifications);
    _saveNotifications();
  }

  void clearAllNotifications() {
    _notifications.clear();
    _onNotificationsChanged?.call(_notifications);
    _saveNotifications();
  }

  int get unreadCount => _notifications.where((n) => !n.isRead).length;

  // Configuración de notificaciones
  Future<void> setAttendanceRemindersEnabled(bool enabled) async {
    _attendanceRemindersEnabled = enabled;
    await _prefs?.setBool('attendance_reminders_enabled', enabled);
  }

  Future<void> setPushNotificationsEnabled(bool enabled) async {
    _pushNotificationsEnabled = enabled;
    await _prefs?.setBool('push_notifications_enabled', enabled);
  }

  Future<void> setSoundEnabled(bool enabled) async {
    _soundEnabled = enabled;
    await _prefs?.setBool('sound_enabled', enabled);
  }

  Future<void> setVibrationEnabled(bool enabled) async {
    _vibrationEnabled = enabled;
    await _prefs?.setBool('vibration_enabled', enabled);
  }

  Future<void> setReminderTime(String time) async {
    _reminderTime = time;
    await _prefs?.setString('reminder_time', time);
  }

  void _loadSettings() {
    _attendanceRemindersEnabled = _prefs?.getBool('attendance_reminders_enabled') ?? true;
    _pushNotificationsEnabled = _prefs?.getBool('push_notifications_enabled') ?? true;
    _soundEnabled = _prefs?.getBool('sound_enabled') ?? true;
    _vibrationEnabled = _prefs?.getBool('vibration_enabled') ?? true;
    _reminderTime = _prefs?.getString('reminder_time') ?? '08:00';
    _loadNotifications();
  }

  void _saveNotifications() {
    final notificationsJson = _notifications.map((n) => n.toJson()).toList();
    _prefs?.setString('notifications', json.encode(notificationsJson));
  }

  void _loadNotifications() {
    final notificationsString = _prefs?.getString('notifications');
    if (notificationsString != null) {
      try {
        final List<dynamic> notificationsJson = json.decode(notificationsString);
        _notifications = notificationsJson
            .map((json) => AppNotification.Notification.fromJson(json))
            .toList();
      } catch (e) {
        print('Error cargando notificaciones: $e');
        _notifications = [];
      }
    }
  }

  // === MÉTODOS PARA NOTIFICACIONES MÉDICAS FEHACIENTES ===

  // Mostrar notificación de nueva solicitud médica
  Future<void> showMedicalRequestNotification({
    required String title,
    required String body,
    required String documentType,
    Map<String, dynamic>? data,
  }) async {
    final notification = AppNotification.Notification(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      title: title,
      body: body,
      type: 'medical_request',
      timestamp: DateTime.now(),
      isRead: false,
      data: data ?? {'documentType': documentType},
      priority: 'high',
    );

    _addNotification(notification);
    _medicalRequestsCount++;
    _notifyListeners();

    if (_pushNotificationsEnabled) {
      // Aquí iría la lógica de notificación push nativa cuando esté habilitada
      print('📱 MEDICAL REQUEST: $title - $body');
    }
  }

  // Mostrar notificación de documento urgente
  Future<void> showUrgentDocumentNotification({
    required String title,
    required String body,
    required String documentType,
    int? daysUntilDue,
    Map<String, dynamic>? data,
  }) async {
    final notification = AppNotification.Notification(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      title: '⚡ $title',
      body: body,
      type: 'urgent_document',
      timestamp: DateTime.now(),
      isRead: false,
      data: data ?? {
        'documentType': documentType,
        'daysUntilDue': daysUntilDue,
      },
      priority: 'critical',
    );

    _addNotification(notification);
    _urgentDocumentsCount++;
    _notifyListeners();

    if (_pushNotificationsEnabled) {
      print('🚨 URGENT DOCUMENT: $title - $body');
    }
  }

  // Mostrar notificación de documento vencido
  Future<void> showOverdueDocumentNotification({
    required String title,
    required String body,
    required String documentType,
    int? daysOverdue,
    Map<String, dynamic>? data,
  }) async {
    final notification = AppNotification.Notification(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      title: '❌ $title',
      body: body,
      type: 'overdue_document',
      timestamp: DateTime.now(),
      isRead: false,
      data: data ?? {
        'documentType': documentType,
        'daysOverdue': daysOverdue,
      },
      priority: 'critical',
    );

    _addNotification(notification);
    _overdueDocumentsCount++;
    _notifyListeners();

    if (_pushNotificationsEnabled) {
      print('🔴 OVERDUE DOCUMENT: $title - $body');
    }
  }

  // Mostrar notificación de confirmación de cumplimiento
  Future<void> showCompletionConfirmationNotification({
    required String title,
    required String body,
    required String documentType,
    Map<String, dynamic>? data,
  }) async {
    final notification = AppNotification.Notification(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      title: '✅ $title',
      body: body,
      type: 'completion_confirmation',
      timestamp: DateTime.now(),
      isRead: false,
      data: data ?? {'documentType': documentType},
      priority: 'normal',
    );

    _addNotification(notification);
    _notifyListeners();

    if (_pushNotificationsEnabled) {
      print('✅ COMPLETION: $title - $body');
    }
  }

  // Limpiar notificaciones médicas específicas
  Future<void> clearMedicalNotifications({String? type}) async {
    if (type != null) {
      _notifications.removeWhere((n) => n.type == type);
      
      switch (type) {
        case 'medical_request':
          _medicalRequestsCount = 0;
          break;
        case 'urgent_document':
          _urgentDocumentsCount = 0;
          break;
        case 'overdue_document':
          _overdueDocumentsCount = 0;
          break;
      }
    } else {
      // Limpiar todas las notificaciones médicas
      _notifications.removeWhere((n) => [
        'medical_request',
        'urgent_document', 
        'overdue_document',
        'completion_confirmation'
      ].contains(n.type));
      
      _medicalRequestsCount = 0;
      _urgentDocumentsCount = 0;
      _overdueDocumentsCount = 0;
    }
    
    _saveNotifications();
    _notifyListeners();
  }

  // Marcar notificación médica como leída
  Future<void> markMedicalNotificationAsRead(String notificationId) async {
    final notification = _notifications.firstWhere(
      (n) => n.id == notificationId,
      orElse: () => throw Exception('Notification not found'),
    );
    
    if (!notification.isRead) {
      notification.isRead = true;
      
      // Decrementar contadores apropiados
      switch (notification.type) {
        case 'medical_request':
          if (_medicalRequestsCount > 0) _medicalRequestsCount--;
          break;
        case 'urgent_document':
          if (_urgentDocumentsCount > 0) _urgentDocumentsCount--;
          break;
        case 'overdue_document':
          if (_overdueDocumentsCount > 0) _overdueDocumentsCount--;
          break;
      }
      
      _saveNotifications();
      _notifyListeners();
    }
  }

  // Obtener notificaciones médicas no leídas
  List<AppNotification.Notification> getUnreadMedicalNotifications() {
    return _notifications
        .where((n) => !n.isRead && [
          'medical_request',
          'urgent_document',
          'overdue_document',
          'completion_confirmation'
        ].contains(n.type))
        .toList();
  }

  // Actualizar contadores desde datos externos
  void updateMedicalBadgeCounts({
    int? medicalRequests,
    int? urgentDocuments, 
    int? overdueDocuments,
  }) {
    if (medicalRequests != null) _medicalRequestsCount = medicalRequests;
    if (urgentDocuments != null) _urgentDocumentsCount = urgentDocuments;
    if (overdueDocuments != null) _overdueDocumentsCount = overdueDocuments;
    _notifyListeners();
  }


  // Método auxiliar para notificar cambios
  void _notifyListeners() {
    _onNotificationsChanged?.call(_notifications);
  }

  Future<void> testNotification() async {
    await showSystemAnnouncement(
      'Notificación de Prueba',
      'Esta es una notificación de prueba para verificar el funcionamiento del sistema.',
    );
  }

  // Método de testing para notificaciones médicas
  Future<void> testMedicalNotifications() async {
    await showMedicalRequestNotification(
      title: 'Nueva Solicitud Médica',
      body: 'El Dr. García solicita que subas tu certificado médico. Vence en 3 días.',
      documentType: 'certificates',
    );

    await Future.delayed(Duration(seconds: 1));

    await showUrgentDocumentNotification(
      title: 'Documento Urgente',
      body: 'Tu estudio médico vence mañana. Súbelo ahora para evitar inconvenientes.',
      documentType: 'studies',
      daysUntilDue: 1,
    );

    await Future.delayed(Duration(seconds: 1));

    await showOverdueDocumentNotification(
      title: 'Documento Vencido',
      body: 'Tu receta médica venció hace 2 días. Contacta al área médica urgentemente.',
      documentType: 'recipes',
      daysOverdue: 2,
    );
  }
}