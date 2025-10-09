import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fl_chart/fl_chart.dart';

import '../../providers/enhanced_auth_provider.dart';
import '../../widgets/common/loading_overlay.dart';

class PatientCubeScreen extends StatefulWidget {
  final String userId;
  final String patientName;

  PatientCubeScreen({required this.userId, required this.patientName});

  @override
  _PatientCubeScreenState createState() => _PatientCubeScreenState();
}

class _PatientCubeScreenState extends State<PatientCubeScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  Map<String, dynamic>? _patientData;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 5, vsync: this);
    _loadPatientData();
  }

  Future<void> _loadPatientData() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final authProvider = Provider.of<EnhancedAuthProvider>(context, listen: false);
      final response = await authProvider.apiService.get('/medical/statistics/patient/${widget.userId}/cube');
      
      if (response.isSuccess) {
        setState(() {
          _patientData = response.data;
        });
      } else {
        throw Exception(response.error ?? 'Error cargando datos del paciente');
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
        title: Text('Análisis Médico - ${widget.patientName}'),
        backgroundColor: Colors.teal[700],
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          tabs: [
            Tab(icon: Icon(Icons.dashboard), text: 'Resumen'),
            Tab(icon: Icon(Icons.timeline), text: 'Estadísticas'),
            Tab(icon: Icon(Icons.medical_services), text: 'Historial'),
            Tab(icon: Icon(Icons.medication), text: 'Medicación'),
            Tab(icon: Icon(Icons.warning), text: 'Riesgos'),
          ],
        ),
      ),
      body: LoadingOverlay(
        isLoading: _isLoading,
        child: _patientData == null
            ? _buildEmptyState()
            : TabBarView(
                controller: _tabController,
                children: [
                  _buildSummaryTab(),
                  _buildStatisticsTab(),
                  _buildHistoryTab(),
                  _buildMedicationTab(),
                  _buildRiskTab(),
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
            Icons.person_search,
            size: 64,
            color: Colors.grey[400],
          ),
          SizedBox(height: 16),
          Text(
            'No se pudieron cargar los datos del paciente',
            style: TextStyle(
              fontSize: 18,
              color: Colors.grey[600],
            ),
          ),
          SizedBox(height: 16),
          ElevatedButton(
            onPressed: _loadPatientData,
            child: Text('Reintentar'),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryTab() {
    final summary = _patientData!['summary'] ?? {};
    final employee = _patientData!['employee'] ?? {};
    final medicalProfile = _patientData!['medicalProfile'] ?? {};

    return SingleChildScrollView(
      padding: EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Información del empleado
          Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      CircleAvatar(
                        backgroundColor: Colors.teal[700],
                        child: Icon(Icons.person, color: Colors.white),
                      ),
                      SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${employee['firstName'] ?? ''} ${employee['lastName'] ?? ''}',
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Text('DNI: ${employee['dni'] ?? 'N/A'}'),
                            Text('Estado: ${_getFitnessText(medicalProfile['fitnessForWork'])}'),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          SizedBox(height: 16),

          // Estadísticas principales
          Row(
            children: [
              Expanded(
                child: _buildStatCard(
                  'Total Ausencias',
                  '${summary['totalAbsences'] ?? 0}',
                  Icons.event_busy,
                  Colors.orange,
                ),
              ),
              SizedBox(width: 12),
              Expanded(
                child: _buildStatCard(
                  'Días Totales',
                  '${summary['totalDaysAbsent'] ?? 0}',
                  Icons.calendar_month,
                  Colors.blue,
                ),
              ),
            ],
          ),
          SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildStatCard(
                  'Promedio Días',
                  '${summary['averageDuration']?.toStringAsFixed(1) ?? '0.0'}',
                  Icons.timeline,
                  Colors.purple,
                ),
              ),
              SizedBox(width: 12),
              Expanded(
                child: _buildStatCard(
                  'BMI',
                  '${medicalProfile['bmi']?.toStringAsFixed(1) ?? 'N/A'}',
                  Icons.monitor_weight,
                  Colors.green,
                ),
              ),
            ],
          ),
          SizedBox(height: 16),

          // Información médica básica
          Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Perfil Médico',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  SizedBox(height: 12),
                  _buildProfileItem('Enfermedades Crónicas', 
                      (medicalProfile['chronicDiseases'] as List?)?.length ?? 0),
                  _buildProfileItem('Alergias', 
                      (medicalProfile['allergies'] as List?)?.length ?? 0),
                  _buildProfileItem('Medicación Regular', 
                      (medicalProfile['regularMedication'] as List?)?.length ?? 0),
                ],
              ),
            ),
          ),
          SizedBox(height: 16),

          // Última ausencia
          if (summary['lastAbsence'] != null)
            Card(
              color: Colors.amber[50],
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Row(
                  children: [
                    Icon(Icons.schedule, color: Colors.amber[700]),
                    SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Última Ausencia',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: Colors.amber[700],
                            ),
                          ),
                          Text(_formatDate(summary['lastAbsence'])),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildStatisticsTab() {
    final yearlyComparison = _patientData!['yearlyComparison'] ?? {};
    final thisYear = yearlyComparison['thisYear'] ?? {};
    final trends = yearlyComparison['trends'] as List? ?? [];
    final diagnosisPatterns = _patientData!['diagnosisPatterns'] ?? {};

    return SingleChildScrollView(
      padding: EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Gráfico de tendencias anuales
          Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Tendencia de Ausencias (3 años)',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  SizedBox(height: 16),
                  Container(
                    height: 200,
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
                                final index = value.toInt();
                                if (index >= 0 && index < trends.length) {
                                  return Text('${trends[index]['year']}');
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
                            spots: trends.asMap().entries.map((entry) {
                              return FlSpot(
                                entry.key.toDouble(),
                                (entry.value['absences'] ?? 0).toDouble(),
                              );
                            }).toList(),
                            isCurved: true,
                            color: Colors.blue,
                            barWidth: 3,
                            dotData: FlDotData(show: true),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          SizedBox(height: 16),

          // Distribución por diagnóstico
          Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Distribución por Diagnóstico',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  SizedBox(height: 16),
                  ...diagnosisPatterns.entries.take(5).map((entry) {
                    final total = diagnosisPatterns.values.fold(0, (sum, val) => sum + val);
                    final percentage = total > 0 ? (entry.value / total * 100) : 0;
                    
                    return Padding(
                      padding: EdgeInsets.only(bottom: 8),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Text(
                                  entry.key,
                                  style: TextStyle(fontSize: 14),
                                ),
                              ),
                              Text(
                                '${entry.value} (${percentage.toStringAsFixed(1)}%)',
                                style: TextStyle(
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

          SizedBox(height: 16),

          // Estadísticas del año actual
          Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Estadísticas ${DateTime.now().year}',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: _buildStatItem('Ausencias', '${thisYear['totalAbsences'] ?? 0}'),
                      ),
                      Expanded(
                        child: _buildStatItem('Días', '${thisYear['totalDaysAbsent'] ?? 0}'),
                      ),
                    ],
                  ),
                  SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: _buildStatItem('Relacionados trabajo', '${thisYear['workRelatedCases'] ?? 0}'),
                      ),
                      Expanded(
                        child: _buildStatItem('Accidentes', '${thisYear['accidentCases'] ?? 0}'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHistoryTab() {
    final absencePatterns = _patientData!['absencePatterns'] ?? {};

    return SingleChildScrollView(
      padding: EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Patrones de Ausencia',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  SizedBox(height: 16),
                  Text(
                    'Distribución por Día de la Semana',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  SizedBox(height: 8),
                  ..._buildDayOfWeekPatterns(absencePatterns['dayOfWeekPattern'] ?? {}),
                  SizedBox(height: 16),
                  Text(
                    'Distribución Estacional',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  SizedBox(height: 8),
                  ..._buildSeasonalPatterns(absencePatterns['seasonPattern'] ?? {}),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMedicationTab() {
    final medicalProfile = _patientData!['medicalProfile'] ?? {};
    final medicationAnalysis = _patientData!['medicationAnalysis'] ?? {};
    
    final regularMedication = medicalProfile['regularMedication'] as List? ?? [];
    final episodeMedications = medicationAnalysis['episodeMedications'] as List? ?? [];
    final medicationFrequency = medicationAnalysis['medicationFrequency'] ?? {};

    return SingleChildScrollView(
      padding: EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Medicación regular
          Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.medication, color: Colors.green[600]),
                      SizedBox(width: 8),
                      Text(
                        'Medicación Regular',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 12),
                  if (regularMedication.isEmpty)
                    Text(
                      'No hay medicación regular registrada',
                      style: TextStyle(
                        color: Colors.grey[600],
                        fontStyle: FontStyle.italic,
                      ),
                    )
                  else
                    ...regularMedication.map((med) => Padding(
                      padding: EdgeInsets.only(bottom: 4),
                      child: Row(
                        children: [
                          Icon(Icons.circle, size: 8, color: Colors.green[600]),
                          SizedBox(width: 8),
                          Text(med.toString()),
                        ],
                      ),
                    )).toList(),
                ],
              ),
            ),
          ),
          SizedBox(height: 16),

          // Frecuencia de medicación
          Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.bar_chart, color: Colors.blue[600]),
                      SizedBox(width: 8),
                      Text(
                        'Medicación más Frecuente',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 12),
                  ...medicationFrequency.entries.take(5).map((entry) {
                    return Padding(
                      padding: EdgeInsets.only(bottom: 8),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(entry.key),
                          ),
                          Container(
                            padding: EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.blue[100],
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              '${entry.value} veces',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.blue[800],
                                fontWeight: FontWeight.bold,
                              ),
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
          SizedBox(height: 16),

          // Historial de medicación por episodios
          Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.history, color: Colors.orange[600]),
                      SizedBox(width: 8),
                      Text(
                        'Historial de Medicación',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 12),
                  ...episodeMedications.take(5).map((episode) {
                    return Card(
                      margin: EdgeInsets.only(bottom: 8),
                      color: Colors.grey[50],
                      child: Padding(
                        padding: EdgeInsets.all(12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    _formatDate(episode['date']),
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            SizedBox(height: 4),
                            Text(
                              episode['diagnosis'] ?? 'Diagnóstico no especificado',
                              style: TextStyle(
                                fontSize: 13,
                                color: Colors.grey[700],
                              ),
                            ),
                            SizedBox(height: 4),
                            Wrap(
                              spacing: 4,
                              children: (episode['medications'] as List? ?? []).map((med) {
                                return Chip(
                                  label: Text(
                                    med.toString(),
                                    style: TextStyle(fontSize: 11),
                                  ),
                                  backgroundColor: Colors.orange[100],
                                  materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                );
                              }).toList(),
                            ),
                          ],
                        ),
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

  Widget _buildRiskTab() {
    final riskFactors = _patientData!['riskFactors'] as List? ?? [];

    return SingleChildScrollView(
      padding: EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Card(
            color: Colors.red[50],
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.warning, color: Colors.red[700]),
                      SizedBox(width: 8),
                      Text(
                        'Factores de Riesgo Identificados',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Colors.red[700],
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 12),
                  if (riskFactors.isEmpty)
                    Row(
                      children: [
                        Icon(Icons.check_circle, color: Colors.green[600]),
                        SizedBox(width: 8),
                        Text(
                          'No se han identificado factores de riesgo significativos',
                          style: TextStyle(
                            color: Colors.green[700],
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    )
                  else
                    ...riskFactors.map((factor) => Padding(
                      padding: EdgeInsets.only(bottom: 8),
                      child: Row(
                        children: [
                          Icon(Icons.warning_amber, color: Colors.orange[600]),
                          SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              factor.toString(),
                              style: TextStyle(fontSize: 14),
                            ),
                          ),
                        ],
                      ),
                    )).toList(),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color) {
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
                fontSize: 24,
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

  Widget _buildProfileItem(String label, int count) {
    return Padding(
      padding: EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Expanded(child: Text(label)),
          Container(
            padding: EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: count > 0 ? Colors.red[100] : Colors.green[100],
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              count.toString(),
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: count > 0 ? Colors.red[800] : Colors.green[800],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatItem(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          value,
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: Colors.teal[700],
          ),
        ),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: Colors.grey[600],
          ),
        ),
      ],
    );
  }

  List<Widget> _buildDayOfWeekPatterns(Map<String, dynamic> patterns) {
    final dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    final total = patterns.values.fold(0, (sum, val) => sum + val);
    
    return patterns.entries.map((entry) {
      final dayIndex = int.tryParse(entry.key) ?? 0;
      final dayName = dayIndex < dayNames.length ? dayNames[dayIndex] : 'N/A';
      final count = entry.value as int;
      final percentage = total > 0 ? (count / total * 100) : 0;
      
      return Padding(
        padding: EdgeInsets.only(bottom: 4),
        child: Row(
          children: [
            SizedBox(
              width: 40,
              child: Text(dayName),
            ),
            Expanded(
              child: LinearProgressIndicator(
                value: percentage / 100,
                backgroundColor: Colors.grey[300],
                valueColor: AlwaysStoppedAnimation<Color>(Colors.blue[400]!),
              ),
            ),
            SizedBox(width: 8),
            Text('$count'),
          ],
        ),
      );
    }).toList();
  }

  List<Widget> _buildSeasonalPatterns(Map<String, dynamic> patterns) {
    final seasonNames = {
      'summer': 'Verano',
      'autumn': 'Otoño',
      'winter': 'Invierno',
      'spring': 'Primavera',
    };
    
    final total = patterns.values.fold(0, (sum, val) => sum + val);
    
    return patterns.entries.map((entry) {
      final seasonName = seasonNames[entry.key] ?? entry.key;
      final count = entry.value as int;
      final percentage = total > 0 ? (count / total * 100) : 0;
      
      return Padding(
        padding: EdgeInsets.only(bottom: 4),
        child: Row(
          children: [
            SizedBox(
              width: 80,
              child: Text(seasonName),
            ),
            Expanded(
              child: LinearProgressIndicator(
                value: percentage / 100,
                backgroundColor: Colors.grey[300],
                valueColor: AlwaysStoppedAnimation<Color>(Colors.orange[400]!),
              ),
            ),
            SizedBox(width: 8),
            Text('$count'),
          ],
        ),
      );
    }).toList();
  }

  String _getFitnessText(String? fitness) {
    switch (fitness) {
      case 'fit':
        return 'Apto';
      case 'fit_with_restrictions':
        return 'Apto con restricciones';
      case 'not_fit':
        return 'No apto';
      default:
        return 'Sin evaluar';
    }
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null) return 'N/A';
    try {
      final date = DateTime.parse(dateStr);
      return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
    } catch (e) {
      return dateStr;
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }
}