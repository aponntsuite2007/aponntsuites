import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fl_chart/fl_chart.dart';

import '../../providers/enhanced_auth_provider.dart';
import '../../widgets/common/loading_overlay.dart';
import '../medical/patient_cube_screen.dart';

class HRStatisticsScreen extends StatefulWidget {
  @override
  _HRStatisticsScreenState createState() => _HRStatisticsScreenState();
}

class _HRStatisticsScreenState extends State<HRStatisticsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  Map<String, dynamic>? _statisticsData;
  bool _isLoading = true;
  String _selectedPeriod = 'yearly';
  String _selectedView = 'summary';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _loadStatistics();
  }

  Future<void> _loadStatistics() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final authProvider = Provider.of<EnhancedAuthProvider>(context, listen: false);
      final response = await authProvider.apiService.get('/admin/statistics/hr-cube?period=$_selectedPeriod');
      
      if (response.isSuccess) {
        setState(() {
          _statisticsData = response.data;
        });
      } else {
        throw Exception(response.error ?? 'Error cargando estadísticas');
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: $e'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Estadísticas RRHH'),
        backgroundColor: Colors.indigo[700],
        foregroundColor: Colors.white,
        actions: [
          PopupMenuButton<String>(
            icon: Icon(Icons.date_range),
            onSelected: (value) {
              setState(() {
                _selectedPeriod = value;
              });
              _loadStatistics();
            },
            itemBuilder: (context) => [
              PopupMenuItem(value: 'monthly', child: Text('Mensual')),
              PopupMenuItem(value: 'quarterly', child: Text('Trimestral')),
              PopupMenuItem(value: 'yearly', child: Text('Anual')),
              PopupMenuItem(value: 'all_time', child: Text('Histórico')),
            ],
          ),
          IconButton(
            icon: Icon(Icons.refresh),
            onPressed: _loadStatistics,
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          tabs: [
            Tab(icon: Icon(Icons.dashboard), text: 'Resumen'),
            Tab(icon: Icon(Icons.people), text: 'Por Empleado'),
            Tab(icon: Icon(Icons.local_hospital), text: 'Por Diagnóstico'),
            Tab(icon: Icon(Icons.timeline), text: 'Tendencias'),
          ],
        ),
      ),
      body: LoadingOverlay(
        isLoading: _isLoading,
        child: _statisticsData == null
            ? _buildEmptyState()
            : TabBarView(
                controller: _tabController,
                children: [
                  _buildSummaryTab(),
                  _buildEmployeeTab(),
                  _buildDiagnosisTab(),
                  _buildTrendsTab(),
                ],
              ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.analytics,
            size: 64,
            color: Colors.grey[400],
          ),
          SizedBox(height: 16),
          Text(
            'No se pudieron cargar las estadísticas',
            style: TextStyle(
              fontSize: 18,
              color: Colors.grey[600],
            ),
          ),
          SizedBox(height: 16),
          ElevatedButton(
            onPressed: _loadStatistics,
            child: Text('Reintentar'),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryTab() {
    final summary = _statisticsData!['summary'] ?? {};
    
    return SingleChildScrollView(
      padding: EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Métricas principales
          Row(
            children: [
              Expanded(
                child: _buildMetricCard(
                  'Total Empleados',
                  '${summary['totalEmployees'] ?? 0}',
                  Icons.people,
                  Colors.blue,
                ),
              ),
              SizedBox(width: 12),
              Expanded(
                child: _buildMetricCard(
                  'Total Ausencias',
                  '${summary['totalAbsences'] ?? 0}',
                  Icons.event_busy,
                  Colors.orange,
                ),
              ),
            ],
          ),
          SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildMetricCard(
                  'Días Totales',
                  '${summary['totalDaysAbsent'] ?? 0}',
                  Icons.calendar_month,
                  Colors.red,
                ),
              ),
              SizedBox(width: 12),
              Expanded(
                child: _buildMetricCard(
                  'Promedio/Ausencia',
                  '${summary['averageAbsenceDuration']?.toStringAsFixed(1) ?? '0.0'} días',
                  Icons.timeline,
                  Colors.purple,
                ),
              ),
            ],
          ),
          SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildMetricCard(
                  'Casos Laborales',
                  '${summary['workRelatedCases'] ?? 0}',
                  Icons.construction,
                  Colors.amber,
                ),
              ),
              SizedBox(width: 12),
              Expanded(
                child: _buildMetricCard(
                  'Accidentes',
                  '${summary['accidentCases'] ?? 0}',
                  Icons.warning,
                  Colors.red[600]!,
                ),
              ),
            ],
          ),
          SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildMetricCard(
                  'Enf. Ocupacionales',
                  '${summary['occupationalDiseases'] ?? 0}',
                  Icons.local_hospital,
                  Colors.teal,
                ),
              ),
              SizedBox(width: 12),
              Expanded(
                child: _buildMetricCard(
                  'Alto Riesgo',
                  '${summary['highRiskEmployees'] ?? 0}',
                  Icons.priority_high,
                  Colors.red[800]!,
                ),
              ),
            ],
          ),
          SizedBox(height: 20),

          // Gráfico de barras - Ausencias por mes
          if (_statisticsData!['monthlyTrends'] != null) ...[
            Card(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Tendencia Mensual de Ausencias',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    SizedBox(height: 16),
                    Container(
                      height: 200,
                      child: _buildMonthlyChart(),
                    ),
                  ],
                ),
              ),
            ),
            SizedBox(height: 16),
          ],

          // Top diagnósticos
          if (_statisticsData!['topDiagnoses'] != null) ...[
            Card(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Diagnósticos Más Frecuentes',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    SizedBox(height: 12),
                    ..._buildTopDiagnosesList(),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildEmployeeTab() {
    final employeeBreakdown = _statisticsData!['employeeBreakdown'] as List? ?? [];
    
    return SingleChildScrollView(
      padding: EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Estadísticas por Empleado',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
          SizedBox(height: 16),
          
          ...employeeBreakdown.map((employee) {
            return Card(
              margin: EdgeInsets.only(bottom: 8),
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: _getRiskColor(employee['riskLevel']),
                  child: Icon(
                    Icons.person,
                    color: Colors.white,
                  ),
                ),
                title: Text(employee['employeeName'] ?? 'N/A'),
                subtitle: Text(
                  'Ausencias: ${employee['totalAbsences']} - '
                  'Días: ${employee['totalDaysAbsent']} - '
                  'Riesgo: ${_getRiskText(employee['riskLevel'])}'
                ),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    IconButton(
                      icon: Icon(Icons.analytics, color: Colors.blue[600]),
                      onPressed: () => _openPatientCube(
                        employee['userId'],
                        employee['employeeName']
                      ),
                    ),
                    IconButton(
                      icon: Icon(Icons.more_vert),
                      onPressed: () => _showEmployeeOptions(employee),
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
        ],
      ),
    );
  }

  Widget _buildDiagnosisTab() {
    final diagnosisDistribution = _statisticsData!['diagnosisDistribution'] ?? {};
    
    return SingleChildScrollView(
      padding: EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Distribución por Diagnóstico',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
          SizedBox(height: 16),
          
          Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Column(
                children: [
                  Container(
                    height: 300,
                    child: PieChart(
                      PieChartData(
                        sections: _buildPieChartSections(diagnosisDistribution),
                        centerSpaceRadius: 40,
                        sectionsSpace: 2,
                      ),
                    ),
                  ),
                  SizedBox(height: 20),
                  ..._buildDiagnosisLegend(diagnosisDistribution),
                ],
              ),
            ),
          ),
          SizedBox(height: 16),
          
          Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Detalle por Diagnóstico',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  SizedBox(height: 12),
                  ...diagnosisDistribution.entries.map((entry) {
                    final total = diagnosisDistribution.values.fold(0, (sum, val) => sum + val);
                    final percentage = total > 0 ? (entry.value / total * 100) : 0;
                    
                    return Padding(
                      padding: EdgeInsets.only(bottom: 12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Text(
                                  entry.key,
                                  style: TextStyle(fontWeight: FontWeight.w500),
                                ),
                              ),
                              Text(
                                '${entry.value} casos (${percentage.toStringAsFixed(1)}%)',
                                style: TextStyle(
                                  color: Colors.grey[700],
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                          SizedBox(height: 4),
                          LinearProgressIndicator(
                            value: percentage / 100,
                            backgroundColor: Colors.grey[300],
                            valueColor: AlwaysStoppedAnimation<Color>(
                              Colors.blue[400]!,
                            ),
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTrendsTab() {
    final monthlyTrends = _statisticsData!['monthlyTrends'] ?? {};
    
    return SingleChildScrollView(
      padding: EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Análisis de Tendencias',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
          SizedBox(height: 16),
          
          Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Evolución Mensual',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  SizedBox(height: 16),
                  Container(
                    height: 250,
                    child: LineChart(
                      LineChartData(
                        gridData: FlGridData(show: true),
                        titlesData: FlTitlesData(
                          leftTitles: AxisTitles(
                            sideTitles: SideTitles(showTitles: true),
                          ),
                          bottomTitles: AxisTitles(
                            sideTitles: SideTitles(
                              showTitles: true,
                              getTitlesWidget: (value, meta) {
                                final months = monthlyTrends.keys.toList()..sort();
                                final index = value.toInt();
                                if (index >= 0 && index < months.length) {
                                  final monthParts = months[index].split('-');
                                  return Text('${monthParts[1]}/${monthParts[0].substring(2)}');
                                }
                                return Text('');
                              },
                            ),
                          ),
                          rightTitles: AxisTitles(
                            sideTitles: SideTitles(showTitles: false),
                          ),
                          topTitles: AxisTitles(
                            sideTitles: SideTitles(showTitles: false),
                          ),
                        ),
                        borderData: FlBorderData(show: true),
                        lineBarsData: [
                          LineChartBarData(
                            spots: _buildTrendSpots(monthlyTrends, 'certificates'),
                            isCurved: true,
                            color: Colors.blue,
                            barWidth: 3,
                            dotData: FlDotData(show: true),
                          ),
                          LineChartBarData(
                            spots: _buildTrendSpots(monthlyTrends, 'totalDays'),
                            isCurved: true,
                            color: Colors.red,
                            barWidth: 3,
                            dotData: FlDotData(show: true),
                          ),
                        ],
                      ),
                    ),
                  ),
                  SizedBox(height: 16),
                  Row(
                    children: [
                      _buildLegendItem('Certificados', Colors.blue),
                      SizedBox(width: 20),
                      _buildLegendItem('Días totales', Colors.red),
                    ],
                  ),
                ],
              ),
            ),
          ),
          SizedBox(height: 16),
          
          // Análisis de patrones
          Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Patrones Identificados',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  SizedBox(height: 12),
                  ..._buildPatternAnalysis(),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMetricCard(String title, String value, IconData icon, Color color) {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          children: [
            Icon(icon, color: color, size: 32),
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
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey[600],
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMonthlyChart() {
    final monthlyTrends = _statisticsData!['monthlyTrends'] ?? {};
    final months = monthlyTrends.keys.toList()..sort();
    
    return BarChart(
      BarChartData(
        alignment: BarChartAlignment.spaceAround,
        maxY: months.isNotEmpty 
            ? monthlyTrends.values.map((m) => (m['certificates'] ?? 0).toDouble()).reduce((a, b) => a > b ? a : b) * 1.2
            : 10,
        barTouchData: BarTouchData(enabled: false),
        titlesData: FlTitlesData(
          show: true,
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              getTitlesWidget: (double value, TitleMeta meta) {
                final index = value.toInt();
                if (index >= 0 && index < months.length) {
                  final monthParts = months[index].split('-');
                  return Text(
                    '${monthParts[1]}',
                    style: TextStyle(
                      color: Colors.grey[700],
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  );
                }
                return Text('');
              },
            ),
          ),
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 28,
            ),
          ),
          topTitles: AxisTitles(
            sideTitles: SideTitles(showTitles: false),
          ),
          rightTitles: AxisTitles(
            sideTitles: SideTitles(showTitles: false),
          ),
        ),
        borderData: FlBorderData(show: false),
        barGroups: months.asMap().entries.map((entry) {
          final index = entry.key;
          final month = entry.value;
          final data = monthlyTrends[month] ?? {};
          
          return BarChartGroupData(
            x: index,
            barRods: [
              BarChartRodData(
                toY: (data['certificates'] ?? 0).toDouble(),
                color: Colors.blue[400],
                width: 16,
              ),
            ],
          );
        }).toList(),
      ),
    );
  }

  List<Widget> _buildTopDiagnosesList() {
    final topDiagnoses = _statisticsData!['topDiagnoses'] as List? ?? [];
    
    return topDiagnoses.take(5).map((diagnosis) {
      return Padding(
        padding: EdgeInsets.only(bottom: 8),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: Colors.blue[100],
                borderRadius: BorderRadius.circular(20),
              ),
              child: Center(
                child: Text(
                  '${diagnosis['count']}',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Colors.blue[800],
                  ),
                ),
              ),
            ),
            SizedBox(width: 12),
            Expanded(
              child: Text(
                diagnosis['diagnosis'] ?? 'Sin especificar',
                style: TextStyle(fontSize: 14),
              ),
            ),
          ],
        ),
      );
    }).toList();
  }

  List<PieChartSectionData> _buildPieChartSections(Map<String, dynamic> data) {
    final colors = [
      Colors.blue[400]!,
      Colors.red[400]!,
      Colors.green[400]!,
      Colors.orange[400]!,
      Colors.purple[400]!,
      Colors.teal[400]!,
      Colors.amber[400]!,
      Colors.pink[400]!,
    ];
    
    final total = data.values.fold(0, (sum, val) => sum + val);
    
    return data.entries.take(8).toList().asMap().entries.map((entry) {
      final index = entry.key;
      final mapEntry = entry.value;
      final percentage = total > 0 ? (mapEntry.value / total * 100) : 0;
      
      return PieChartSectionData(
        color: colors[index % colors.length],
        value: mapEntry.value.toDouble(),
        title: '${percentage.toStringAsFixed(1)}%',
        radius: 60,
        titleStyle: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.bold,
          color: Colors.white,
        ),
      );
    }).toList();
  }

  List<Widget> _buildDiagnosisLegend(Map<String, dynamic> data) {
    final colors = [
      Colors.blue[400]!,
      Colors.red[400]!,
      Colors.green[400]!,
      Colors.orange[400]!,
      Colors.purple[400]!,
      Colors.teal[400]!,
      Colors.amber[400]!,
      Colors.pink[400]!,
    ];
    
    return data.entries.take(8).toList().asMap().entries.map((entry) {
      final index = entry.key;
      final mapEntry = entry.value;
      
      return Padding(
        padding: EdgeInsets.only(bottom: 4),
        child: Row(
          children: [
            Container(
              width: 16,
              height: 16,
              decoration: BoxDecoration(
                color: colors[index % colors.length],
                shape: BoxShape.circle,
              ),
            ),
            SizedBox(width: 8),
            Expanded(
              child: Text(
                mapEntry.key,
                style: TextStyle(fontSize: 12),
              ),
            ),
            Text(
              '${mapEntry.value}',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      );
    }).toList();
  }

  List<FlSpot> _buildTrendSpots(Map<String, dynamic> trends, String field) {
    final months = trends.keys.toList()..sort();
    
    return months.asMap().entries.map((entry) {
      final index = entry.key;
      final month = entry.value;
      final data = trends[month] ?? {};
      final value = (data[field] ?? 0).toDouble();
      
      return FlSpot(index.toDouble(), value);
    }).toList();
  }

  Widget _buildLegendItem(String label, Color color) {
    return Row(
      children: [
        Container(
          width: 16,
          height: 16,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        SizedBox(width: 4),
        Text(
          label,
          style: TextStyle(fontSize: 12),
        ),
      ],
    );
  }

  List<Widget> _buildPatternAnalysis() {
    // Análisis básico de patrones
    final summary = _statisticsData!['summary'] ?? {};
    final patterns = <Widget>[];
    
    final totalAbsences = summary['totalAbsences'] ?? 0;
    final totalEmployees = summary['totalEmployees'] ?? 1;
    final avgAbsencesPerEmployee = totalAbsences / totalEmployees;
    
    patterns.add(
      _buildPatternItem(
        'Promedio de ausencias por empleado',
        '${avgAbsencesPerEmployee.toStringAsFixed(1)} ausencias/empleado',
        avgAbsencesPerEmployee > 3 ? Colors.red : Colors.green,
        avgAbsencesPerEmployee > 3 ? Icons.trending_up : Icons.trending_down,
      ),
    );
    
    final workRelatedPercentage = totalAbsences > 0 
        ? (summary['workRelatedCases'] ?? 0) / totalAbsences * 100 
        : 0;
    
    patterns.add(
      _buildPatternItem(
        'Casos relacionados con trabajo',
        '${workRelatedPercentage.toStringAsFixed(1)}% del total',
        workRelatedPercentage > 20 ? Colors.orange : Colors.blue,
        Icons.work,
      ),
    );
    
    return patterns;
  }

  Widget _buildPatternItem(String title, String value, Color color, IconData icon) {
    return Padding(
      padding: EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Icon(icon, color: color, size: 20),
          SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontWeight: FontWeight.w500,
                    fontSize: 14,
                  ),
                ),
                Text(
                  value,
                  style: TextStyle(
                    color: color,
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Color _getRiskColor(String? riskLevel) {
    switch (riskLevel) {
      case 'high':
        return Colors.red[600]!;
      case 'medium':
        return Colors.orange[600]!;
      case 'low':
        return Colors.yellow[700]!;
      default:
        return Colors.green[600]!;
    }
  }

  String _getRiskText(String? riskLevel) {
    switch (riskLevel) {
      case 'high':
        return 'Alto';
      case 'medium':
        return 'Medio';
      case 'low':
        return 'Bajo';
      default:
        return 'Normal';
    }
  }

  void _openPatientCube(String userId, String patientName) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => PatientCubeScreen(
          userId: userId,
          patientName: patientName,
        ),
      ),
    );
  }

  void _showEmployeeOptions(Map<String, dynamic> employee) {
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: Icon(Icons.analytics),
              title: Text('Ver análisis completo'),
              onTap: () {
                Navigator.pop(context);
                _openPatientCube(employee['userId'], employee['employeeName']);
              },
            ),
            ListTile(
              leading: Icon(Icons.history),
              title: Text('Historial médico'),
              onTap: () {
                Navigator.pop(context);
                // Implementar navegación al historial médico
              },
            ),
            ListTile(
              leading: Icon(Icons.report),
              title: Text('Generar reporte'),
              onTap: () {
                Navigator.pop(context);
                // Implementar generación de reporte
              },
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }
}