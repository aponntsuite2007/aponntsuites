import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';

import '../../providers/enhanced_auth_provider.dart';
import '../../models/employee_medical_record.dart';
import '../../models/medical_history.dart';
import '../../widgets/common/loading_overlay.dart';
import '../../widgets/common/error_banner.dart';

class EmployeeMedicalHistoryScreen extends StatefulWidget {
  final String employeeId;

  EmployeeMedicalHistoryScreen({required this.employeeId});

  @override
  _EmployeeMedicalHistoryScreenState createState() => _EmployeeMedicalHistoryScreenState();
}

class _EmployeeMedicalHistoryScreenState extends State<EmployeeMedicalHistoryScreen>
    with TickerProviderStateMixin {
  late TabController _tabController;
  EmployeeMedicalRecord? _medicalRecord;
  List<MedicalHistory> _medicalHistory = [];
  Map<String, List<MedicalHistory>> _historyByDiagnosis = {};
  bool _isLoading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadEmployeeData();
  }

  Future<void> _loadEmployeeData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final authProvider = Provider.of<EnhancedAuthProvider>(context, listen: false);
      
      // Cargar ficha médica
      final recordResponse = await authProvider.apiService.get('/medical/medical-record/${widget.employeeId}');
      if (recordResponse.isSuccess) {
        _medicalRecord = EmployeeMedicalRecord.fromJson(recordResponse.data);
      }

      // Cargar historial médico
      final historyResponse = await authProvider.apiService.get('/medical/history/${widget.employeeId}');
      if (historyResponse.isSuccess) {
        _medicalHistory = (historyResponse.data as List)
            .map((json) => MedicalHistory.fromJson(json))
            .toList();
        
        // Agrupar por diagnóstico
        _groupHistoryByDiagnosis();
      }

    } catch (e) {
      setState(() {
        _error = 'Error cargando datos: $e';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  void _groupHistoryByDiagnosis() {
    _historyByDiagnosis.clear();
    for (var episode in _medicalHistory) {
      final diagnosis = episode.primaryDiagnosisCode ?? 'Sin código';
      if (!_historyByDiagnosis.containsKey(diagnosis)) {
        _historyByDiagnosis[diagnosis] = [];
      }
      _historyByDiagnosis[diagnosis]!.add(episode);
    }
    
    // Ordenar cada grupo por fecha
    _historyByDiagnosis.forEach((key, episodes) {
      episodes.sort((a, b) => b.episodeDate.compareTo(a.episodeDate));
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Ficha Médica del Empleado'),
        backgroundColor: Colors.blue[700],
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          tabs: [
            Tab(
              icon: Icon(Icons.person),
              text: 'Ficha Personal',
            ),
            Tab(
              icon: Icon(Icons.history),
              text: 'Historial',
            ),
            Tab(
              icon: Icon(Icons.analytics),
              text: 'Por Diagnóstico',
            ),
          ],
        ),
      ),
      body: LoadingOverlay(
        isLoading: _isLoading,
        child: Column(
          children: [
            if (_error != null)
              ErrorBanner(
                message: _error!,
                onDismiss: () => setState(() => _error = null),
                onRetry: _loadEmployeeData,
              ),
            
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  _buildMedicalRecordTab(),
                  _buildHistoryTab(),
                  _buildDiagnosisTab(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMedicalRecordTab() {
    if (_medicalRecord == null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.medical_information, size: 64, color: Colors.grey[400]),
            SizedBox(height: 16),
            Text(
              'No se encontró ficha médica',
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey[600],
              ),
            ),
          ],
        ),
      );
    }

    return SingleChildScrollView(
      padding: EdgeInsets.all(16),
      child: Column(
        children: [
          // Información básica
          Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.person, color: Colors.blue[700]),
                      SizedBox(width: 8),
                      Text(
                        'Información Personal',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 16),
                  
                  if (_medicalRecord!.bloodType != null)
                    _buildInfoRow('Grupo Sanguíneo', _medicalRecord!.bloodType!),
                  if (_medicalRecord!.height != null)
                    _buildInfoRow('Altura', '${_medicalRecord!.height} cm'),
                  if (_medicalRecord!.weight != null)
                    _buildInfoRow('Peso', '${_medicalRecord!.weight} kg'),
                  
                  _buildInfoRow('Estado de Salud', 
                    _getHealthStatusText(_medicalRecord!.healthStatus)),
                  _buildInfoRow('Aptitud Laboral', 
                    _getFitnessForWorkText(_medicalRecord!.fitnessForWork)),
                ],
              ),
            ),
          ),
          SizedBox(height: 16),
          
          // Alergias
          if (_medicalRecord!.allergies != null || _medicalRecord!.medicationAllergies != null)
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
                          'Alergias',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.red[700],
                          ),
                        ),
                      ],
                    ),
                    SizedBox(height: 12),
                    
                    if (_medicalRecord!.allergies != null) ...[
                      Text(
                        'Alergias Generales:',
                        style: TextStyle(fontWeight: FontWeight.w500),
                      ),
                      ..._getAllergiesList(_medicalRecord!.allergies!),
                      SizedBox(height: 8),
                    ],
                    
                    if (_medicalRecord!.medicationAllergies != null) ...[
                      Text(
                        'Alergias a Medicamentos:',
                        style: TextStyle(fontWeight: FontWeight.w500),
                      ),
                      ..._getAllergiesList(_medicalRecord!.medicationAllergies!),
                    ],
                  ],
                ),
              ),
            ),
          SizedBox(height: 16),
          
          // Enfermedades crónicas
          if (_medicalRecord!.chronicDiseases != null || _medicalRecord!.preexistingConditions != null)
            Card(
              color: Colors.orange[50],
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.medical_information, color: Colors.orange[700]),
                        SizedBox(width: 8),
                        Text(
                          'Condiciones Preexistentes',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.orange[700],
                          ),
                        ),
                      ],
                    ),
                    SizedBox(height: 12),
                    
                    if (_medicalRecord!.chronicDiseases != null) ...[
                      Text(
                        'Enfermedades Crónicas:',
                        style: TextStyle(fontWeight: FontWeight.w500),
                      ),
                      ..._getChronicDiseasesList(_medicalRecord!.chronicDiseases!),
                      SizedBox(height: 8),
                    ],
                    
                    if (_medicalRecord!.preexistingConditions != null) ...[
                      Text(
                        'Otras Condiciones:',
                        style: TextStyle(fontWeight: FontWeight.w500),
                      ),
                      ..._getPreexistingConditionsList(_medicalRecord!.preexistingConditions!),
                    ],
                  ],
                ),
              ),
            ),
          SizedBox(height: 16),
          
          // Medicación habitual
          if (_medicalRecord!.currentMedications != null)
            Card(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.medication, color: Colors.blue[700]),
                        SizedBox(width: 8),
                        Text(
                          'Medicación Habitual',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    SizedBox(height: 12),
                    ..._getCurrentMedicationsList(_medicalRecord!.currentMedications!),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildHistoryTab() {
    if (_medicalHistory.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.history, size: 64, color: Colors.grey[400]),
            SizedBox(height: 16),
            Text(
              'Sin historial médico',
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey[600],
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadEmployeeData,
      child: ListView.builder(
        padding: EdgeInsets.all(16),
        itemCount: _medicalHistory.length,
        itemBuilder: (context, index) {
          final episode = _medicalHistory[index];
          return Card(
            margin: EdgeInsets.only(bottom: 12),
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: _getEpisodeTypeColor(episode.episodeType),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          _getEpisodeTypeText(episode.episodeType),
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      Spacer(),
                      Text(
                        DateFormat('dd/MM/yyyy').format(episode.episodeDate),
                        style: TextStyle(
                          color: Colors.grey[600],
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 8),
                  
                  Text(
                    episode.primaryDiagnosis,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  
                  if (episode.primaryDiagnosisCode != null) ...[
                    SizedBox(height: 4),
                    Text(
                      'Código: ${episode.primaryDiagnosisCode}',
                      style: TextStyle(
                        color: Colors.grey[600],
                        fontSize: 12,
                      ),
                    ),
                  ],
                  
                  if (episode.symptoms != null) ...[
                    SizedBox(height: 8),
                    Text(
                      'Síntomas: ${episode.symptoms}',
                      style: TextStyle(fontSize: 13),
                    ),
                  ],
                  
                  SizedBox(height: 8),
                  Row(
                    children: [
                      if (episode.duration != null) ...[
                        Icon(Icons.schedule, size: 14, color: Colors.grey[600]),
                        SizedBox(width: 4),
                        Text(
                          '${episode.duration} días',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[600],
                          ),
                        ),
                        SizedBox(width: 16),
                      ],
                      Icon(Icons.work_off, size: 14, color: Colors.grey[600]),
                      SizedBox(width: 4),
                      Text(
                        '${episode.workDaysLost} días perdidos',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildDiagnosisTab() {
    if (_historyByDiagnosis.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.analytics, size: 64, color: Colors.grey[400]),
            SizedBox(height: 16),
            Text(
              'Sin diagnósticos registrados',
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey[600],
              ),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: EdgeInsets.all(16),
      itemCount: _historyByDiagnosis.keys.length,
      itemBuilder: (context, index) {
        final diagnosis = _historyByDiagnosis.keys.toList()[index];
        final episodes = _historyByDiagnosis[diagnosis]!;
        final totalDaysLost = episodes.fold<int>(0, (sum, episode) => sum + episode.workDaysLost);
        
        return Card(
          margin: EdgeInsets.only(bottom: 12),
          child: Theme(
            data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
            child: ExpansionTile(
              title: Text(
                episodes.first.primaryDiagnosis,
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (diagnosis != 'Sin código')
                    Text(
                      'Código: $diagnosis',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey[600],
                      ),
                    ),
                  SizedBox(height: 4),
                  Row(
                    children: [
                      Text(
                        '${episodes.length} episodio${episodes.length > 1 ? 's' : ''}',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.blue[600],
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      SizedBox(width: 16),
                      Text(
                        '$totalDaysLost días perdidos',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.red[600],
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              children: episodes.map((episode) {
                return ListTile(
                  dense: true,
                  leading: CircleAvatar(
                    backgroundColor: _getEpisodeTypeColor(episode.episodeType),
                    radius: 12,
                    child: Text(
                      episode.workDaysLost.toString(),
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  title: Text(
                    DateFormat('dd/MM/yyyy').format(episode.episodeDate),
                    style: TextStyle(fontSize: 14),
                  ),
                  subtitle: Text(
                    episode.symptoms ?? 'Sin síntomas registrados',
                    style: TextStyle(fontSize: 12),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  trailing: Text(
                    '${episode.workDaysLost}d',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Colors.red[600],
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        );
      },
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
              style: TextStyle(
                fontWeight: FontWeight.w500,
                color: Colors.grey[700],
              ),
            ),
          ),
          Expanded(
            child: Text(value),
          ),
        ],
      ),
    );
  }

  List<Widget> _getAllergiesList(List<dynamic> allergies) {
    return allergies.map((allergy) {
      if (allergy is Map<String, dynamic>) {
        return Padding(
          padding: EdgeInsets.only(left: 16, bottom: 4),
          child: Row(
            children: [
              Icon(Icons.circle, size: 6, color: Colors.red[700]),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  '${allergy['name'] ?? 'Sin nombre'} - ${allergy['severity'] ?? 'Severidad no especificada'}',
                  style: TextStyle(fontSize: 13),
                ),
              ),
            ],
          ),
        );
      } else {
        return Padding(
          padding: EdgeInsets.only(left: 16, bottom: 4),
          child: Row(
            children: [
              Icon(Icons.circle, size: 6, color: Colors.red[700]),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  allergy.toString(),
                  style: TextStyle(fontSize: 13),
                ),
              ),
            ],
          ),
        );
      }
    }).toList();
  }

  List<Widget> _getChronicDiseasesList(List<dynamic> diseases) {
    return diseases.map((disease) {
      if (disease is Map<String, dynamic>) {
        return Padding(
          padding: EdgeInsets.only(left: 16, bottom: 4),
          child: Row(
            children: [
              Icon(Icons.circle, size: 6, color: Colors.orange[700]),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  '${disease['name'] ?? 'Sin nombre'} - Diagnosticado: ${disease['diagnosisDate'] ?? 'Fecha no especificada'}',
                  style: TextStyle(fontSize: 13),
                ),
              ),
            ],
          ),
        );
      } else {
        return Padding(
          padding: EdgeInsets.only(left: 16, bottom: 4),
          child: Row(
            children: [
              Icon(Icons.circle, size: 6, color: Colors.orange[700]),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  disease.toString(),
                  style: TextStyle(fontSize: 13),
                ),
              ),
            ],
          ),
        );
      }
    }).toList();
  }

  List<Widget> _getPreexistingConditionsList(List<dynamic> conditions) {
    return conditions.map((condition) {
      if (condition is Map<String, dynamic>) {
        return Padding(
          padding: EdgeInsets.only(left: 16, bottom: 4),
          child: Row(
            children: [
              Icon(Icons.circle, size: 6, color: Colors.orange[700]),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  condition['name'] ?? condition.toString(),
                  style: TextStyle(fontSize: 13),
                ),
              ),
            ],
          ),
        );
      } else {
        return Padding(
          padding: EdgeInsets.only(left: 16, bottom: 4),
          child: Row(
            children: [
              Icon(Icons.circle, size: 6, color: Colors.orange[700]),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  condition.toString(),
                  style: TextStyle(fontSize: 13),
                ),
              ),
            ],
          ),
        );
      }
    }).toList();
  }

  List<Widget> _getCurrentMedicationsList(List<dynamic> medications) {
    return medications.map((medication) {
      if (medication is Map<String, dynamic>) {
        return Padding(
          padding: EdgeInsets.only(bottom: 8),
          child: Row(
            children: [
              Icon(Icons.medication, size: 16, color: Colors.blue[700]),
              SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      medication['name'] ?? 'Medicamento sin nombre',
                      style: TextStyle(
                        fontWeight: FontWeight.w500,
                        fontSize: 14,
                      ),
                    ),
                    if (medication['dosage'] != null)
                      Text(
                        'Dosis: ${medication['dosage']}',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey[600],
                        ),
                      ),
                    if (medication['frequency'] != null)
                      Text(
                        'Frecuencia: ${medication['frequency']}',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey[600],
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        );
      } else {
        return Padding(
          padding: EdgeInsets.only(bottom: 4),
          child: Row(
            children: [
              Icon(Icons.medication, size: 16, color: Colors.blue[700]),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  medication.toString(),
                  style: TextStyle(fontSize: 13),
                ),
              ),
            ],
          ),
        );
      }
    }).toList();
  }

  String _getHealthStatusText(String? status) {
    switch (status) {
      case 'excellent':
        return 'Excelente';
      case 'good':
        return 'Bueno';
      case 'fair':
        return 'Regular';
      case 'poor':
        return 'Deficiente';
      default:
        return 'No especificado';
    }
  }

  String _getFitnessForWorkText(String? fitness) {
    switch (fitness) {
      case 'fit':
        return 'Apto para trabajar';
      case 'fit_with_restrictions':
        return 'Apto con restricciones';
      case 'temporarily_unfit':
        return 'Temporalmente no apto';
      case 'permanently_unfit':
        return 'Permanentemente no apto';
      default:
        return 'No evaluado';
    }
  }

  String _getEpisodeTypeText(String type) {
    switch (type) {
      case 'illness':
        return 'ENFERMEDAD';
      case 'injury':
        return 'LESIÓN';
      case 'accident':
        return 'ACCIDENTE';
      case 'surgery':
        return 'CIRUGÍA';
      case 'hospitalization':
        return 'HOSPITALIZACIÓN';
      case 'emergency_visit':
        return 'EMERGENCIA';
      case 'routine_checkup':
        return 'CHEQUEO';
      case 'vaccination':
        return 'VACUNACIÓN';
      default:
        return 'OTRO';
    }
  }

  Color _getEpisodeTypeColor(String type) {
    switch (type) {
      case 'illness':
        return Colors.orange[600]!;
      case 'injury':
        return Colors.red[600]!;
      case 'accident':
        return Colors.red[800]!;
      case 'surgery':
        return Colors.purple[600]!;
      case 'hospitalization':
        return Colors.red[700]!;
      case 'emergency_visit':
        return Colors.red[900]!;
      case 'routine_checkup':
        return Colors.green[600]!;
      case 'vaccination':
        return Colors.blue[600]!;
      default:
        return Colors.grey[600]!;
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }
}