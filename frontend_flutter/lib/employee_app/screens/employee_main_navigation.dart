/*
 * 🧭 EMPLOYEE MAIN NAVIGATION
 * ============================
 * Navegación principal para la APP DEL EMPLEADO
 * Estructura de tabs con BottomNavigationBar + Drawer
 *
 * Tabs principales:
 * 1. Fichaje - Captura biométrica
 * 2. Médico - Dashboard médico
 * 3. Historial - Historial de asistencia
 * 4. Notificaciones - Centro de notificaciones
 * 5. Más - Menú con todas las funciones
 *
 * Menú Drawer:
 * - Mi Perfil (solicitar cambios)
 * - Documentos (con vencimientos)
 * - Liquidaciones (recibos de sueldo)
 * - Vacaciones (solicitar y ver saldo)
 * - Permisos y solicitudes
 * - Capacitaciones (completar desde app)
 * - Tareas asignadas
 * - Sanciones (historial propio)
 * - Procedimientos (políticas y manuales) ⭐ NUEVO
 * - HSE/Seguridad (EPP y cumplimiento) ⭐ NUEVO
 * - Info Legal (comunicaciones legales) ⭐ NUEVO
 *
 * Fecha: 2025-12-08
 * Versión: 2.1.0
 *
 * ⚠️ ESTE ARCHIVO ES INDEPENDIENTE - NO MODIFICA NADA DEL KIOSK
 */

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../services/employee_notification_service.dart';
import '../services/employee_websocket_service.dart';
import '../services/employee_api_service.dart';
import 'employee_biometric_screen.dart';
import 'employee_medical_dashboard.dart';
import 'employee_profile_screen.dart';
import 'employee_documents_screen.dart';
import 'employee_payslips_screen.dart';
import 'employee_vacations_screen.dart';
import 'employee_sanctions_screen.dart';
import 'employee_trainings_screen.dart';
import 'employee_tasks_screen.dart';
import 'employee_permissions_screen.dart';
import 'employee_procedures_screen.dart';
import 'employee_hse_screen.dart';
import 'employee_legal_screen.dart';

class EmployeeMainNavigation extends StatefulWidget {
  const EmployeeMainNavigation({Key? key}) : super(key: key);

  @override
  State<EmployeeMainNavigation> createState() => _EmployeeMainNavigationState();
}

class _EmployeeMainNavigationState extends State<EmployeeMainNavigation> {
  int _currentIndex = 0;
  final EmployeeNotificationService _notificationService =
      EmployeeNotificationService();
  final EmployeeWebSocketService _wsService = EmployeeWebSocketService();
  final EmployeeApiService _apiService = EmployeeApiService();
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();

  // Datos del usuario
  String? _userName;
  String? _userEmail;
  String? _companyName;
  String? _userPosition;
  String? _employeeId;
  String? _photoUrl;

  // Subscripciones
  StreamSubscription? _notificationSub;

  @override
  void initState() {
    super.initState();
    _initializeServices();
    _loadUserData();
  }

  @override
  void dispose() {
    _notificationSub?.cancel();
    super.dispose();
  }

  Future<void> _initializeServices() async {
    await _notificationService.initialize();

    // Escuchar cambios en notificaciones
    _notificationService.setNotificationListener((notifications) {
      if (mounted) setState(() {});
    });

    // TODO: Inicializar WebSocket con URL del servidor
    // await _wsService.initialize(serverUrl);
    // _wsService.connect();
  }

