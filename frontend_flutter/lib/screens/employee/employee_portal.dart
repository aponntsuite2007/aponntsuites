import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/auth_provider.dart';
import '../../providers/attendance_provider.dart';
import '../../providers/notification_provider.dart';
import '../../config/theme.dart';
import '../../widgets/components/real_time_status.dart';
import '../../widgets/charts/attendance_chart.dart';

class EmployeePortal extends StatefulWidget {
  @override
  _EmployeePortalState createState() => _EmployeePortalState();
}

class _EmployeePortalState extends State<EmployeePortal> with TickerProviderStateMixin {
  late TabController _tabController;
  final DateFormat _timeFormat = DateFormat('HH:mm');
  final DateFormat _dateFormat = DateFormat('dd/MM/yyyy');

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _loadInitialData();
  }

  Future<void> _loadInitialData() async {
    final attendanceProvider = Provider.of<AttendanceProvider>(context, listen: false);
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    
    await attendanceProvider.loadTodayStatus();
    await attendanceProvider.loadAttendances(limit: 30);
    
    if (authProvider.currentUser != null && attendanceProvider.isRealTimeEnabled) {
      await attendanceProvider.connectRealTime(authProvider.currentUser!.id);
    }
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
        title: Text('Portal del Empleado'),
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            Tab(text: 'HOY', icon: Icon(Icons.today)),
            Tab(text: 'HISTORIAL', icon: Icon(Icons.history)),
            Tab(text: 'ESTADÍSTICAS', icon: Icon(Icons.bar_chart)),
            Tab(text: 'PERFIL', icon: Icon(Icons.person)),
          ],
        ),
        actions: [
          IconButton(
            icon: Icon(Icons.notifications),
            onPressed: () => Navigator.pushNamed(context, '/notifications'),
          ),
        ],
      ),
      body: Column(
        children: [
          _buildConnectionStatus(),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildTodayTab(),
                _buildHistoryTab(),
                _buildStatsTab(),
                _buildProfileTab(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildConnectionStatus() {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: RealTimeStatusWidget(showDetails: false),
    );
  }

  Widget _buildTodayTab() {
    return Consumer2<AttendanceProvider, AuthProvider>(
      builder: (context, attendanceProvider, authProvider, child) {
        return RefreshIndicator(
          onRefresh: () => attendanceProvider.refresh(),
          child: SingleChildScrollView(
            padding: EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildWelcomeCard(authProvider),
                SizedBox(height: 16),
                _buildTodayStatusCard(attendanceProvider),
                SizedBox(height: 16),
                _buildQuickActionsCard(attendanceProvider),
                SizedBox(height: 16),
                _buildTodayTimelineCard(attendanceProvider),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildWelcomeCard(AuthProvider authProvider) {
    final now = DateTime.now();
    final greeting = now.hour < 12 ? 'Buenos días' : 
                    now.hour < 18 ? 'Buenas tardes' : 'Buenas noches';
    
    return Card(
      child: Container(
        width: double.infinity,
        padding: EdgeInsets.all(20),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          gradient: LinearGradient(
            colors: [AppTheme.primaryColor, AppTheme.primaryColor.withOpacity(0.8)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '$greeting,',
              style: TextStyle(
                fontSize: 16,
                color: Colors.white70,
              ),
            ),
            Text(
              authProvider.currentUser?.firstName ?? 'Usuario',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            SizedBox(height: 8),
            Text(
              DateFormat('EEEE, d MMMM yyyy', 'es').format(now),
              style: TextStyle(
                fontSize: 14,
                color: Colors.white70,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTodayStatusCard(AttendanceProvider provider) {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.access_time, color: AppTheme.primaryColor),
                SizedBox(width: 8),
                Text(
                  'Estado de Hoy',
                  style: AppTheme.titleStyle.copyWith(fontSize: 18),
                ),
              ],
            ),
            SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _buildStatusItem(
                    'Entrada',
                    provider.todayAttendance?.checkInTime != null
                        ? _timeFormat.format(provider.todayAttendance!.checkInTime!)
                        : 'No registrada',
                    provider.hasCheckedIn ? AppTheme.successColor : AppTheme.textSecondary,
                    Icons.login,
                  ),
                ),
                Expanded(
                  child: _buildStatusItem(
                    'Salida',
                    provider.todayAttendance?.checkOutTime != null
                        ? _timeFormat.format(provider.todayAttendance!.checkOutTime!)
                        : 'No registrada',
                    provider.hasCheckedOut ? AppTheme.successColor : AppTheme.textSecondary,
                    Icons.logout,
                  ),
                ),
              ],
            ),
            if (provider.todayAttendance != null) ...[
              SizedBox(height: 16),
              Divider(),
              SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: _buildStatusItem(
                      'Horas Trabajadas',
                      '${provider.todayAttendance!.workingHours.toStringAsFixed(1)}h',
                      AppTheme.primaryColor,
                      Icons.schedule,
                    ),
                  ),
                  Expanded(
                    child: _buildStatusItem(
                      'Estado',
                      provider.todayAttendance!.displayStatus,
                      _getStatusColor(provider.todayAttendance!.status),
                      Icons.info,
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildStatusItem(String label, String value, Color color, IconData icon) {
    return Column(
      children: [
        Icon(icon, color: color, size: 32),
        SizedBox(height: 8),
        Text(
          value,
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: color,
          ),
          textAlign: TextAlign.center,
        ),
        Text(
          label,
          style: AppTheme.captionStyle.copyWith(
            color: AppTheme.textSecondary,
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }

  Widget _buildQuickActionsCard(AttendanceProvider provider) {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Acciones Rápidas',
              style: AppTheme.titleStyle.copyWith(fontSize: 18),
            ),
            SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _buildActionButton(
                    'Marcar Entrada',
                    Icons.login,
                    AppTheme.successColor,
                    provider.canCheckIn,
                    () => _performCheckIn(provider),
                  ),
                ),
                SizedBox(width: 16),
                Expanded(
                  child: _buildActionButton(
                    'Marcar Salida',
                    Icons.logout,
                    AppTheme.errorColor,
                    provider.canCheckOut,
                    () => _performCheckOut(provider),
                  ),
                ),
              ],
            ),
            SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _buildActionButton(
                    'Solicitar Permiso',
                    Icons.event_busy,
                    AppTheme.warningColor,
                    true,
                    _requestPermission,
                  ),
                ),
                SizedBox(width: 16),
                Expanded(
                  child: _buildActionButton(
                    'Emergencia',
                    Icons.emergency,
                    Colors.red,
                    true,
                    _sendEmergencyAlert,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButton(
    String label,
    IconData icon,
    Color color,
    bool enabled,
    VoidCallback? onPressed,
  ) {
    return ElevatedButton(
      onPressed: enabled ? onPressed : null,
      style: ElevatedButton.styleFrom(
        backgroundColor: enabled ? color : AppTheme.textSecondary,
        padding: EdgeInsets.symmetric(vertical: 16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
      child: Column(
        children: [
          Icon(icon, color: Colors.white),
          SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              color: Colors.white,
              fontSize: 12,
              fontWeight: FontWeight.bold,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildTodayTimelineCard(AttendanceProvider provider) {
    if (provider.todayAttendance == null) {
      return SizedBox.shrink();
    }

    final attendance = provider.todayAttendance!;
    final events = <TimelineEvent>[];

    if (attendance.checkInTime != null) {
      events.add(TimelineEvent(
        time: attendance.checkInTime!,
        title: 'Entrada registrada',
        subtitle: attendance.location ?? 'Ubicación no disponible',
        icon: Icons.login,
        color: AppTheme.successColor,
      ));
    }

    if (attendance.checkOutTime != null) {
      events.add(TimelineEvent(
        time: attendance.checkOutTime!,
        title: 'Salida registrada',
        subtitle: 'Horas trabajadas: ${attendance.workingHours.toStringAsFixed(1)}h',
        icon: Icons.logout,
        color: AppTheme.errorColor,
      ));
    }

    if (events.isEmpty) {
      return SizedBox.shrink();
    }

    return Card(
      child: Padding(
        padding: EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Cronología del Día',
              style: AppTheme.titleStyle.copyWith(fontSize: 18),
            ),
            SizedBox(height: 16),
            ...events.map((event) => _buildTimelineItem(event)),
          ],
        ),
      ),
    );
  }

  Widget _buildTimelineItem(TimelineEvent event) {
    return Padding(
      padding: EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: event.color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Icon(event.icon, color: event.color, size: 20),
          ),
          SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  event.title,
                  style: AppTheme.bodyStyle.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  event.subtitle,
                  style: AppTheme.captionStyle.copyWith(
                    color: AppTheme.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          Text(
            _timeFormat.format(event.time),
            style: AppTheme.bodyStyle.copyWith(
              fontWeight: FontWeight.bold,
              color: event.color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHistoryTab() {
    return Consumer<AttendanceProvider>(
      builder: (context, provider, child) {
        if (provider.isLoading && provider.attendances.isEmpty) {
          return Center(child: CircularProgressIndicator());
        }

        if (provider.attendances.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.history, size: 64, color: AppTheme.textSecondary),
                SizedBox(height: 16),
                Text(
                  'No hay registros de asistencia',
                  style: AppTheme.subtitleStyle.copyWith(
                    color: AppTheme.textSecondary,
                  ),
                ),
              ],
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: () => provider.refresh(),
          child: ListView.builder(
            padding: EdgeInsets.all(16),
            itemCount: provider.attendances.length,
            itemBuilder: (context, index) {
              final attendance = provider.attendances[index];
              return _buildHistoryItem(attendance);
            },
          ),
        );
      },
    );
  }

  Widget _buildHistoryItem(dynamic attendance) {
    return Card(
      margin: EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: _getStatusColor(attendance.status),
          child: Icon(
            _getStatusIcon(attendance.status),
            color: Colors.white,
          ),
        ),
        title: Text(_dateFormat.format(attendance.date)),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('${attendance.workingHours.toStringAsFixed(1)} horas'),
            if (attendance.checkInTime != null)
              Text('Entrada: ${_timeFormat.format(attendance.checkInTime!)}'),
            if (attendance.checkOutTime != null)
              Text('Salida: ${_timeFormat.format(attendance.checkOutTime!)}'),
          ],
        ),
        trailing: Container(
          padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: _getStatusColor(attendance.status).withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(
            attendance.displayStatus,
            style: TextStyle(
              color: _getStatusColor(attendance.status),
              fontSize: 12,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildStatsTab() {
    return Consumer<AttendanceProvider>(
      builder: (context, provider, child) {
        final stats = provider.getCurrentPeriodStats();
        
        return SingleChildScrollView(
          padding: EdgeInsets.all(16),
          child: Column(
            children: [
              AttendanceChart(stats: stats),
              SizedBox(height: 16),
              _buildStatsGrid(stats),
            ],
          ),
        );
      },
    );
  }

  Widget _buildStatsGrid(Map<String, dynamic> stats) {
    return GridView.count(
      shrinkWrap: true,
      physics: NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      childAspectRatio: 1.5,
      crossAxisSpacing: 16,
      mainAxisSpacing: 16,
      children: [
        _buildStatCard('Días Trabajados', '${stats['presentDays']}', Icons.work, AppTheme.successColor),
        _buildStatCard('Tardanzas', '${stats['lateDays']}', Icons.access_time, AppTheme.warningColor),
        _buildStatCard('Horas Totales', '${stats['totalHours']?.toStringAsFixed(1) ?? 0}', Icons.schedule, AppTheme.primaryColor),
        _buildStatCard('Promedio', '${stats['attendanceRate']?.toStringAsFixed(1) ?? 0}%', Icons.trending_up, AppTheme.accentColor),
      ],
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color) {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 32, color: color),
            SizedBox(height: 8),
            Text(
              value,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            Text(
              title,
              style: AppTheme.captionStyle.copyWith(
                color: AppTheme.textSecondary,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileTab() {
    return Consumer<AuthProvider>(
      builder: (context, authProvider, child) {
        final user = authProvider.currentUser;
        if (user == null) {
          return Center(child: Text('No hay datos de usuario'));
        }

        return SingleChildScrollView(
          padding: EdgeInsets.all(16),
          child: Column(
            children: [
              Card(
                child: Padding(
                  padding: EdgeInsets.all(20),
                  child: Column(
                    children: [
                      CircleAvatar(
                        radius: 40,
                        backgroundColor: AppTheme.primaryColor,
                        child: Text(
                          user.firstName[0].toUpperCase(),
                          style: TextStyle(
                            fontSize: 32,
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      SizedBox(height: 16),
                      Text(
                        '${user.firstName} ${user.lastName}',
                        style: AppTheme.titleStyle.copyWith(fontSize: 20),
                      ),
                      Text(
                        user.email,
                        style: AppTheme.bodyStyle.copyWith(
                          color: AppTheme.textSecondary,
                        ),
                      ),
                      SizedBox(height: 8),
                      Chip(
                        label: Text(user.displayRole),
                        backgroundColor: AppTheme.primaryColor.withOpacity(0.1),
                      ),
                    ],
                  ),
                ),
              ),
              SizedBox(height: 16),
              Card(
                child: Column(
                  children: [
                    ListTile(
                      leading: Icon(Icons.badge, color: AppTheme.primaryColor),
                      title: Text('Legajo'),
                      subtitle: Text(user.legajo),
                    ),
                    if (user.department != null)
                      ListTile(
                        leading: Icon(Icons.business, color: AppTheme.primaryColor),
                        title: Text('Departamento'),
                        subtitle: Text(user.department!),
                      ),
                    if (user.position != null)
                      ListTile(
                        leading: Icon(Icons.work, color: AppTheme.primaryColor),
                        title: Text('Posición'),
                        subtitle: Text(user.position!),
                      ),
                    ListTile(
                      leading: Icon(Icons.phone, color: AppTheme.primaryColor),
                      title: Text('Teléfono'),
                      subtitle: Text(user.phone ?? 'No especificado'),
                    ),
                  ],
                ),
              ),
              SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.pushNamed(context, '/profile'),
                  child: Text('Editar Perfil'),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'present':
        return AppTheme.successColor;
      case 'late':
        return AppTheme.warningColor;
      case 'absent':
        return AppTheme.errorColor;
      default:
        return AppTheme.textSecondary;
    }
  }

  IconData _getStatusIcon(String status) {
    switch (status.toLowerCase()) {
      case 'present':
        return Icons.check_circle;
      case 'late':
        return Icons.access_time;
      case 'absent':
        return Icons.cancel;
      default:
        return Icons.help;
    }
  }

  Future<void> _performCheckIn(AttendanceProvider provider) async {
    // Implementar lógica de check-in con biométricos
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Marcar Entrada'),
        content: Text('¿Confirma que desea marcar su entrada?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              final success = await provider.checkIn();
              if (success) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Entrada registrada exitosamente'),
                    backgroundColor: AppTheme.successColor,
                  ),
                );
              }
            },
            child: Text('Confirmar'),
          ),
        ],
      ),
    );
  }

  Future<void> _performCheckOut(AttendanceProvider provider) async {
    // Implementar lógica de check-out
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Marcar Salida'),
        content: Text('¿Confirma que desea marcar su salida?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              final success = await provider.checkOut();
              if (success) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Salida registrada exitosamente'),
                    backgroundColor: AppTheme.successColor,
                  ),
                );
              }
            },
            child: Text('Confirmar'),
          ),
        ],
      ),
    );
  }

  void _requestPermission() {
    // Implementar solicitud de permisos
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Solicitar Permiso'),
        content: Text('Función en desarrollo'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cerrar'),
          ),
        ],
      ),
    );
  }

  void _sendEmergencyAlert() {
    final attendanceProvider = Provider.of<AttendanceProvider>(context, listen: false);
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Alerta de Emergencia'),
        content: Text('¿Desea enviar una alerta de emergencia?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancelar'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () {
              Navigator.pop(context);
              attendanceProvider.sendEmergencyAlert('Alerta de emergencia enviada desde el portal del empleado');
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Alerta de emergencia enviada'),
                  backgroundColor: Colors.red,
                ),
              );
            },
            child: Text('Enviar Alerta'),
          ),
        ],
      ),
    );
  }
}

class TimelineEvent {
  final DateTime time;
  final String title;
  final String subtitle;
  final IconData icon;
  final Color color;

  TimelineEvent({
    required this.time,
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.color,
  });
}