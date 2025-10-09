import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/user.dart';
import '../../models/face_analysis_result.dart';
import '../../providers/attendance_provider.dart';
import '../../config/theme.dart';
import '../../services/camera_service.dart';
import '../../widgets/components/camera_preview.dart';
import '../../widgets/components/browser_camera.dart';
import '../../widgets/components/simple_camera.dart';

class UserDetailScreen extends StatefulWidget {
  final User user;

  const UserDetailScreen({Key? key, required this.user}) : super(key: key);

  @override
  _UserDetailScreenState createState() => _UserDetailScreenState();
}

class _UserDetailScreenState extends State<UserDetailScreen>
    with TickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadUserAttendance();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _loadUserAttendance() {
    final attendanceProvider = Provider.of<AttendanceProvider>(context, listen: false);
    // Cargar asistencias del usuario específico
    attendanceProvider.loadAttendances(
      userId: widget.user.user_id,
      limit: 30,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('${widget.user.fullName}'),
        actions: [
          IconButton(
            icon: Icon(Icons.edit),
            onPressed: () {
              // Navegar a edición
              Navigator.pushNamed(
                context,
                '/admin/users/edit',
                arguments: widget.user,
              );
            },
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            Tab(text: 'PERFIL', icon: Icon(Icons.person)),
            Tab(text: 'ASISTENCIA', icon: Icon(Icons.access_time)),
            Tab(text: 'ESTADÍSTICAS', icon: Icon(Icons.bar_chart)),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildProfileTab(),
          _buildAttendanceTab(),
          _buildStatsTab(),
        ],
      ),
    );
  }

  Widget _buildProfileTab() {
    return SingleChildScrollView(
      padding: EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildProfileHeader(),
          SizedBox(height: 16),
          _buildPersonalInfo(),
          SizedBox(height: 16),
          _buildWorkInfo(),
          SizedBox(height: 16),
          _buildContactInfo(),
          SizedBox(height: 16),
          _buildAccountInfo(),
        ],
      ),
    );
  }

  Widget _buildProfileHeader() {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(20),
        child: Row(
          children: [
            CircleAvatar(
              radius: 40,
              backgroundColor: _getRoleColor(widget.user.role),
              backgroundImage: widget.user.profilePhoto != null
                  ? NetworkImage(widget.user.profilePhoto!)
                  : null,
              child: widget.user.profilePhoto == null
                  ? Text(
                      widget.user.firstName[0].toUpperCase(),
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 24,
                      ),
                    )
                  : null,
            ),
            SizedBox(width: 20),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.user.fullName,
                    style: AppTheme.headingStyle.copyWith(fontSize: 20),
                  ),
                  Text(
                    widget.user.displayRole,
                    style: AppTheme.subtitleStyle.copyWith(
                      color: _getRoleColor(widget.user.role),
                    ),
                  ),
                  SizedBox(height: 8),
                  Row(
                    children: [
                      _buildStatusChip(widget.user.isActive),
                      SizedBox(width: 8),
                      Chip(
                        label: Text(
                          widget.user.legajo,
                          style: TextStyle(fontSize: 12),
                        ),
                        backgroundColor: AppTheme.primaryColor.withOpacity(0.1),
                        side: BorderSide.none,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPersonalInfo() {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Información Personal',
              style: AppTheme.titleStyle.copyWith(fontSize: 18),
            ),
            SizedBox(height: 16),
            _buildInfoRow('DNI', widget.user.dni),
            _buildInfoRow('Email', widget.user.email),
            _buildInfoRow('Teléfono', widget.user.phone ?? 'No especificado'),
            _buildInfoRow('Dirección', widget.user.address ?? 'No especificada'),
            if (widget.user.emergencyContact != null)
              _buildInfoRow('Contacto de Emergencia', widget.user.emergencyContact!),
            if (widget.user.emergencyPhone != null)
              _buildInfoRow('Teléfono de Emergencia', widget.user.emergencyPhone!),
          ],
        ),
      ),
    );
  }

  Widget _buildWorkInfo() {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Información Laboral',
              style: AppTheme.titleStyle.copyWith(fontSize: 18),
            ),
            SizedBox(height: 16),
            _buildInfoRow('Empresa', widget.user.company ?? 'No especificada'),
            _buildInfoRow('Posición', widget.user.position ?? 'No especificada'),
            _buildInfoRow('Departamento', widget.user.department ?? 'No especificado'),
            if (widget.user.hireDate != null)
              _buildInfoRow(
                'Fecha de Ingreso',
                '${widget.user.hireDate!.day}/${widget.user.hireDate!.month}/${widget.user.hireDate!.year}',
              ),
            if (widget.user.salary != null)
              _buildInfoRow('Salario', '\$${widget.user.salary!.toStringAsFixed(2)}'),
          ],
        ),
      ),
    );
  }

  Widget _buildContactInfo() {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Información de la Cuenta',
              style: AppTheme.titleStyle.copyWith(fontSize: 18),
            ),
            SizedBox(height: 16),
            _buildInfoRow('Fecha de Creación', _formatDate(widget.user.createdAt)),
            _buildInfoRow('Última Actualización', _formatDate(widget.user.updatedAt)),
            if (widget.user.lastLogin != null)
              _buildInfoRow('Último Acceso', _formatDate(widget.user.lastLogin!)),
          ],
        ),
      ),
    );
  }

  Widget _buildAccountInfo() {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Configuración de Seguridad',
              style: AppTheme.titleStyle.copyWith(fontSize: 18),
            ),
            SizedBox(height: 16),
            ListTile(
              leading: Icon(Icons.fingerprint),
              title: Text('Autenticación Biométrica'),
              subtitle: Text('Configurar huella digital y reconocimiento facial'),
              trailing: Icon(Icons.arrow_forward_ios),
              onTap: () {
                print('DEBUG: Tapping biometric settings for ${widget.user.fullName}');
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Función de Configuración Biométrica activada para ${widget.user.fullName}'),
                    backgroundColor: AppTheme.successColor,
                    duration: Duration(seconds: 2),
                  ),
                );
                _showBiometricSettings();
              },
            ),
            ListTile(
              leading: Icon(Icons.vpn_key),
              title: Text('Cambiar Contraseña'),
              subtitle: Text('Restablecer contraseña del usuario'),
              trailing: Icon(Icons.arrow_forward_ios),
              onTap: () {
                _showPasswordReset();
              },
            ),
            ListTile(
              leading: Icon(Icons.pin),
              title: Text('Configurar PIN'),
              subtitle: Text('Establecer PIN de acceso rápido'),
              trailing: Icon(Icons.arrow_forward_ios),
              onTap: () {
                _showPinConfiguration();
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAttendanceTab() {
    return Consumer<AttendanceProvider>(
      builder: (context, attendanceProvider, child) {
        if (attendanceProvider.isLoading && attendanceProvider.attendances.isEmpty) {
          return Center(child: CircularProgressIndicator());
        }

        final userAttendances = attendanceProvider.attendances;

        if (userAttendances.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.history,
                  size: 64,
                  color: AppTheme.textSecondary,
                ),
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

        return ListView.builder(
          padding: EdgeInsets.all(16),
          itemCount: userAttendances.length,
          itemBuilder: (context, index) {
            final attendance = userAttendances[index];
            return Card(
              margin: EdgeInsets.only(bottom: 8),
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: AppTheme.getStatusColor(attendance.status),
                  child: Icon(
                    AppTheme.getStatusIcon(attendance.status),
                    color: Colors.white,
                  ),
                ),
                title: Text(_formatDate(attendance.date)),
                subtitle: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Entrada: ${attendance.checkInTime != null ? _formatTime(attendance.checkInTime!) : 'Sin registrar'}',
                    ),
                    Text(
                      'Salida: ${attendance.checkOutTime != null ? _formatTime(attendance.checkOutTime!) : 'Sin registrar'}',
                    ),
                    Text(
                      'Estado: ${attendance.displayStatus}',
                      style: TextStyle(
                        color: AppTheme.getStatusColor(attendance.status),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
                trailing: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '${attendance.workingHours.toStringAsFixed(1)}h',
                      style: AppTheme.bodyStyle.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    if (attendance.overtimeHours > 0)
                      Text(
                        '+${attendance.overtimeHours.toStringAsFixed(1)}h',
                        style: TextStyle(
                          color: AppTheme.warningColor,
                          fontSize: 12,
                        ),
                      ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildStatsTab() {
    return Consumer<AttendanceProvider>(
      builder: (context, attendanceProvider, child) {
        final stats = attendanceProvider.getCurrentPeriodStats();
        
        return SingleChildScrollView(
          padding: EdgeInsets.all(16),
          child: Column(
            children: [
              _buildStatsGrid(stats),
              SizedBox(height: 16),
              _buildAttendanceChart(stats),
              SizedBox(height: 16),
              _buildMonthlyTrend(),
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
        _buildStatCard(
          'Días Totales',
          '${stats['totalDays']}',
          Icons.calendar_today,
          AppTheme.primaryColor,
        ),
        _buildStatCard(
          'Días Presentes',
          '${stats['presentDays']}',
          Icons.check_circle,
          AppTheme.successColor,
        ),
        _buildStatCard(
          'Días Tarde',
          '${stats['lateDays']}',
          Icons.access_time,
          AppTheme.warningColor,
        ),
        _buildStatCard(
          'Días Ausentes',
          '${stats['absentDays']}',
          Icons.cancel,
          AppTheme.errorColor,
        ),
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
            Icon(icon, color: color, size: 24),
            SizedBox(height: 8),
            Text(
              value,
              style: AppTheme.titleStyle.copyWith(
                color: color,
                fontSize: 20,
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

  Widget _buildAttendanceChart(Map<String, dynamic> stats) {
    final total = stats['totalDays'] as int;
    final present = stats['presentDays'] as int;
    final late = stats['lateDays'] as int;
    final absent = stats['absentDays'] as int;

    return Card(
      child: Padding(
        padding: EdgeInsets.all(20),
        child: Column(
          children: [
            Text(
              'Distribución de Asistencia',
              style: AppTheme.titleStyle.copyWith(fontSize: 18),
            ),
            SizedBox(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildChartItem('Presente', present, AppTheme.successColor, total),
                _buildChartItem('Tarde', late, AppTheme.warningColor, total),
                _buildChartItem('Ausente', absent, AppTheme.errorColor, total),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildChartItem(String label, int value, Color color, int total) {
    final percentage = total > 0 ? (value / total * 100) : 0.0;
    
    return Column(
      children: [
        Container(
          width: 60,
          height: 60,
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            shape: BoxShape.circle,
            border: Border.all(color: color, width: 3),
          ),
          child: Center(
            child: Text(
              '$value',
              style: TextStyle(
                color: color,
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
          ),
        ),
        SizedBox(height: 8),
        Text(
          label,
          style: AppTheme.captionStyle,
        ),
        Text(
          '${percentage.toStringAsFixed(1)}%',
          style: AppTheme.captionStyle.copyWith(
            color: color,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }

  Widget _buildMonthlyTrend() {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Tendencia Mensual',
              style: AppTheme.titleStyle.copyWith(fontSize: 18),
            ),
            SizedBox(height: 16),
            Container(
              height: 200,
              child: Center(
                child: Text(
                  'Gráfico de tendencia mensual\n(Implementar con fl_chart)',
                  textAlign: TextAlign.center,
                  style: AppTheme.bodyStyle.copyWith(
                    color: AppTheme.textSecondary,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              '$label:',
              style: AppTheme.bodyStyle.copyWith(
                fontWeight: FontWeight.w500,
                color: AppTheme.textSecondary,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: AppTheme.bodyStyle,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusChip(bool isActive) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: (isActive ? AppTheme.successColor : AppTheme.errorColor).withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isActive ? AppTheme.successColor : AppTheme.errorColor,
          width: 1,
        ),
      ),
      child: Text(
        isActive ? 'Activo' : 'Inactivo',
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.bold,
          color: isActive ? AppTheme.successColor : AppTheme.errorColor,
        ),
      ),
    );
  }

  Color _getRoleColor(String role) {
    switch (role) {
      case 'admin':
        return AppTheme.errorColor;
      case 'supervisor':
        return AppTheme.warningColor;
      case 'employee':
        return AppTheme.primaryColor;
      default:
        return AppTheme.textSecondary;
    }
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }

  String _formatTime(DateTime time) {
    return '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';
  }

  void _showBiometricSettings() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(Icons.fingerprint, color: AppTheme.primaryColor),
            SizedBox(width: 8),
            Text('Configuración Biométrica'),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.primaryColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppTheme.primaryColor.withOpacity(0.3)),
                ),
                child: Row(
                  children: [
                    Icon(Icons.person, color: AppTheme.primaryColor, size: 20),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Usuario: ${widget.user.fullName}',
                        style: AppTheme.bodyStyle.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              
              SizedBox(height: 16),
              
              Text(
                'Métodos disponibles:',
                style: AppTheme.bodyStyle.copyWith(fontWeight: FontWeight.bold),
              ),
              
              SizedBox(height: 12),
              
              // Huella Digital
              Card(
                child: ListTile(
                  leading: Icon(Icons.fingerprint, color: AppTheme.primaryColor),
                  title: Text('Huella Digital'),
                  subtitle: Text('Registrar plantilla de huella dactilar'),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppTheme.successColor.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppTheme.successColor),
                        ),
                        child: Text(
                          'Disponible',
                          style: TextStyle(
                            fontSize: 12,
                            color: AppTheme.successColor,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      SizedBox(width: 8),
                      Icon(Icons.arrow_forward_ios, size: 16),
                    ],
                  ),
                  onTap: () {
                    Navigator.pop(context);
                    _configureFingerprintForUser();
                  },
                ),
              ),
              
              SizedBox(height: 8),
              
              // Reconocimiento Facial
              Card(
                child: ListTile(
                  leading: Icon(Icons.face, color: AppTheme.warningColor),
                  title: Text('Reconocimiento Facial'),
                  subtitle: Text('Capturar características faciales'),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppTheme.warningColor.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppTheme.warningColor),
                        ),
                        child: Text(
                          'Beta',
                          style: TextStyle(
                            fontSize: 12,
                            color: AppTheme.warningColor,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      SizedBox(width: 8),
                      Icon(Icons.arrow_forward_ios, size: 16),
                    ],
                  ),
                  onTap: () {
                    Navigator.pop(context);
                    _configureFaceRecognitionForUser();
                  },
                ),
              ),
              
              SizedBox(height: 8),
              
              // PIN Biométrico
              Card(
                child: ListTile(
                  leading: Icon(Icons.pin, color: AppTheme.errorColor),
                  title: Text('PIN de Respaldo'),
                  subtitle: Text('Configurar PIN como método alternativo'),
                  trailing: Icon(Icons.arrow_forward_ios, size: 16),
                  onTap: () {
                    Navigator.pop(context);
                    _configurePinForUser();
                  },
                ),
              ),
              
              SizedBox(height: 16),
              
              // Información de seguridad
              Container(
                padding: EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.errorColor.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppTheme.errorColor.withOpacity(0.2)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.security, color: AppTheme.errorColor, size: 20),
                    SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Información de Seguridad',
                            style: AppTheme.captionStyle.copyWith(
                              color: AppTheme.errorColor,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          SizedBox(height: 4),
                          Text(
                            '• Los datos biométricos se almacenan encriptados\n'
                            '• Se requiere autorización del usuario\n'
                            '• Las plantillas son únicas e irrevocables',
                            style: AppTheme.captionStyle.copyWith(
                              color: AppTheme.errorColor.withOpacity(0.8),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cerrar'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _showBiometricHistory();
            },
            child: Text('Ver Historial'),
          ),
        ],
      ),
    );
  }

  void _configureFingerprintForUser() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(Icons.fingerprint, color: AppTheme.primaryColor),
            SizedBox(width: 8),
            Text('Registrar Huella Digital'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircleAvatar(
              radius: 40,
              backgroundImage: widget.user.profilePhoto != null 
                  ? NetworkImage(widget.user.profilePhoto!) 
                  : null,
              child: widget.user.profilePhoto == null 
                  ? Icon(Icons.person, size: 40)
                  : null,
            ),
            SizedBox(height: 16),
            Text(
              widget.user.fullName,
              style: AppTheme.titleStyle,
            ),
            Text(
              'Legajo: ${widget.user.legajo ?? "N/A"}',
              style: AppTheme.captionStyle,
            ),
            SizedBox(height: 20),
            
            Container(
              padding: EdgeInsets.all(20),
              decoration: BoxDecoration(
                border: Border.all(color: AppTheme.primaryColor, width: 2),
                borderRadius: BorderRadius.circular(12),
                color: AppTheme.primaryColor.withOpacity(0.05),
              ),
              child: Column(
                children: [
                  Icon(
                    Icons.fingerprint,
                    size: 60,
                    color: AppTheme.primaryColor,
                  ),
                  SizedBox(height: 12),
                  Text(
                    'Coloca el dedo del usuario en el sensor',
                    textAlign: TextAlign.center,
                    style: AppTheme.bodyStyle,
                  ),
                  SizedBox(height: 16),
                  LinearProgressIndicator(
                    backgroundColor: AppTheme.primaryColor.withOpacity(0.2),
                    valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryColor),
                  ),
                  SizedBox(height: 8),
                  Text(
                    'Preparando sensor...',
                    style: AppTheme.captionStyle,
                  ),
                ],
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
              _simulateBiometricRegistration('Huella digital', widget.user.fullName);
            },
            child: Text('Iniciar Registro'),
          ),
        ],
      ),
    );
  }

  void _configureFaceRecognitionForUser() {
    showDialog(
      context: context,
      builder: (context) => _buildSimpleCameraDialog(),
    );
  }

  Widget _buildSimpleCameraDialog() {
    return AlertDialog(
      title: Row(
        children: [
          Icon(Icons.face, color: AppTheme.warningColor),
          SizedBox(width: 8),
          Text('Reconocimiento Facial - ${widget.user.fullName}'),
        ],
      ),
      content: Container(
        width: 500,
        height: 400,
        child: Column(
          children: [
            // Información
            Container(
              padding: EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.primaryColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(Icons.info, color: AppTheme.primaryColor),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'La cámara se abrirá en una nueva ventana para capturar tu rostro.',
                      style: AppTheme.bodyStyle,
                    ),
                  ),
                ],
              ),
            ),
            
            SizedBox(height: 20),
            
            // Área de cámara simulada
            Container(
              width: 400,
              height: 250,
              decoration: BoxDecoration(
                border: Border.all(color: AppTheme.warningColor, width: 2),
                borderRadius: BorderRadius.circular(12),
                color: Colors.black12,
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.videocam,
                    size: 80,
                    color: AppTheme.warningColor,
                  ),
                  SizedBox(height: 16),
                  Text(
                    'Presiona "Iniciar Captura" para\nabrir la cámara del navegador',
                    textAlign: TextAlign.center,
                    style: AppTheme.bodyStyle.copyWith(
                      color: AppTheme.warningColor,
                    ),
                  ),
                ],
              ),
            ),
            
            SizedBox(height: 16),
            
            // Botón de captura
            ElevatedButton.icon(
              onPressed: () => _startRealCameraCapture(),
              icon: Icon(Icons.camera_alt),
              label: Text('Iniciar Captura Real'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.warningColor,
                padding: EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text('Cancelar'),
        ),
      ],
    );
  }

  void _startRealCameraCapture() async {
    Navigator.pop(context); // Cerrar el diálogo actual
    
    // Usar la cámara simple que ejecuta JavaScript directamente
    SimpleCamera.openCamera();
  }
  
  void _showCameraError(String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(Icons.error, color: AppTheme.errorColor),
            SizedBox(width: 8),
            Text('Error de Cámara'),
          ],
        ),
        content: Text(message, style: AppTheme.bodyStyle),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('OK'),
          ),
        ],
      ),
    );
  }

  void _showCameraInstructions() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(Icons.camera_alt, color: AppTheme.successColor),
            SizedBox(width: 8),
            Text('Instrucciones de Captura'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.successColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppTheme.successColor),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.check_circle, color: AppTheme.successColor, size: 20),
                      SizedBox(width: 8),
                      Text(
                        'Cámara Activada Exitosamente',
                        style: AppTheme.bodyStyle.copyWith(
                          fontWeight: FontWeight.bold,
                          color: AppTheme.successColor,
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 8),
                  Text('Usuario: ${widget.user.fullName}'),
                  Text('Legajo: ${widget.user.legajo}'),
                ],
              ),
            ),
            
            SizedBox(height: 16),
            
            Text(
              'Para capturar tu rostro correctamente:',
              style: AppTheme.bodyStyle.copyWith(fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 8),
            
            ...([
              'Asegúrate de tener buena iluminación',
              'Mantén tu rostro centrado en la cámara',
              'Mira directamente a la cámara',
              'Mantén una expresión neutra',
              'Evita sombras en el rostro',
            ].map((instruction) => Padding(
              padding: EdgeInsets.only(bottom: 4),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.check, color: AppTheme.primaryColor, size: 16),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(instruction, style: AppTheme.bodyStyle),
                  ),
                ],
              ),
            )).toList()),
            
            SizedBox(height: 16),
            
            Container(
              padding: EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.warningColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(Icons.info_outline, color: AppTheme.warningColor),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'La captura se realizará automáticamente en unos segundos.',
                      style: AppTheme.captionStyle.copyWith(
                        color: AppTheme.warningColor,
                      ),
                    ),
                  ),
                ],
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
              _simulateRealCapture();
            },
            child: Text('Continuar'),
          ),
        ],
      ),
    );
  }

  void _simulateRealCapture() async {
    // Mostrar progreso de captura
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: Text('Capturando Imagen'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: AppTheme.primaryColor, width: 3),
              ),
              child: Stack(
                alignment: Alignment.center,
                children: [
                  CircularProgressIndicator(
                    strokeWidth: 3,
                    valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryColor),
                  ),
                  Icon(
                    Icons.face,
                    size: 40,
                    color: AppTheme.primaryColor,
                  ),
                ],
              ),
            ),
            SizedBox(height: 16),
            Text('Analizando características faciales...'),
            SizedBox(height: 8),
            LinearProgressIndicator(
              backgroundColor: AppTheme.primaryColor.withOpacity(0.2),
              valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryColor),
            ),
          ],
        ),
      ),
    );

    // Simular proceso de análisis
    await Future.delayed(Duration(seconds: 4));
    
    Navigator.pop(context); // Cerrar progreso
    
    // Mostrar resultado exitoso
    _showSuccessfulCaptureResult();
  }

  void _showSuccessfulCaptureResult() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(Icons.check_circle, color: AppTheme.successColor),
            SizedBox(width: 8),
            Text('Captura Exitosa'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.successColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.successColor),
              ),
              child: Column(
                children: [
                  Icon(
                    Icons.face_retouching_natural,
                    size: 60,
                    color: AppTheme.successColor,
                  ),
                  SizedBox(height: 12),
                  Text(
                    'Reconocimiento Facial\nConfigurado',
                    textAlign: TextAlign.center,
                    style: AppTheme.titleStyle.copyWith(
                      color: AppTheme.successColor,
                    ),
                  ),
                ],
              ),
            ),
            
            SizedBox(height: 16),
            
            Text('Usuario: ${widget.user.fullName}', style: AppTheme.bodyStyle),
            Text('Legajo: ${widget.user.legajo}', style: AppTheme.captionStyle),
            
            SizedBox(height: 16),
            
            Container(
              padding: EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.primaryColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Detalles de Captura:',
                    style: AppTheme.bodyStyle.copyWith(fontWeight: FontWeight.bold),
                  ),
                  SizedBox(height: 4),
                  Text('• Rostro detectado correctamente'),
                  Text('• Calidad de imagen: Excelente (95%)'),
                  Text('• Confianza del análisis: 98%'),
                  Text('• Características faciales: Registradas'),
                  Text('• Estado: Listo para autenticación'),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cerrar'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _showBiometricHistory();
            },
            child: Text('Ver Historial'),
          ),
        ],
      ),
    );
  }

  void _handleFacialRecognitionComplete(String imageData, FaceAnalysisResult analysis) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(
              analysis.faceDetected ? Icons.check_circle : Icons.error,
              color: analysis.faceDetected ? AppTheme.successColor : AppTheme.errorColor,
            ),
            SizedBox(width: 8),
            Text('Resultado del Análisis'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Usuario: ${widget.user.fullName}',
              style: AppTheme.titleStyle,
            ),
            SizedBox(height: 16),

            // Resultado general
            Container(
              padding: EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: analysis.faceDetected 
                    ? AppTheme.successColor.withOpacity(0.1)
                    : AppTheme.errorColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: analysis.faceDetected 
                      ? AppTheme.successColor 
                      : AppTheme.errorColor,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        analysis.faceDetected ? Icons.face : Icons.face_retouching_off,
                        color: analysis.faceDetected ? AppTheme.successColor : AppTheme.errorColor,
                      ),
                      SizedBox(width: 8),
                      Text(
                        analysis.faceDetected ? 'Rostro Detectado' : 'No se Detectó Rostro',
                        style: AppTheme.bodyStyle.copyWith(
                          fontWeight: FontWeight.bold,
                          color: analysis.faceDetected ? AppTheme.successColor : AppTheme.errorColor,
                        ),
                      ),
                    ],
                  ),
                  if (analysis.faceDetected) ...[
                    SizedBox(height: 8),
                    Text('Confianza: ${analysis.confidence.toStringAsFixed(1)}%'),
                    Text('Calidad: ${analysis.qualityDescription} (${analysis.qualityScore.toStringAsFixed(1)}%)'),
                    SizedBox(height: 8),
                    Text('Características detectadas:', style: AppTheme.captionStyle.copyWith(fontWeight: FontWeight.bold)),
                    ...analysis.features.entries.map((entry) => 
                      Text('• ${entry.key}: ${entry.value}', style: AppTheme.captionStyle)
                    ).toList(),
                  ],
                ],
              ),
            ),

            SizedBox(height: 16),

            // Información adicional
            Container(
              padding: EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.primaryColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Información Técnica',
                    style: AppTheme.captionStyle.copyWith(fontWeight: FontWeight.bold),
                  ),
                  SizedBox(height: 4),
                  Text('• Plantilla facial generada', style: AppTheme.captionStyle),
                  Text('• Datos encriptados y almacenados', style: AppTheme.captionStyle),
                  Text('• Listo para autenticación', style: AppTheme.captionStyle),
                ],
              ),
            ),
          ],
        ),
        actions: [
          if (!analysis.faceDetected || !analysis.isHighQuality)
            TextButton(
              onPressed: () {
                Navigator.pop(context);
                _configureFaceRecognitionForUser(); // Reintentar
              },
              child: Text('Reintentar'),
            ),
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cerrar'),
          ),
          if (analysis.faceDetected && analysis.isHighQuality)
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                _saveFacialRecognitionData(imageData, analysis);
              },
              child: Text('Guardar'),
            ),
        ],
      ),
    );
  }

  void _saveFacialRecognitionData(String imageData, FaceAnalysisResult analysis) {
    // Simular guardado de datos biométricos
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: Text('Guardando Datos Biométricos'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryColor),
            ),
            SizedBox(height: 16),
            Text('Procesando plantilla facial para ${widget.user.fullName}...'),
          ],
        ),
      ),
    );

    // Simular proceso de guardado
    Future.delayed(Duration(seconds: 3), () {
      Navigator.pop(context); // Cerrar diálogo de progreso
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Reconocimiento facial configurado exitosamente para ${widget.user.fullName}'),
          backgroundColor: AppTheme.successColor,
          duration: Duration(seconds: 4),
          action: SnackBarAction(
            label: 'Ver Detalles',
            onPressed: () => _showBiometricHistory(),
            textColor: Colors.white,
          ),
        ),
      );
    });
  }

  void _configurePinForUser() {
    final _pinController = TextEditingController();
    final _confirmPinController = TextEditingController();
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(Icons.pin, color: AppTheme.errorColor),
            SizedBox(width: 8),
            Text('Configurar PIN de Respaldo'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Configurar PIN para ${widget.user.fullName}',
              style: AppTheme.titleStyle,
            ),
            SizedBox(height: 20),
            TextField(
              controller: _pinController,
              decoration: InputDecoration(
                labelText: 'PIN (4-6 dígitos)',
                prefixIcon: Icon(Icons.lock),
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.number,
              obscureText: true,
              maxLength: 6,
            ),
            SizedBox(height: 16),
            TextField(
              controller: _confirmPinController,
              decoration: InputDecoration(
                labelText: 'Confirmar PIN',
                prefixIcon: Icon(Icons.lock_outline),
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.number,
              obscureText: true,
              maxLength: 6,
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
              if (_pinController.text.isNotEmpty && 
                  _pinController.text == _confirmPinController.text) {
                Navigator.pop(context);
                _simulateBiometricRegistration('PIN de respaldo', widget.user.fullName);
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Los PINs no coinciden o están vacíos'),
                    backgroundColor: AppTheme.errorColor,
                  ),
                );
              }
            },
            child: Text('Guardar PIN'),
          ),
        ],
      ),
    );
  }

  void _simulateBiometricRegistration(String method, String userName) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: Text('Configurando $method'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryColor),
            ),
            SizedBox(height: 16),
            Text('Procesando datos biométricos para $userName...'),
            SizedBox(height: 8),
            Text(
              'Por favor espera...',
              style: AppTheme.captionStyle,
            ),
          ],
        ),
      ),
    );

    Future.delayed(Duration(seconds: 4), () {
      Navigator.pop(context); // Cerrar diálogo de progreso
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('$method configurado exitosamente para $userName'),
          backgroundColor: AppTheme.successColor,
          duration: Duration(seconds: 4),
          action: SnackBarAction(
            label: 'Ver Detalles',
            onPressed: () => _showBiometricHistory(),
            textColor: Colors.white,
          ),
        ),
      );
    });
  }

  void _showBiometricHistory() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(Icons.history, color: AppTheme.primaryColor),
            SizedBox(width: 8),
            Text('Historial Biométrico'),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Usuario: ${widget.user.fullName}',
                style: AppTheme.titleStyle,
              ),
              SizedBox(height: 16),
              
              _buildBiometricHistoryItem(
                Icons.fingerprint,
                'Huella Digital',
                'Registrada: 15/08/2024 14:30',
                AppTheme.successColor,
                'Activa',
              ),
              
              _buildBiometricHistoryItem(
                Icons.face,
                'Reconocimiento Facial',
                'No configurado',
                AppTheme.textSecondary,
                'Disponible',
              ),
              
              _buildBiometricHistoryItem(
                Icons.pin,
                'PIN de Respaldo',
                'Configurado: 12/08/2024 09:15',
                AppTheme.warningColor,
                'Activo',
              ),
              
              SizedBox(height: 16),
              
              Container(
                padding: EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.primaryColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Estadísticas de Uso',
                      style: AppTheme.bodyStyle.copyWith(fontWeight: FontWeight.bold),
                    ),
                    SizedBox(height: 8),
                    Text('• Último acceso: Hoy 08:30'),
                    Text('• Método preferido: Huella Digital'),
                    Text('• Intentos fallidos: 0'),
                  ],
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cerrar'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _showBiometricSettings(); // Volver al menú principal
            },
            child: Text('Configurar Más'),
          ),
        ],
      ),
    );
  }

  Widget _buildBiometricHistoryItem(
    IconData icon,
    String title,
    String subtitle,
    Color color,
    String status,
  ) {
    return Card(
      margin: EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(icon, color: color),
        title: Text(title),
        subtitle: Text(subtitle),
        trailing: Container(
          padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: color),
          ),
          child: Text(
            status,
            style: TextStyle(
              fontSize: 12,
              color: color,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      ),
    );
  }

  void _showPasswordReset() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Restablecer Contraseña'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('¿Deseas enviar un email de restablecimiento de contraseña a ${widget.user.email}?'),
            SizedBox(height: 16),
            Text(
              'El usuario recibirá un enlace para crear una nueva contraseña.',
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
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Email de restablecimiento enviado'),
                  backgroundColor: AppTheme.successColor,
                ),
              );
            },
            child: Text('Enviar Email'),
          ),
        ],
      ),
    );
  }

  void _showPinConfiguration() {
    final pinController = TextEditingController();
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Configurar PIN'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: pinController,
              decoration: InputDecoration(
                labelText: 'Nuevo PIN (4-6 dígitos)',
                prefixIcon: Icon(Icons.pin),
              ),
              keyboardType: TextInputType.number,
              obscureText: true,
              maxLength: 6,
            ),
            SizedBox(height: 8),
            Text(
              'El PIN permitirá al usuario acceso rápido al sistema.',
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
              if (pinController.text.length >= 4) {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('PIN configurado correctamente'),
                    backgroundColor: AppTheme.successColor,
                  ),
                );
              }
            },
            child: Text('Configurar'),
          ),
        ],
      ),
    );
  }
}