  Future<void> _loadUserData() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _userName = prefs.getString('user_name') ?? 'Empleado';
      _userEmail = prefs.getString('user_email') ?? '';
      _companyName = prefs.getString('company_name') ?? 'Mi Empresa';
      _userPosition = prefs.getString('user_position') ?? '';
      _employeeId = prefs.getString('employee_id') ?? '';
      _photoUrl = prefs.getString('user_photo_url');
    });

    // Inicializar API service
    await _apiService.initialize();
  }

  void _onTabTapped(int index) {
    if (index == 4) {
      // Tab "Más" abre el drawer
      _scaffoldKey.currentState?.openEndDrawer();
    } else {
      setState(() => _currentIndex = index);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      body: IndexedStack(
        index: _currentIndex,
        children: [
          const EmployeeBiometricScreen(),
          const EmployeeMedicalDashboard(),
          _buildHistoryTab(),
          _buildNotificationsTab(),
        ],
      ),
      endDrawer: _buildDrawer(),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex < 4 ? _currentIndex : 0,
        onTap: _onTabTapped,
        type: BottomNavigationBarType.fixed,
        selectedItemColor: Theme.of(context).primaryColor,
        unselectedItemColor: Colors.grey,
        items: [
          const BottomNavigationBarItem(
            icon: Icon(Icons.fingerprint),
            label: 'Fichaje',
          ),
          BottomNavigationBarItem(
            icon: Badge(
              isLabelVisible: _notificationService.totalMedicalBadgeCount > 0,
              label: Text('${_notificationService.totalMedicalBadgeCount}'),
              child: const Icon(Icons.medical_services),
            ),
            label: 'Médico',
          ),
          const BottomNavigationBarItem(
            icon: Icon(Icons.history),
            label: 'Historial',
          ),
          BottomNavigationBarItem(
            icon: Badge(
              isLabelVisible: _notificationService.unreadCount > 0,
              label: Text('${_notificationService.unreadCount}'),
              child: const Icon(Icons.notifications),
            ),
            label: 'Avisos',
          ),
          const BottomNavigationBarItem(
            icon: Icon(Icons.menu),
            label: 'Más',
          ),
        ],
      ),
    );
  }

  /// 📋 DRAWER con todas las funciones
  Widget _buildDrawer() {
    return Drawer(
      child: Container(
        color: const Color(0xFF0D1B2A),
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            // Header con info del usuario
            UserAccountsDrawerHeader(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [Colors.cyan.shade700, Colors.blue.shade800],
                ),
              ),
              currentAccountPicture: CircleAvatar(
                backgroundColor: Colors.white,
                child: _photoUrl != null && _photoUrl!.isNotEmpty
                    ? ClipOval(
                        child: Image.network(
                          _photoUrl!,
                          width: 72,
                          height: 72,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Text(
                            (_userName ?? 'E')[0].toUpperCase(),
                            style: TextStyle(
                              fontSize: 32,
                              color: Colors.cyan.shade700,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      )
                    : Text(
                        (_userName ?? 'E')[0].toUpperCase(),
                        style: TextStyle(
                          fontSize: 32,
                          color: Colors.cyan.shade700,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
              ),
              accountName: Text(
                _userName ?? 'Empleado',
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
              accountEmail: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (_userPosition != null && _userPosition!.isNotEmpty)
                    Text(
                      _userPosition!,
                      style: const TextStyle(fontSize: 12),
                    ),
                  Text(
                    'Legajo: ${_employeeId ?? 'N/A'}',
                    style: const TextStyle(fontSize: 11),
                  ),
                ],
              ),
            ),

            // Menú principal
            _buildDrawerItem(
              icon: Icons.person,
              title: 'Mi Perfil',
              subtitle: 'Ver y solicitar cambios',
              onTap: () => _navigateTo(const EmployeeProfileScreen()),
            ),
            _buildDrawerItem(
              icon: Icons.folder,
              title: 'Mis Documentos',
              subtitle: 'Documentos con vencimientos',
              onTap: () => _navigateTo(const EmployeeDocumentsScreen()),
              badge: '!',
              badgeColor: Colors.red,
            ),
            _buildDrawerItem(
              icon: Icons.receipt_long,
              title: 'Liquidaciones',
              subtitle: 'Recibos de sueldo',
              onTap: () => _navigateTo(const EmployeePayslipsScreen()),
            ),
            const Divider(color: Colors.white24),

            _buildDrawerItem(
              icon: Icons.beach_access,
              title: 'Vacaciones',
              subtitle: 'Solicitar y ver saldo',
              onTap: () => _navigateTo(const EmployeeVacationsScreen()),
            ),
            _buildDrawerItem(
              icon: Icons.event_busy,
              title: 'Permisos',
              subtitle: 'Solicitar licencias',
              onTap: () => _navigateTo(const EmployeePermissionsScreen()),
            ),
            const Divider(color: Colors.white24),

            _buildDrawerItem(
              icon: Icons.school,
              title: 'Capacitaciones',
              subtitle: 'Cursos asignados',
              onTap: () => _navigateTo(const EmployeeTrainingsScreen()),
            ),
            _buildDrawerItem(
              icon: Icons.task_alt,
              title: 'Tareas',
              subtitle: 'Tareas asignadas',
              onTap: () => _navigateTo(const EmployeeTasksScreen()),
            ),
            _buildDrawerItem(
              icon: Icons.gavel,
              title: 'Sanciones',
              subtitle: 'Historial de sanciones',
              onTap: () => _navigateTo(const EmployeeSanctionsScreen()),
            ),
            const Divider(color: Colors.white24),

            // === SECCIÓN: Compliance y Legal ===
            _buildDrawerItem(
              icon: Icons.assignment,
              title: 'Procedimientos',
              subtitle: 'Políticas y manuales',
              onTap: () => _navigateTo(const EmployeeProceduresScreen()),
            ),
            _buildDrawerItem(
              icon: Icons.health_and_safety,
              title: 'HSE / Seguridad',
              subtitle: 'EPP y cumplimiento',
              onTap: () => _navigateTo(const EmployeeHseScreen()),
            ),
            _buildDrawerItem(
              icon: Icons.account_balance,
              title: 'Info Legal',
              subtitle: 'Comunicaciones legales',
              onTap: () => _navigateTo(const EmployeeLegalScreen()),
            ),
            const Divider(color: Colors.white24),

            _buildDrawerItem(
              icon: Icons.settings,
              title: 'Configuración',
              subtitle: 'Notificaciones y preferencias',
              onTap: () => _showSettings(),
            ),
            _buildDrawerItem(
              icon: Icons.help_outline,
              title: 'Ayuda',
              subtitle: 'Soporte y FAQ',
              onTap: () => _showHelp(),
            ),
            const Divider(color: Colors.white24),

            _buildDrawerItem(
              icon: Icons.logout,
              title: 'Cerrar Sesión',
              iconColor: Colors.red,
              titleColor: Colors.red,
              onTap: () => _logout(),
            ),

            // Versión
            const SizedBox(height: 24),
            Center(
              child: Text(
                'Employee App v2.0.0',
                style: TextStyle(color: Colors.white.withOpacity(0.3), fontSize: 11),
              ),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildDrawerItem({
    required IconData icon,
    required String title,
    String? subtitle,
    required VoidCallback onTap,
    Color? iconColor,
    Color? titleColor,
    String? badge,
    Color? badgeColor,
  }) {
    return ListTile(
      leading: Stack(
        clipBehavior: Clip.none,
        children: [
          Icon(icon, color: iconColor ?? Colors.cyan),
          if (badge != null)
            Positioned(
              right: -6,
              top: -6,
              child: Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: badgeColor ?? Colors.red,
                  shape: BoxShape.circle,
                ),
                child: Text(
                  badge,
                  style: const TextStyle(color: Colors.white, fontSize: 10),
                ),
              ),
            ),
        ],
      ),
      title: Text(
        title,
        style: TextStyle(
          color: titleColor ?? Colors.white,
          fontWeight: FontWeight.w500,
        ),
      ),
      subtitle: subtitle != null
          ? Text(
              subtitle,
              style: const TextStyle(color: Colors.white54, fontSize: 12),
            )
          : null,
      trailing: const Icon(Icons.chevron_right, color: Colors.white38),
      onTap: () {
        Navigator.pop(context); // Cerrar drawer
        onTap();
      },
    );
  }

  void _navigateTo(Widget screen) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => screen),
    );
  }

  /// 📋 TAB: Historial de asistencia
  Widget _buildHistoryTab() {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Historial de Asistencia'),
        actions: [
          IconButton(
            icon: const Icon(Icons.calendar_month),
            onPressed: _showCalendarView,
            tooltip: 'Ver calendario',
          ),
        ],
      ),
      body: _HistoryContent(),
    );
  }

  void _showCalendarView() {
    // TODO: Implementar vista de calendario
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Vista de calendario próximamente')),
    );
  }

  /// 🔔 TAB: Notificaciones
  Widget _buildNotificationsTab() {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notificaciones'),
        actions: [
          if (_notificationService.unreadCount > 0)
            TextButton(
              onPressed: () {
                _notificationService.markAllAsRead();
                setState(() {});
              },
              child: const Text('Marcar todas como leídas'),
            ),
        ],
      ),
      body: _notificationService.notifications.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.notifications_none,
                      size: 64, color: Colors.grey.shade300),
                  const SizedBox(height: 16),
                  const Text(
                    'No hay notificaciones',
                    style: TextStyle(fontSize: 18, color: Colors.grey),
                  ),
                ],
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(8),
              itemCount: _notificationService.notifications.length,
              itemBuilder: (context, index) {
                final notification = _notificationService.notifications[index];
                return _NotificationCard(
                  notification: notification,
                  onTap: () {
                    _notificationService.markAsRead(notification.id);
                    setState(() {});
                  },
                  onDismiss: () {
                    _notificationService.deleteNotification(notification.id);
                    setState(() {});
                  },
                );
              },
            ),
    );
  }

  void _showSettings() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => _SettingsScreen(
          notificationService: _notificationService,
        ),
      ),
    );
  }

  void _showHelp() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Ayuda'),
        content: const Text(
          'Para asistencia técnica, contacta a tu departamento de RRHH o soporte técnico.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  void _logout() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cerrar sesión'),
        content: const Text('¿Estás seguro de que deseas cerrar sesión?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () async {
              final prefs = await SharedPreferences.getInstance();
              await prefs.clear();
              _wsService.disconnect();
              if (mounted) {
                Navigator.of(context).pushNamedAndRemoveUntil(
                  '/login',
                  (route) => false,
                );
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Cerrar sesión'),
          ),
        ],
      ),
    );
  }
}

