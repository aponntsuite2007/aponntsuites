import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/notification_provider.dart';
import '../../config/theme.dart';
import '../../models/notification.dart' as AppNotification;

class NotificationsScreen extends StatefulWidget {
  @override
  _NotificationsScreenState createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> 
    with TickerProviderStateMixin {
  late TabController _tabController;
  String _selectedFilter = 'all';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Notificaciones'),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabs: [
            Tab(text: 'TODAS'),
            Tab(text: 'NO LEÍDAS'),
            Tab(text: 'HOY'),
            Tab(text: 'IMPORTANTES'),
          ],
        ),
        actions: [
          PopupMenuButton<String>(
            onSelected: _handleMenuAction,
            itemBuilder: (context) => [
              PopupMenuItem(
                value: 'mark_all_read',
                child: ListTile(
                  leading: Icon(Icons.mark_email_read),
                  title: Text('Marcar todas como leídas'),
                  dense: true,
                ),
              ),
              PopupMenuItem(
                value: 'clear_all',
                child: ListTile(
                  leading: Icon(Icons.clear_all),
                  title: Text('Limpiar todas'),
                  dense: true,
                ),
              ),
              PopupMenuItem(
                value: 'test_notification',
                child: ListTile(
                  leading: Icon(Icons.notifications_active),
                  title: Text('Enviar prueba'),
                  dense: true,
                ),
              ),
              PopupMenuItem(
                value: 'settings',
                child: ListTile(
                  leading: Icon(Icons.settings),
                  title: Text('Configuración'),
                  dense: true,
                ),
              ),
            ],
          ),
        ],
      ),
      body: Consumer<NotificationProvider>(
        builder: (context, notificationProvider, child) {
          return Column(
            children: [
              _buildStatsCard(notificationProvider),
              Expanded(
                child: TabBarView(
                  controller: _tabController,
                  children: [
                    _buildNotificationsList(notificationProvider.notifications),
                    _buildNotificationsList(notificationProvider.getUnreadNotifications()),
                    _buildNotificationsList(notificationProvider.getTodayNotifications()),
                    _buildNotificationsList(notificationProvider.getHighPriorityNotifications()),
                  ],
                ),
              ),
            ],
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showNotificationSettings(context),
        icon: Icon(Icons.settings),
        label: Text('Configurar'),
        backgroundColor: AppTheme.primaryColor,
      ),
    );
  }

  Widget _buildStatsCard(NotificationProvider provider) {
    return Card(
      margin: EdgeInsets.all(16),
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Row(
          children: [
            Expanded(
              child: Column(
                children: [
                  Text(
                    '${provider.notifications.length}',
                    style: AppTheme.headingStyle.copyWith(
                      color: AppTheme.primaryColor,
                      fontSize: 24,
                    ),
                  ),
                  Text('Total', style: AppTheme.captionStyle),
                ],
              ),
            ),
            Expanded(
              child: Column(
                children: [
                  Text(
                    '${provider.unreadCount}',
                    style: AppTheme.headingStyle.copyWith(
                      color: AppTheme.warningColor,
                      fontSize: 24,
                    ),
                  ),
                  Text('No leídas', style: AppTheme.captionStyle),
                ],
              ),
            ),
            Expanded(
              child: Column(
                children: [
                  Text(
                    '${provider.getTodayNotifications().length}',
                    style: AppTheme.headingStyle.copyWith(
                      color: AppTheme.successColor,
                      fontSize: 24,
                    ),
                  ),
                  Text('Hoy', style: AppTheme.captionStyle),
                ],
              ),
            ),
            Expanded(
              child: Column(
                children: [
                  Text(
                    '${provider.getHighPriorityNotifications().length}',
                    style: AppTheme.headingStyle.copyWith(
                      color: AppTheme.errorColor,
                      fontSize: 24,
                    ),
                  ),
                  Text('Importantes', style: AppTheme.captionStyle),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNotificationsList(List<AppNotification.Notification> notifications) {
    if (notifications.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.notifications_none,
              size: 64,
              color: AppTheme.textSecondary,
            ),
            SizedBox(height: 16),
            Text(
              'No hay notificaciones',
              style: AppTheme.subtitleStyle.copyWith(
                color: AppTheme.textSecondary,
              ),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: EdgeInsets.symmetric(horizontal: 16),
      itemCount: notifications.length,
      itemBuilder: (context, index) {
        final notification = notifications[index];
        return _buildNotificationCard(notification);
      },
    );
  }

  Widget _buildNotificationCard(AppNotification.Notification notification) {
    return Card(
      margin: EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: () => _handleNotificationTap(notification),
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(8),
            border: notification.isRead 
                ? null 
                : Border.all(color: AppTheme.primaryColor.withOpacity(0.3)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: notification.typeColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      notification.typeIcon,
                      color: notification.typeColor,
                      size: 20,
                    ),
                  ),
                  SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                notification.title,
                                style: AppTheme.titleStyle.copyWith(
                                  fontSize: 16,
                                  fontWeight: notification.isRead 
                                      ? FontWeight.normal 
                                      : FontWeight.bold,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            if (!notification.isRead)
                              Container(
                                width: 8,
                                height: 8,
                                decoration: BoxDecoration(
                                  color: AppTheme.primaryColor,
                                  shape: BoxShape.circle,
                                ),
                              ),
                          ],
                        ),
                        Text(
                          notification.relativeTime,
                          style: AppTheme.captionStyle.copyWith(
                            color: AppTheme.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  PopupMenuButton<String>(
                    onSelected: (value) => _handleNotificationAction(value, notification),
                    itemBuilder: (context) => [
                      if (!notification.isRead)
                        PopupMenuItem(
                          value: 'mark_read',
                          child: ListTile(
                            leading: Icon(Icons.mark_email_read),
                            title: Text('Marcar como leída'),
                            dense: true,
                          ),
                        ),
                      PopupMenuItem(
                        value: 'delete',
                        child: ListTile(
                          leading: Icon(Icons.delete, color: AppTheme.errorColor),
                          title: Text('Eliminar'),
                          dense: true,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              SizedBox(height: 12),
              Text(
                notification.body,
                style: AppTheme.bodyStyle.copyWith(
                  color: notification.isRead 
                      ? AppTheme.textSecondary 
                      : AppTheme.textPrimary,
                ),
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
              ),
              SizedBox(height: 8),
              Row(
                children: [
                  Container(
                    padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: notification.typeColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      notification.typeDisplayName,
                      style: TextStyle(
                        color: notification.typeColor,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  SizedBox(width: 8),
                  if (notification.priority == AppNotification.NotificationPriority.high ||
                      notification.priority == AppNotification.NotificationPriority.urgent)
                    Container(
                      padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppTheme.errorColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        notification.priorityDisplayName,
                        style: TextStyle(
                          color: AppTheme.errorColor,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _handleNotificationTap(AppNotification.Notification notification) {
    if (!notification.isRead) {
      Provider.of<NotificationProvider>(context, listen: false)
          .markAsRead(notification.id);
    }

    // Manejar navegación según el tipo de notificación
    if (notification.actionUrl != null) {
      // Navegar a la URL específica de la notificación
    }
  }

  void _handleNotificationAction(String action, AppNotification.Notification notification) {
    final notificationProvider = Provider.of<NotificationProvider>(context, listen: false);

    switch (action) {
      case 'mark_read':
        notificationProvider.markAsRead(notification.id);
        break;
      case 'delete':
        _confirmDelete(notification, notificationProvider);
        break;
    }
  }

  void _handleMenuAction(String action) {
    final notificationProvider = Provider.of<NotificationProvider>(context, listen: false);

    switch (action) {
      case 'mark_all_read':
        notificationProvider.markAllAsRead();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Todas las notificaciones marcadas como leídas'),
            backgroundColor: AppTheme.successColor,
          ),
        );
        break;
      case 'clear_all':
        _confirmClearAll(notificationProvider);
        break;
      case 'test_notification':
        notificationProvider.testNotification();
        break;
      case 'settings':
        _showNotificationSettings(context);
        break;
    }
  }

  void _confirmDelete(AppNotification.Notification notification, NotificationProvider provider) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Eliminar notificación'),
        content: Text('¿Estás seguro de que quieres eliminar esta notificación?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () {
              provider.deleteNotification(notification.id);
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Notificación eliminada'),
                  backgroundColor: AppTheme.successColor,
                ),
              );
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.errorColor),
            child: Text('Eliminar'),
          ),
        ],
      ),
    );
  }

  void _confirmClearAll(NotificationProvider provider) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Limpiar todas las notificaciones'),
        content: Text('¿Estás seguro de que quieres eliminar todas las notificaciones? Esta acción no se puede deshacer.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () {
              provider.clearAllNotifications();
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Todas las notificaciones eliminadas'),
                  backgroundColor: AppTheme.successColor,
                ),
              );
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.errorColor),
            child: Text('Limpiar todo'),
          ),
        ],
      ),
    );
  }

  void _showNotificationSettings(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => NotificationSettingsScreen(),
      ),
    );
  }
}

class NotificationSettingsScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Configuración de Notificaciones'),
      ),
      body: Consumer<NotificationProvider>(
        builder: (context, notificationProvider, child) {
          return ListView(
            padding: EdgeInsets.all(16),
            children: [
              _buildSettingsSection(
                'Recordatorios de Asistencia',
                [
                  SwitchListTile(
                    title: Text('Recordatorios diarios'),
                    subtitle: Text('Recordatorio para marcar asistencia'),
                    value: notificationProvider.attendanceRemindersEnabled,
                    onChanged: notificationProvider.setAttendanceRemindersEnabled,
                  ),
                  ListTile(
                    title: Text('Hora del recordatorio'),
                    subtitle: Text(notificationProvider.reminderTime),
                    trailing: Icon(Icons.access_time),
                    onTap: () => _selectReminderTime(context, notificationProvider),
                  ),
                ],
              ),
              _buildSettingsSection(
                'Notificaciones Push',
                [
                  SwitchListTile(
                    title: Text('Notificaciones push'),
                    subtitle: Text('Recibir notificaciones en tiempo real'),
                    value: notificationProvider.pushNotificationsEnabled,
                    onChanged: notificationProvider.setPushNotificationsEnabled,
                  ),
                  SwitchListTile(
                    title: Text('Sonido'),
                    subtitle: Text('Reproducir sonido en notificaciones'),
                    value: notificationProvider.soundEnabled,
                    onChanged: notificationProvider.setSoundEnabled,
                  ),
                  SwitchListTile(
                    title: Text('Vibración'),
                    subtitle: Text('Vibrar al recibir notificaciones'),
                    value: notificationProvider.vibrationEnabled,
                    onChanged: notificationProvider.setVibrationEnabled,
                  ),
                ],
              ),
              _buildSettingsSection(
                'Pruebas',
                [
                  ListTile(
                    title: Text('Enviar notificación de prueba'),
                    subtitle: Text('Probar el sistema de notificaciones'),
                    trailing: Icon(Icons.send),
                    onTap: () {
                      notificationProvider.testNotification();
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Notificación de prueba enviada'),
                          backgroundColor: AppTheme.primaryColor,
                        ),
                      );
                    },
                  ),
                ],
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildSettingsSection(String title, List<Widget> children) {
    return Card(
      margin: EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: EdgeInsets.all(16),
            child: Text(
              title,
              style: AppTheme.titleStyle.copyWith(fontSize: 18),
            ),
          ),
          ...children,
        ],
      ),
    );
  }

  Future<void> _selectReminderTime(BuildContext context, NotificationProvider provider) async {
    final timeParts = provider.reminderTime.split(':');
    final initialTime = TimeOfDay(
      hour: int.parse(timeParts[0]),
      minute: int.parse(timeParts[1]),
    );

    final TimeOfDay? picked = await showTimePicker(
      context: context,
      initialTime: initialTime,
    );

    if (picked != null) {
      final timeString = '${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}';
      provider.setReminderTime(timeString);
    }
  }
}