import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';

import '../../providers/medical_absence_provider.dart';
import '../../providers/enhanced_auth_provider.dart';
import '../../widgets/common/loading_overlay.dart';
import '../../widgets/common/error_banner.dart';
import 'medical_questionnaire_widget.dart';
import 'medical_center_form.dart';
import 'prescription_form.dart';

class MedicalAbsenceScreen extends StatefulWidget {
  @override
  _MedicalAbsenceScreenState createState() => _MedicalAbsenceScreenState();
}

class _MedicalAbsenceScreenState extends State<MedicalAbsenceScreen> {
  final _formKey = GlobalKey<FormState>();
  final PageController _pageController = PageController();
  int _currentStep = 0;
  
  // Controllers para los campos de texto
  final _symptomsController = TextEditingController();
  final _diagnosisController = TextEditingController();
  final _medicalCenterController = TextEditingController();
  final _physicianController = TextEditingController();
  final _prescriptionController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadInitialData();
    });
  }

  Future<void> _loadInitialData() async {
    final authProvider = Provider.of<EnhancedAuthProvider>(context, listen: false);
    final medicalProvider = Provider.of<MedicalAbsenceProvider>(context, listen: false);
    
    await medicalProvider.loadAvailableQuestionnaires(
      branchId: authProvider.currentUser?.branchId
    );
    
    medicalProvider.initializeMedicalAbsenceForm();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Reporte de Ausencia Médica'),
        backgroundColor: Colors.red[700],
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: Consumer<MedicalAbsenceProvider>(
        builder: (context, provider, child) {
          if (provider.isLoading && provider.availableQuestionnaires.isEmpty) {
            return LoadingOverlay(
              isLoading: true,
              child: Container(),
            );
          }

          return Column(
            children: [
              if (provider.error != null)
                ErrorBanner(
                  message: provider.error!,
                  onDismiss: () => provider._clearError(),
                ),
              
              // Indicador de progreso
              Container(
                padding: EdgeInsets.all(16),
                color: Colors.grey[100],
                child: Row(
                  children: [
                    for (int i = 0; i < 4; i++) ...[
                      Container(
                        width: 30,
                        height: 30,
                        decoration: BoxDecoration(
                          color: i <= _currentStep ? Colors.red[700] : Colors.grey[300],
                          shape: BoxShape.circle,
                        ),
                        child: Center(
                          child: Text(
                            '${i + 1}',
                            style: TextStyle(
                              color: i <= _currentStep ? Colors.white : Colors.grey[600],
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                      if (i < 3)
                        Expanded(
                          child: Container(
                            height: 2,
                            color: i < _currentStep ? Colors.red[700] : Colors.grey[300],
                          ),
                        ),
                    ]
                  ],
                ),
              ),
              
              // Títulos de pasos
              Container(
                padding: EdgeInsets.symmetric(vertical: 8),
                child: Text(
                  _getStepTitle(_currentStep),
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.grey[800],
                  ),
                ),
              ),
              
              // Contenido de los pasos
              Expanded(
                child: LoadingOverlay(
                  isLoading: provider.isLoading,
                  child: PageView(
                    controller: _pageController,
                    physics: NeverScrollableScrollPhysics(), // Prevenir deslizamiento manual
                    onPageChanged: (page) {
                      setState(() {
                        _currentStep = page;
                      });
                    },
                    children: [
                      _buildStep1BasicInfo(provider),
                      _buildStep2Questionnaire(provider),
                      _buildStep3MedicalCenter(provider),
                      _buildStep4Review(provider),
                    ],
                  ),
                ),
              ),
              
              // Botones de navegación
              Container(
                padding: EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black12,
                      offset: Offset(0, -2),
                      blurRadius: 4,
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    if (_currentStep > 0)
                      Expanded(
                        child: ElevatedButton(
                          onPressed: _previousStep,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.grey[400],
                            foregroundColor: Colors.white,
                          ),
                          child: Text('Anterior'),
                        ),
                      ),
                    if (_currentStep > 0) SizedBox(width: 16),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: _currentStep < 3 ? _nextStep : _submitForm,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.red[700],
                          foregroundColor: Colors.white,
                        ),
                        child: Text(
                          _currentStep < 3 ? 'Siguiente' : 'Enviar Solicitud',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  String _getStepTitle(int step) {
    switch (step) {
      case 0:
        return 'Información Básica';
      case 1:
        return 'Cuestionario Médico';
      case 2:
        return 'Atención Médica';
      case 3:
        return 'Revisión y Envío';
      default:
        return '';
    }
  }

  Widget _buildStep1BasicInfo(MedicalAbsenceProvider provider) {
    return SingleChildScrollView(
      padding: EdgeInsets.all(16),
      child: Form(
        key: _formKey,
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
                      'Información de la Ausencia',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.red[700],
                      ),
                    ),
                    SizedBox(height: 16),
                    
                    // Fecha de inicio
                    Row(
                      children: [
                        Icon(Icons.calendar_today, color: Colors.red[700]),
                        SizedBox(width: 8),
                        Text('Fecha de inicio de ausencia:'),
                      ],
                    ),
                    SizedBox(height: 8),
                    InkWell(
                      onTap: () => _selectStartDate(context, provider),
                      child: Container(
                        padding: EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          border: Border.all(color: Colors.grey[300]!),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              DateFormat('dd/MM/yyyy').format(
                                provider.currentFormData['startDate'] ?? DateTime.now()
                              ),
                              style: TextStyle(fontSize: 16),
                            ),
                            Icon(Icons.arrow_drop_down),
                          ],
                        ),
                      ),
                    ),
                    SizedBox(height: 16),
                    
                    // Días solicitados
                    TextFormField(
                      initialValue: (provider.currentFormData['requestedDays'] ?? 1).toString(),
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        labelText: 'Días de ausencia solicitados',
                        prefixIcon: Icon(Icons.event_busy, color: Colors.red[700]),
                        border: OutlineInputBorder(),
                      ),
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Este campo es obligatorio';
                        }
                        final days = int.tryParse(value);
                        if (days == null || days < 1) {
                          return 'Debe ser un número mayor a 0';
                        }
                        return null;
                      },
                      onChanged: (value) {
                        final days = int.tryParse(value) ?? 1;
                        provider.updateFormData('requestedDays', days);
                      },
                    ),
                    SizedBox(height: 16),
                    
                    // Síntomas
                    TextFormField(
                      controller: _symptomsController,
                      maxLines: 4,
                      decoration: InputDecoration(
                        labelText: 'Describa sus síntomas *',
                        prefixIcon: Icon(Icons.medical_services, color: Colors.red[700]),
                        border: OutlineInputBorder(),
                        hintText: 'Describa detalladamente los síntomas que presenta...',
                      ),
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Debe describir sus síntomas';
                        }
                        if (value.trim().length < 10) {
                          return 'La descripción debe ser más detallada';
                        }
                        return null;
                      },
                      onChanged: (value) {
                        provider.updateFormData('symptoms', value);
                      },
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStep2Questionnaire(MedicalAbsenceProvider provider) {
    if (provider.currentQuestionnaire == null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.quiz, size: 64, color: Colors.grey[400]),
            SizedBox(height: 16),
            Text(
              'No hay cuestionario configurado',
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey[600],
              ),
            ),
          ],
        ),
      );
    }

    return MedicalQuestionnaireWidget(
      questionnaire: provider.currentQuestionnaire!,
      answers: provider.currentFormData['questionnaire'] ?? {},
      onAnswerChanged: (questionId, answer) {
        provider.updateQuestionnaireAnswer(questionId, answer);
      },
    );
  }

  Widget _buildStep3MedicalCenter(MedicalAbsenceProvider provider) {
    return MedicalCenterForm(
      hasVisitedDoctor: provider.currentFormData['hasVisitedDoctor'] ?? false,
      onHasVisitedDoctorChanged: (value) {
        provider.updateFormData('hasVisitedDoctor', value);
      },
      formData: provider.currentFormData,
      onFormDataChanged: (key, value) {
        provider.updateFormData(key, value);
      },
      onAddPrescription: (prescription) {
        provider.addPrescription(prescription);
      },
      onRemovePrescription: (index) {
        provider.removePrescription(index);
      },
      attachedFiles: provider.attachedFiles,
      onAddAttachment: provider.addAttachment,
      onRemoveAttachment: provider.removeAttachment,
    );
  }

  Widget _buildStep4Review(MedicalAbsenceProvider provider) {
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
                  Row(
                    children: [
                      Icon(Icons.assignment, color: Colors.red[700]),
                      SizedBox(width: 8),
                      Text(
                        'Resumen de la Solicitud',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  Divider(),
                  
                  _buildReviewItem(
                    'Fecha de inicio',
                    DateFormat('dd/MM/yyyy').format(
                      provider.currentFormData['startDate'] ?? DateTime.now()
                    ),
                  ),
                  
                  _buildReviewItem(
                    'Días solicitados',
                    '${provider.currentFormData['requestedDays'] ?? 1} días',
                  ),
                  
                  _buildReviewItem(
                    'Síntomas',
                    provider.currentFormData['symptoms']?.toString() ?? '',
                  ),
                  
                  if (provider.currentFormData['hasVisitedDoctor'] == true) ...[
                    _buildReviewItem(
                      'Centro médico',
                      provider.currentFormData['medicalCenter']?.toString() ?? '',
                    ),
                    _buildReviewItem(
                      'Médico tratante',
                      provider.currentFormData['attendingPhysician']?.toString() ?? '',
                    ),
                  ],
                  
                  if (provider.attachedFiles.isNotEmpty)
                    _buildReviewItem(
                      'Archivos adjuntos',
                      '${provider.attachedFiles.length} archivo(s) adjunto(s)',
                    ),
                ],
              ),
            ),
          ),
          
          SizedBox(height: 16),
          
          Card(
            color: Colors.orange[50],
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Column(
                children: [
                  Row(
                    children: [
                      Icon(Icons.info, color: Colors.orange[700]),
                      SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Información Importante',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.orange[700],
                          ),
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 8),
                  Text(
                    '• Su solicitud será revisada por el personal médico autorizado\n'
                    '• Recibirá notificaciones sobre el estado de su solicitud\n'
                    '• Es importante proporcionar información veraz y completa\n'
                    '• Puede ser requerido para una auditoría médica',
                    style: TextStyle(
                      color: Colors.orange[800],
                      fontSize: 14,
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

  Widget _buildReviewItem(String label, String value) {
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
            child: Text(
              value.isNotEmpty ? value : 'No especificado',
              style: TextStyle(
                color: value.isNotEmpty ? Colors.black87 : Colors.grey[500],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _selectStartDate(BuildContext context, MedicalAbsenceProvider provider) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: provider.currentFormData['startDate'] ?? DateTime.now(),
      firstDate: DateTime.now().subtract(Duration(days: 7)),
      lastDate: DateTime.now().add(Duration(days: 30)),
      locale: Locale('es', 'ES'),
    );
    
    if (picked != null) {
      provider.updateFormData('startDate', picked);
      
      // Calcular fecha de fin automáticamente
      final requestedDays = provider.currentFormData['requestedDays'] ?? 1;
      final endDate = picked.add(Duration(days: requestedDays - 1));
      provider.updateFormData('endDate', endDate);
    }
  }

  void _nextStep() {
    if (_currentStep == 0) {
      // Validar paso 1
      if (!_formKey.currentState!.validate()) {
        return;
      }
    }
    
    if (_currentStep < 3) {
      _pageController.nextPage(
        duration: Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    }
  }

  void _previousStep() {
    if (_currentStep > 0) {
      _pageController.previousPage(
        duration: Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    }
  }

  Future<void> _submitForm() async {
    final provider = Provider.of<MedicalAbsenceProvider>(context, listen: false);
    
    final success = await provider.submitMedicalAbsence();
    
    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Solicitud enviada correctamente'),
          backgroundColor: Colors.green,
        ),
      );
      
      Navigator.pop(context, true);
    }
  }

  @override
  void dispose() {
    _symptomsController.dispose();
    _diagnosisController.dispose();
    _medicalCenterController.dispose();
    _physicianController.dispose();
    _prescriptionController.dispose();
    super.dispose();
  }
}