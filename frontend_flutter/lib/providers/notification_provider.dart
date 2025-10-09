import 'package:flutter/foundation.dart';
import '../services/notification_service.dart';
import '../models/notification.dart' as AppNotification;

class NotificationProvider extends ChangeNotifier {
  final NotificationService _notificationService;
  
  List<AppNotification.Notification> _notifications = [];
  bool _isLoading = false;
  String? _error;
  
  NotificationProvider(this._notificationService) {
    _notificationService.setNotificationListener(_onNotificationsChanged);
    _loadNotifications();
  }
  
  // Getters
  List<AppNotification.Notification> get notifications => List.unmodifiable(_notifications);
  bool get isLoading => _isLoading;
  String? get error => _error;
  int get unreadCount => _notificationService.unreadCount;
  
  // Configuraciones
  bool get attendanceRemindersEnabled => _notificationService.attendanceRemindersEnabled;
  bool get pushNotificationsEnabled => _notificationService.pushNotificationsEnabled;
  bool get soundEnabled => _notificationService.soundEnabled;
  bool get vibrationEnabled => _notificationService.vibrationEnabled;
  String get reminderTime => _notificationService.reminderTime;
  
  void _onNotificationsChanged(List<AppNotification.Notification> notifications) {
    _notifications = notifications;
    notifyListeners();
  }
  
  Future<void> _loadNotifications() async {
    _setLoading(true);
    try {
      _notifications = _notificationService.notifications;
      _clearError();
    } catch (e) {
      _setError('Error cargando notificaciones: $e');
    } finally {
      _setLoading(false);
    }
  }
  
  Future<void> markAsRead(String notificationId) async {
    try {
      _notificationService.markAsRead(notificationId);
      _clearError();
    } catch (e) {
      _setError('Error marcando notificación como leída: $e');
    }
  }
  
  Future<void> markAllAsRead() async {
    try {
      _notificationService.markAllAsRead();
      _clearError();
    } catch (e) {
      _setError('Error marcando todas las notificaciones como leídas: $e');
    }
  }
  
  Future<void> deleteNotification(String notificationId) async {
    try {
      _notificationService.deleteNotification(notificationId);
      _clearError();
    } catch (e) {
      _setError('Error eliminando notificación: $e');
    }
  }
  
  Future<void> clearAllNotifications() async {
    try {
      _notificationService.clearAllNotifications();
      _clearError();
    } catch (e) {
      _setError('Error limpiando todas las notificaciones: $e');
    }
  }
  
  Future<void> testNotification() async {
    try {
      await _notificationService.testNotification();
      _clearError();
    } catch (e) {
      _setError('Error enviando notificación de prueba: $e');
    }
  }
  
  // Configuraciones
  Future<void> setAttendanceRemindersEnabled(bool enabled) async {
    try {
      await _notificationService.setAttendanceRemindersEnabled(enabled);
      notifyListeners();
      _clearError();
    } catch (e) {
      _setError('Error configurando recordatorios: $e');
    }
  }
  
  Future<void> setPushNotificationsEnabled(bool enabled) async {
    try {
      await _notificationService.setPushNotificationsEnabled(enabled);
      notifyListeners();
      _clearError();
    } catch (e) {
      _setError('Error configurando notificaciones push: $e');
    }
  }
  
  Future<void> setSoundEnabled(bool enabled) async {
    try {
      await _notificationService.setSoundEnabled(enabled);
      notifyListeners();
      _clearError();
    } catch (e) {
      _setError('Error configurando sonido: $e');
    }
  }
  
  Future<void> setVibrationEnabled(bool enabled) async {
    try {
      await _notificationService.setVibrationEnabled(enabled);
      notifyListeners();
      _clearError();
    } catch (e) {
      _setError('Error configurando vibración: $e');
    }
  }
  
  Future<void> setReminderTime(String time) async {
    try {
      await _notificationService.setReminderTime(time);
      notifyListeners();
      _clearError();
    } catch (e) {
      _setError('Error configurando hora de recordatorio: $e');
    }
  }
  
  // Métodos para enviar notificaciones específicas
  Future<void> showAttendanceReminder() async {
    try {
      await _notificationService.showAttendanceReminder();
      _clearError();
    } catch (e) {
      _setError('Error enviando recordatorio de asistencia: $e');
    }
  }
  
  Future<void> showCheckInSuccess(String location) async {
    try {
      await _notificationService.showCheckInSuccess(location);
      _clearError();
    } catch (e) {
      _setError('Error enviando notificación de entrada: $e');
    }
  }
  
  Future<void> showCheckOutSuccess(String workingHours) async {
    try {
      await _notificationService.showCheckOutSuccess(workingHours);
      _clearError();
    } catch (e) {
      _setError('Error enviando notificación de salida: $e');
    }
  }
  
  Future<void> showLateArrivalWarning() async {
    try {
      await _notificationService.showLateArrivalWarning();
      _clearError();
    } catch (e) {
      _setError('Error enviando advertencia de tardanza: $e');
    }
  }
  
  Future<void> showSystemAnnouncement(String title, String message) async {
    try {
      await _notificationService.showSystemAnnouncement(title, message);
      _clearError();
    } catch (e) {
      _setError('Error enviando anuncio del sistema: $e');
    }
  }
  
  // Filtros de notificaciones
  List<AppNotification.Notification> getNotificationsByType(AppNotification.NotificationType type) {
    return _notifications.where((notification) => notification.type == type).toList();
  }
  
  List<AppNotification.Notification> getUnreadNotifications() {
    return _notifications.where((notification) => !notification.isRead).toList();
  }
  
  List<AppNotification.Notification> getTodayNotifications() {
    final today = DateTime.now();
    return _notifications.where((notification) {
      final notificationDate = notification.timestamp;
      return notificationDate.year == today.year &&
             notificationDate.month == today.month &&
             notificationDate.day == today.day;
    }).toList();
  }
  
  List<AppNotification.Notification> getHighPriorityNotifications() {
    return _notifications.where((notification) => 
        notification.priority == AppNotification.NotificationPriority.high ||
        notification.priority == AppNotification.NotificationPriority.urgent).toList();
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