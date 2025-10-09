import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/users_provider.dart';
import '../../config/theme.dart';
import '../../widgets/components/aponnt_logo.dart';
import 'users_management_screen.dart';
import 'reports_screen.dart';
import 'network_settings_screen.dart';
import 'hr_statistics_screen.dart';
import 'questionnaire_config_screen.dart';

class AdminDashboard extends StatefulWidget {
  @override
  _AdminDashboardState createState() => _AdminDashboardState();
}

class _AdminDashboardState extends State<AdminDashboard> {
  @override
  void initState() {
    super.initState();
    _loadData();
  }

  void _loadData() {
    final usersProvider = Provider.of<UsersProvider>(context, listen: false);
    usersProvider.loadUsers();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            AponntLogoIcon(size: 28, color: Colors.white),
            SizedBox(width: 12),
            Text('Aponnt'),
            SizedBox(width: 8),
            Text(
              '- Panel de Administración',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w400,
                color: Colors.white.withOpacity(0.9),
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: Icon(Icons.refresh),
            onPressed: _loadData,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildWelcomeCard(),
            SizedBox(height: 16),
            _buildStatsGrid(),
            SizedBox(height: 16),
            _buildQuickActions(),
            SizedBox(height: 16),
            _buildRecentUsers(),
          ],
        ),
      ),
    );
  }

  Widget _buildWelcomeCard() {
    return Consumer<AuthProvider>(
      builder: (context, authProvider, child) {
        return Card(
          child: Padding(
            padding: EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Bienvenido, ${authProvider.currentUser?.firstName}',
                  style: AppTheme.titleStyle.copyWith(
                    fontSize: 24,
                    color: AppTheme.primaryColor,
                  ),
                ),
                SizedBox(height: 8),
                Text(
                  'Panel de control del sistema de asistencia',
                  style: AppTheme.subtitleStyle,
                ),
                SizedBox(height: 4),
                Text(
                  'Rol: ${authProvider.currentUser?.displayRole}',
                  style: AppTheme.bodyStyle.copyWith(
                    color: AppTheme.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildStatsGrid() {
    return Consumer<UsersProvider>(
      builder: (context, usersProvider, child) {
        final activeUsers = usersProvider.activeUsers.length;
        final totalUsers = usersProvider.users.length;
        final adminUsers = usersProvider.getUsersByRole('admin').length;
        final supervisorUsers = usersProvider.getUsersByRole('supervisor').length;

        return GridView.count(
          shrinkWrap: true,
          physics: NeverScrollableScrollPhysics(),
          crossAxisCount: 2,
          childAspectRatio: 1.5,
          crossAxisSpacing: 16,
          mainAxisSpacing: 16,
          children: [
            _buildStatCard(
              'Usuarios Activos',
              '$activeUsers',
              Icons.people,
              AppTheme.successColor,
            ),
            _buildStatCard(
              'Total Usuarios',
              '$totalUsers',
              Icons.group,
              AppTheme.primaryColor,
            ),
            _buildStatCard(
              'Administradores',
              '$adminUsers',
              Icons.admin_panel_settings,
              AppTheme.warningColor,
            ),
            _buildStatCard(
              'Supervisores',
              '$supervisorUsers',
              Icons.supervisor_account,
              AppTheme.accentColor,
            ),
          ],
        );
      },
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color) {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 32,
              color: color,
            ),
            SizedBox(height: 8),
            Text(
              value,
              style: AppTheme.titleStyle.copyWith(
                fontSize: 24,
                color: color,
                fontWeight: FontWeight.bold,
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

  Widget _buildQuickActions() {
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
            
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _buildActionButton(
                  'Usuarios',
                  Icons.people,
                  () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => UsersManagementScreen()),
                  ),
                ),
                _buildActionButton(
                  'Reportes',
                  Icons.assessment,
                  () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => ReportsScreen()),
                  ),
                ),
                _buildActionButton(
                  'Configuración',
                  Icons.settings,
                  () => Navigator.pushNamed(context, '/settings'),
                ),
                _buildActionButton(
                  'Red',
                  Icons.router,
                  () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => NetworkSettingsScreen()),
                  ),
                ),
                _buildActionButton(
                  'Backup',
                  Icons.backup,
                  () => _performBackup(),
                ),
                _buildActionButton(
                  'Estadísticas RRHH',
                  Icons.analytics,
                  () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => HRStatisticsScreen()),
                  ),
                ),
                _buildActionButton(
                  'Cuestionarios',
                  Icons.quiz,
                  () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => QuestionnaireConfigScreen()),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButton(String label, IconData icon, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          border: Border.all(color: AppTheme.borderLight),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 18, color: AppTheme.primaryColor),
            SizedBox(width: 8),
            Text(
              label,
              style: AppTheme.bodyStyle.copyWith(
                color: AppTheme.primaryColor,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRecentUsers() {
    return Consumer<UsersProvider>(
      builder: (context, usersProvider, child) {
        if (usersProvider.isLoading && usersProvider.users.isEmpty) {
          return Card(
            child: Padding(
              padding: EdgeInsets.all(20),
              child: Center(
                child: CircularProgressIndicator(),
              ),
            ),
          );
        }

        final recentUsers = usersProvider.users.take(5).toList();

        return Card(
          child: Padding(
            padding: EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Usuarios Recientes',
                  style: AppTheme.titleStyle.copyWith(fontSize: 18),
                ),
                SizedBox(height: 16),
                
                if (recentUsers.isEmpty)
                  Text(
                    'No hay usuarios registrados',
                    style: AppTheme.bodyStyle.copyWith(
                      color: AppTheme.textSecondary,
                    ),
                  )
                else
                  ...recentUsers.map((user) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: CircleAvatar(
                      backgroundColor: user.isActive 
                          ? AppTheme.successColor
                          : AppTheme.textSecondary,
                      child: Text(
                        user.firstName[0].toUpperCase(),
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    title: Text(
                      '${user.firstName} ${user.lastName}',
                      style: AppTheme.bodyStyle,
                    ),
                    subtitle: Text(
                      '${user.legajo} - ${user.displayRole}',
                      style: AppTheme.captionStyle.copyWith(
                        color: AppTheme.textSecondary,
                      ),
                    ),
                    trailing: Chip(
                      label: Text(
                        user.isActive ? 'Activo' : 'Inactivo',
                        style: TextStyle(
                          fontSize: 10,
                          color: user.isActive 
                              ? AppTheme.successColor
                              : AppTheme.textSecondary,
                        ),
                      ),
                      backgroundColor: (user.isActive 
                          ? AppTheme.successColor
                          : AppTheme.textSecondary).withOpacity(0.1),
                      side: BorderSide.none,
                    ),
                  )).toList(),
              ],
            ),
          ),
        );
      },
    );
  }

  void _performBackup() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Realizar Backup'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('¿Deseas realizar un backup de todos los datos del sistema?'),
            SizedBox(height: 16),
            Text(
              'Esto incluye:\n• Usuarios y configuraciones\n• Registros de asistencia\n• Configuración del sistema',
              style: AppTheme.captionStyle.copyWith(
                color: AppTheme.textSecondary,
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _showBackupProgress();
            },
            child: Text('Realizar Backup'),
          ),
        ],
      ),
    );
  }

  void _showBackupProgress() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text('Realizando backup...'),
          ],
        ),
      ),
    );

    // Simular proceso de backup
    Future.delayed(Duration(seconds: 3), () {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Backup completado exitosamente'),
          backgroundColor: AppTheme.successColor,
        ),
      );
    });
  }

  void _showNotImplemented(String feature) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('$feature: Función en desarrollo'),
        backgroundColor: AppTheme.warningColor,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}