// ====== WIDGETS AUXILIARES ======

class _HistoryContent extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    // TODO: Cargar historial real desde el API
    final mockHistory = List.generate(10, (index) {
      final date = DateTime.now().subtract(Duration(days: index));
      return {
        'date': date,
        'checkIn': '08:${(index * 3).toString().padLeft(2, '0')}',
        'checkOut': '17:${(30 + index).toString().padLeft(2, '0')}',
        'status': index == 2 ? 'late' : 'present',
        'hours': 8.5 - (index * 0.1),
      };
    });

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: mockHistory.length,
      itemBuilder: (context, index) {
        final item = mockHistory[index];
        final date = item['date'] as DateTime;
        final status = item['status'] as String;

        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor:
                  status == 'late' ? Colors.orange : Colors.green,
              child: Icon(
                status == 'late' ? Icons.access_time : Icons.check,
                color: Colors.white,
              ),
            ),
            title: Text(DateFormat('EEEE d MMMM', 'es').format(date)),
            subtitle: Text(
              'Entrada: ${item['checkIn']} - Salida: ${item['checkOut']}',
            ),
            trailing: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  '${(item['hours'] as double).toStringAsFixed(1)}h',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                Text(
                  status == 'late' ? 'Tardanza' : 'A tiempo',
                  style: TextStyle(
                    fontSize: 12,
                    color: status == 'late' ? Colors.orange : Colors.green,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _NotificationCard extends StatelessWidget {
  final EmployeeNotification notification;
  final VoidCallback onTap;
  final VoidCallback onDismiss;

  const _NotificationCard({
    required this.notification,
    required this.onTap,
    required this.onDismiss,
  });

  @override
  Widget build(BuildContext context) {
    return Dismissible(
      key: Key(notification.id),
      onDismissed: (_) => onDismiss(),
      background: Container(
        color: Colors.red,
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 16),
        child: const Icon(Icons.delete, color: Colors.white),
      ),
      child: Card(
        color: notification.isRead ? null : Colors.blue.shade50,
        child: ListTile(
          leading: Text(
            notification.typeIcon,
            style: const TextStyle(fontSize: 28),
          ),
          title: Text(
            notification.title,
            style: TextStyle(
              fontWeight:
                  notification.isRead ? FontWeight.normal : FontWeight.bold,
            ),
          ),
          subtitle: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(notification.body),
              const SizedBox(height: 4),
              Text(
                DateFormat('dd/MM HH:mm').format(notification.timestamp),
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey.shade600,
                ),
              ),
            ],
          ),
          onTap: onTap,
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final String subtitle;
  final IconData icon;
  final Color color;

  const _StatCard({
    required this.title,
    required this.value,
    required this.subtitle,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Icon(icon, color: color, size: 32),
            const SizedBox(height: 8),
            Text(
              value,
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            Text(
              title,
              style: const TextStyle(fontWeight: FontWeight.w500),
            ),
            Text(
              subtitle,
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey.shade600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ProfileActionTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final VoidCallback onTap;

  const _ProfileActionTile({
    required this.icon,
    required this.title,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon),
      title: Text(title),
      trailing: const Icon(Icons.chevron_right),
      onTap: onTap,
    );
  }
}

/// ⚙️ PANTALLA DE CONFIGURACIÓN
class _SettingsScreen extends StatefulWidget {
  final EmployeeNotificationService notificationService;

  const _SettingsScreen({required this.notificationService});

  @override
  State<_SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<_SettingsScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Configuración')),
      body: ListView(
        children: [
          const ListTile(
            title: Text(
              'Notificaciones',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: Colors.grey,
              ),
            ),
          ),
          SwitchListTile(
            title: const Text('Recordatorios de asistencia'),
            subtitle: const Text('Recibir recordatorios para fichar'),
            value: widget.notificationService.attendanceRemindersEnabled,
            onChanged: (value) async {
              await widget.notificationService
                  .setAttendanceRemindersEnabled(value);
              setState(() {});
            },
          ),
          SwitchListTile(
            title: const Text('Notificaciones médicas'),
            subtitle: const Text('Alertas de documentos pendientes'),
            value: widget.notificationService.medicalNotificationsEnabled,
            onChanged: (value) async {
              await widget.notificationService
                  .setMedicalNotificationsEnabled(value);
              setState(() {});
            },
          ),
          SwitchListTile(
            title: const Text('Sonido'),
            value: widget.notificationService.soundEnabled,
            onChanged: (value) async {
              await widget.notificationService.setSoundEnabled(value);
              setState(() {});
            },
          ),
          SwitchListTile(
            title: const Text('Vibración'),
            value: widget.notificationService.vibrationEnabled,
            onChanged: (value) async {
              await widget.notificationService.setVibrationEnabled(value);
              setState(() {});
            },
          ),
          const Divider(),
          ListTile(
            title: const Text('Hora de recordatorio'),
            subtitle: Text(widget.notificationService.reminderTime),
            trailing: const Icon(Icons.access_time),
            onTap: () async {
              final time = await showTimePicker(
                context: context,
                initialTime: TimeOfDay(
                  hour: int.tryParse(widget.notificationService.reminderTime
                          .split(':')[0]) ??
                      8,
                  minute: int.tryParse(widget.notificationService.reminderTime
                          .split(':')[1]) ??
                      0,
                ),
              );
              if (time != null) {
                final timeStr =
                    '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';
                await widget.notificationService.setReminderTime(timeStr);
                setState(() {});
              }
            },
          ),
          const Divider(),
          ListTile(
            title: const Text('Probar notificación'),
            leading: const Icon(Icons.notifications_active),
            onTap: () async {
              await widget.notificationService.testNotification();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Notificación de prueba enviada')),
              );
            },
          ),
        ],
      ),
    );
  }
}
