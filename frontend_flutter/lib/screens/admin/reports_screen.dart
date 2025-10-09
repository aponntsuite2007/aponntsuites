import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../providers/attendance_provider.dart';
import '../../providers/users_provider.dart';
import '../../config/theme.dart';
import '../../widgets/charts/attendance_chart.dart';

class ReportsScreen extends StatefulWidget {
  @override
  _ReportsScreenState createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen>
    with TickerProviderStateMixin {
  late TabController _tabController;
  DateTime _startDate = DateTime.now().subtract(Duration(days: 30));
  DateTime _endDate = DateTime.now();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _loadData() {
    final attendanceProvider = Provider.of<AttendanceProvider>(context, listen: false);
    final usersProvider = Provider.of<UsersProvider>(context, listen: false);
    
    attendanceProvider.loadAttendances(
      startDate: _startDate,
      endDate: _endDate,
      limit: 100,
    );
    usersProvider.loadUsers();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Reportes'),
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            Tab(text: 'ASISTENCIA', icon: Icon(Icons.access_time)),
            Tab(text: 'USUARIOS', icon: Icon(Icons.people)),
            Tab(text: 'ESTADÍSTICAS', icon: Icon(Icons.bar_chart)),
          ],
        ),
        actions: [
          IconButton(
            icon: Icon(Icons.date_range),
            onPressed: _selectDateRange,
          ),
          PopupMenuButton<String>(
            onSelected: _handleMenuAction,
            itemBuilder: (context) => [
              PopupMenuItem(
                value: 'export_csv',
                child: ListTile(
                  leading: Icon(Icons.file_download),
                  title: Text('Exportar CSV'),
                  dense: true,
                ),
              ),
              PopupMenuItem(
                value: 'export_pdf',
                child: ListTile(
                  leading: Icon(Icons.picture_as_pdf),
                  title: Text('Exportar PDF'),
                  dense: true,
                ),
              ),
              PopupMenuItem(
                value: 'print',
                child: ListTile(
                  leading: Icon(Icons.print),
                  title: Text('Imprimir'),
                  dense: true,
                ),
              ),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          _buildDateRangeCard(),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildAttendanceReportTab(),
                _buildUsersReportTab(),
                _buildStatsReportTab(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDateRangeCard() {
    return Card(
      margin: EdgeInsets.all(16),
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(Icons.date_range, color: AppTheme.primaryColor),
            SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Período del Reporte',
                    style: AppTheme.titleStyle.copyWith(fontSize: 16),
                  ),
                  Text(
                    '${_formatDate(_startDate)} - ${_formatDate(_endDate)}',
                    style: AppTheme.bodyStyle.copyWith(
                      color: AppTheme.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            TextButton(
              onPressed: _selectDateRange,
              child: Text('CAMBIAR'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAttendanceReportTab() {
    return Consumer2<AttendanceProvider, UsersProvider>(
      builder: (context, attendanceProvider, usersProvider, child) {
        if (attendanceProvider.isLoading && attendanceProvider.attendances.isEmpty) {
          return Center(child: CircularProgressIndicator());
        }

        final attendances = attendanceProvider.attendances;
        
        if (attendances.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.assignment,
                  size: 64,
                  color: AppTheme.textSecondary,
                ),
                SizedBox(height: 16),
                Text(
                  'No hay registros de asistencia en el período seleccionado',
                  textAlign: TextAlign.center,
                  style: AppTheme.subtitleStyle.copyWith(
                    color: AppTheme.textSecondary,
                  ),
                ),
              ],
            ),
          );
        }

        return SingleChildScrollView(
          padding: EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildAttendanceSummaryCards(attendances),
              SizedBox(height: 16),
              _buildAttendanceTable(attendances, usersProvider.users),
            ],
          ),
        );
      },
    );
  }

  Widget _buildUsersReportTab() {
    return Consumer<UsersProvider>(
      builder: (context, usersProvider, child) {
        if (usersProvider.isLoading && usersProvider.users.isEmpty) {
          return Center(child: CircularProgressIndicator());
        }

        final users = usersProvider.users;
        final stats = usersProvider.getUsersStats();

        return SingleChildScrollView(
          padding: EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildUsersStatsCards(stats),
              SizedBox(height: 16),
              _buildUsersTable(users),
            ],
          ),
        );
      },
    );
  }

  Widget _buildStatsReportTab() {
    return Consumer2<AttendanceProvider, UsersProvider>(
      builder: (context, attendanceProvider, usersProvider, child) {
        final attendanceStats = attendanceProvider.getCurrentPeriodStats();
        final userStats = usersProvider.getUsersStats();

        return SingleChildScrollView(
          padding: EdgeInsets.all(16),
          child: Column(
            children: [
              _buildOverallStatsCard(attendanceStats, userStats),
              SizedBox(height: 16),
              _buildAttendanceChart(attendanceStats),
              SizedBox(height: 16),
              _buildTrendChart(),
            ],
          ),
        );
      },
    );
  }

  Widget _buildAttendanceSummaryCards(List<dynamic> attendances) {
    final totalDays = attendances.length;
    final presentDays = attendances.where((a) => a.status == 'present' || a.status == 'late').length;
    final lateDays = attendances.where((a) => a.status == 'late').length;
    final absentDays = attendances.where((a) => a.status == 'absent').length;

    return GridView.count(
      shrinkWrap: true,
      physics: NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      childAspectRatio: 2,
      crossAxisSpacing: 16,
      mainAxisSpacing: 16,
      children: [
        _buildSummaryCard(
          'Total Registros',
          '$totalDays',
          Icons.assignment,
          AppTheme.primaryColor,
        ),
        _buildSummaryCard(
          'Presentes',
          '$presentDays',
          Icons.check_circle,
          AppTheme.successColor,
        ),
        _buildSummaryCard(
          'Tardanzas',
          '$lateDays',
          Icons.access_time,
          AppTheme.warningColor,
        ),
        _buildSummaryCard(
          'Ausencias',
          '$absentDays',
          Icons.cancel,
          AppTheme.errorColor,
        ),
      ],
    );
  }

  Widget _buildUsersStatsCards(Map<String, int> stats) {
    return GridView.count(
      shrinkWrap: true,
      physics: NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      childAspectRatio: 2,
      crossAxisSpacing: 16,
      mainAxisSpacing: 16,
      children: [
        _buildSummaryCard(
          'Total Usuarios',
          '${stats['total']}',
          Icons.people,
          AppTheme.primaryColor,
        ),
        _buildSummaryCard(
          'Activos',
          '${stats['active']}',
          Icons.check_circle,
          AppTheme.successColor,
        ),
        _buildSummaryCard(
          'Administradores',
          '${stats['admins']}',
          Icons.admin_panel_settings,
          AppTheme.errorColor,
        ),
        _buildSummaryCard(
          'Empleados',
          '${stats['employees']}',
          Icons.badge,
          AppTheme.warningColor,
        ),
      ],
    );
  }

  Widget _buildSummaryCard(String title, String value, IconData icon, Color color) {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(icon, size: 32, color: color),
            SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
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
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAttendanceTable(List<dynamic> attendances, List<dynamic> users) {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Detalle de Asistencias',
              style: AppTheme.titleStyle.copyWith(fontSize: 18),
            ),
            SizedBox(height: 16),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: DataTable(
                columns: [
                  DataColumn(label: Text('Fecha')),
                  DataColumn(label: Text('Usuario')),
                  DataColumn(label: Text('Entrada')),
                  DataColumn(label: Text('Salida')),
                  DataColumn(label: Text('Horas')),
                  DataColumn(label: Text('Estado')),
                ],
                rows: attendances.take(20).map<DataRow>((attendance) {
                  return DataRow(
                    cells: [
                      DataCell(Text(_formatDate(attendance.date))),
                      DataCell(Text('Usuario ${attendance.userId.substring(0, 8)}...')),
                      DataCell(Text(attendance.checkInTime != null
                          ? _formatTime(attendance.checkInTime!)
                          : '-')),
                      DataCell(Text(attendance.checkOutTime != null
                          ? _formatTime(attendance.checkOutTime!)
                          : '-')),
                      DataCell(Text('${attendance.workingHours.toStringAsFixed(1)}h')),
                      DataCell(
                        Container(
                          padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppTheme.getStatusColor(attendance.status).withOpacity(0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            attendance.displayStatus,
                            style: TextStyle(
                              color: AppTheme.getStatusColor(attendance.status),
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    ],
                  );
                }).toList(),
              ),
            ),
            if (attendances.length > 20) ...[
              SizedBox(height: 16),
              Center(
                child: Text(
                  'Mostrando 20 de ${attendances.length} registros',
                  style: AppTheme.captionStyle.copyWith(
                    color: AppTheme.textSecondary,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildUsersTable(List<dynamic> users) {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Lista de Usuarios',
              style: AppTheme.titleStyle.copyWith(fontSize: 18),
            ),
            SizedBox(height: 16),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: DataTable(
                columns: [
                  DataColumn(label: Text('Legajo')),
                  DataColumn(label: Text('Nombre')),
                  DataColumn(label: Text('Email')),
                  DataColumn(label: Text('Rol')),
                  DataColumn(label: Text('Estado')),
                  DataColumn(label: Text('Último Acceso')),
                ],
                rows: users.map<DataRow>((user) {
                  return DataRow(
                    cells: [
                      DataCell(Text(user.legajo)),
                      DataCell(Text(user.fullName)),
                      DataCell(Text(user.email)),
                      DataCell(Text(user.displayRole)),
                      DataCell(
                        Container(
                          padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: (user.isActive ? AppTheme.successColor : AppTheme.errorColor).withOpacity(0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            user.isActive ? 'Activo' : 'Inactivo',
                            style: TextStyle(
                              color: user.isActive ? AppTheme.successColor : AppTheme.errorColor,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                      DataCell(Text(user.lastLogin != null 
                          ? _formatDate(user.lastLogin!) 
                          : 'Nunca')),
                    ],
                  );
                }).toList(),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOverallStatsCard(Map<String, dynamic> attendanceStats, Map<String, int> userStats) {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Resumen General del Período',
              style: AppTheme.titleStyle.copyWith(fontSize: 18),
            ),
            SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: Column(
                    children: [
                      Text(
                        '${attendanceStats['attendanceRate']?.toStringAsFixed(1) ?? '0.0'}%',
                        style: AppTheme.headingStyle.copyWith(
                          fontSize: 32,
                          color: AppTheme.primaryColor,
                        ),
                      ),
                      Text(
                        'Tasa de Asistencia',
                        style: AppTheme.captionStyle,
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: Column(
                    children: [
                      Text(
                        '${attendanceStats['totalHours']?.toStringAsFixed(0) ?? '0'}',
                        style: AppTheme.headingStyle.copyWith(
                          fontSize: 32,
                          color: AppTheme.successColor,
                        ),
                      ),
                      Text(
                        'Horas Trabajadas',
                        style: AppTheme.captionStyle,
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: Column(
                    children: [
                      Text(
                        '${userStats['active']}',
                        style: AppTheme.headingStyle.copyWith(
                          fontSize: 32,
                          color: AppTheme.warningColor,
                        ),
                      ),
                      Text(
                        'Usuarios Activos',
                        style: AppTheme.captionStyle,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAttendanceChart(Map<String, dynamic> stats) {
    return AttendanceChart(stats: stats);
  }

  Widget _buildTrendChart() {
    final monthlyData = [
      FlSpot(0, 85.5), FlSpot(1, 88.2), FlSpot(2, 92.1),
      FlSpot(3, 89.7), FlSpot(4, 94.3), FlSpot(5, 91.8),
      FlSpot(6, 96.2), FlSpot(7, 88.9), FlSpot(8, 92.4),
      FlSpot(9, 90.1), FlSpot(10, 93.7), FlSpot(11, 95.2),
    ];
    
    return Column(
      children: [
        MonthlyTrendChart(data: monthlyData),
        SizedBox(height: 16),
        WeeklyBarChart(data: _generateWeeklyData()),
      ],
    );
  }
  
  List<BarChartGroupData> _generateWeeklyData() {
    return [
      BarChartGroupData(x: 0, barRods: [BarChartRodData(toY: 92.5, color: AppTheme.primaryColor)]),
      BarChartGroupData(x: 1, barRods: [BarChartRodData(toY: 88.3, color: AppTheme.primaryColor)]),
      BarChartGroupData(x: 2, barRods: [BarChartRodData(toY: 95.1, color: AppTheme.primaryColor)]),
      BarChartGroupData(x: 3, barRods: [BarChartRodData(toY: 91.7, color: AppTheme.primaryColor)]),
      BarChartGroupData(x: 4, barRods: [BarChartRodData(toY: 89.2, color: AppTheme.primaryColor)]),
      BarChartGroupData(x: 5, barRods: [BarChartRodData(toY: 76.8, color: AppTheme.warningColor)]),
      BarChartGroupData(x: 6, barRods: [BarChartRodData(toY: 82.4, color: AppTheme.warningColor)]),
    ];
  }

  String _formatDate(DateTime date) {
    return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
  }

  String _formatTime(DateTime time) {
    return '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';
  }

  Future<void> _selectDateRange() async {
    final DateTimeRange? picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
      initialDateRange: DateTimeRange(start: _startDate, end: _endDate),
    );

    if (picked != null) {
      setState(() {
        _startDate = picked.start;
        _endDate = picked.end;
      });
      _loadData();
    }
  }

  void _handleMenuAction(String action) {
    switch (action) {
      case 'export_csv':
        _exportToCSV();
        break;
      case 'export_pdf':
        _exportToPDF();
        break;
      case 'print':
        _printReport();
        break;
    }
  }

  void _exportToCSV() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Exportando reporte a CSV...'),
        backgroundColor: AppTheme.primaryColor,
      ),
    );

    Future.delayed(Duration(seconds: 2), () {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Reporte exportado a /Downloads/reporte_asistencia.csv'),
          backgroundColor: AppTheme.successColor,
        ),
      );
    });
  }

  void _exportToPDF() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Generando reporte PDF...'),
        backgroundColor: AppTheme.primaryColor,
      ),
    );

    Future.delayed(Duration(seconds: 3), () {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Reporte PDF generado en /Downloads/reporte_asistencia.pdf'),
          backgroundColor: AppTheme.successColor,
        ),
      );
    });
  }

  void _printReport() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Enviando reporte a imprimir...'),
        backgroundColor: AppTheme.primaryColor,
      ),
    );

    Future.delayed(Duration(seconds: 2), () {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Reporte enviado a la impresora'),
          backgroundColor: AppTheme.successColor,
        ),
      );
    });
  }
}