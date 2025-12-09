import 'package:flutter/foundation.dart';
import 'dart:convert';
import 'dart:io';

import '../services/api_service.dart';
import '../models/medical_certificate.dart';
import '../models/medical_prescription.dart';
import '../models/medical_questionnaire.dart';

class MedicalAbsenceProvider extends ChangeNotifier {
  final ApiService _apiService;
  
  bool _isLoading = false;
  String? _error;
  
  // Certificados médicos
  List<MedicalCertificate> _certificates = [];
  List<MedicalPrescription> _prescriptions = [];
  
  // Cuestionarios disponibles
  List<MedicalQuestionnaire> _availableQuestionnaires = [];
  MedicalQuestionnaire? _currentQuestionnaire;
  
  // Estado del formulario actual
  Map<String, dynamic> _currentFormData = {};
  List<File> _attachedFiles = [];
  
  MedicalAbsenceProvider(this._apiService);
  
  // Getters
  bool get isLoading => _isLoading;
  String? get error => _error;
  List<MedicalCertificate> get certificates => _certificates;
  List<MedicalPrescription> get prescriptions => _prescriptions;
  List<MedicalQuestionnaire> get availableQuestionnaires => _availableQuestionnaires;
  MedicalQuestionnaire? get currentQuestionnaire => _currentQuestionnaire;
  Map<String, dynamic> get currentFormData => _currentFormData;
  List<File> get attachedFiles => _attachedFiles;
  
  /// Cargar cuestionarios disponibles para la empresa/sucursal
  Future<void> loadAvailableQuestionnaires({String? branchId}) async {
    _setLoading(true);
    _clearError();
    
    try {
      final response = await _apiService.get('/medical/questionnaires', 
        queryParams: branchId != null ? {'branchId': branchId} : null
      );
      
      if (response.isSuccess && response.data != null) {
        _availableQuestionnaires = (response.data as List)
            .map((json) => MedicalQuestionnaire.fromJson(json))
            .toList();
        
        // Seleccionar el cuestionario por defecto
        _currentQuestionnaire = _availableQuestionnaires
            .where((q) => q.isDefault)
            .firstOrNull;
        _currentQuestionnaire ??= _availableQuestionnaires.firstOrNull;
        
        _setLoading(false);
      } else {
        _setError(response.error ?? 'Error cargando cuestionarios');
      }
    } catch (e) {
      _setError('Error inesperado: \$e');
    }
  }
  
  /// Inicializar formulario de ausencia médica
  void initializeMedicalAbsenceForm() {
    _currentFormData = {
      'hasVisitedDoctor': false,
      'medicalCenter': '',
      'attendingPhysician': '',
      'medicalPrescription': '',
      'diagnosisCode': '',
      'diagnosis': '',
      'symptoms': '',
      'startDate': DateTime.now(),
      'requestedDays': 1,
      'questionnaire': {},
      'prescriptions': <Map<String, dynamic>>[],
    };
    _attachedFiles.clear();
    notifyListeners();
  }
  
  /// Actualizar datos del formulario
  void updateFormData(String key, dynamic value) {
    _currentFormData[key] = value;
    notifyListeners();
  }
  
  /// Actualizar respuesta del cuestionario
  void updateQuestionnaireAnswer(String questionId, dynamic answer) {
    if (_currentFormData['questionnaire'] == null) {
      _currentFormData['questionnaire'] = {};
    }
    _currentFormData['questionnaire'][questionId] = answer;
    notifyListeners();
  }
  
  /// Agregar archivo adjunto
  void addAttachment(File file) {
    _attachedFiles.add(file);
    notifyListeners();
  }
  
  /// Remover archivo adjunto
  void removeAttachment(int index) {
    if (index >= 0 && index < _attachedFiles.length) {
      _attachedFiles.removeAt(index);
      notifyListeners();
    }
  }
  
  /// Agregar prescripción médica
  void addPrescription(Map<String, dynamic> prescription) {
    List<Map<String, dynamic>> prescriptions = 
        List<Map<String, dynamic>>.from(_currentFormData['prescriptions'] ?? []);
    prescriptions.add(prescription);
    _currentFormData['prescriptions'] = prescriptions;
    notifyListeners();
  }
  
  /// Remover prescripción médica
  void removePrescription(int index) {
    List<Map<String, dynamic>> prescriptions = 
        List<Map<String, dynamic>>.from(_currentFormData['prescriptions'] ?? []);
    if (index >= 0 && index < prescriptions.length) {
      prescriptions.removeAt(index);
      _currentFormData['prescriptions'] = prescriptions;
      notifyListeners();
    }
  }
  
  /// Validar formulario antes del envío
  bool validateForm() {
    _clearError();
    
    // Validaciones básicas
    if (_currentFormData['startDate'] == null) {
      _setError('Debe seleccionar la fecha de inicio');
      return false;
    }
    
    if (_currentFormData['requestedDays'] == null || 
        _currentFormData['requestedDays'] < 1) {
      _setError('Debe indicar los días solicitados');
      return false;
    }
    
    if (_currentFormData['symptoms']?.toString().trim().isEmpty ?? true) {
      _setError('Debe describir los síntomas');
      return false;
    }
    
    // Validar cuestionario si está presente
    if (_currentQuestionnaire != null) {
      for (var question in _currentQuestionnaire!.questions) {
        String questionId = question.id;
        if (question.required == true &&
            (_currentFormData['questionnaire'][questionId] == null ||
             _currentFormData['questionnaire'][questionId].toString().isEmpty)) {
          _setError('Debe completar todas las preguntas obligatorias');
          return false;
        }
      }
    }
    
    // Si visitó médico, validar campos obligatorios
    if (_currentFormData['hasVisitedDoctor'] == true) {
      if (_currentFormData['medicalCenter']?.toString().trim().isEmpty ?? true) {
        _setError('Debe indicar el centro médico visitado');
        return false;
      }
      
      if (_currentFormData['attendingPhysician']?.toString().trim().isEmpty ?? true) {
        _setError('Debe indicar el médico que lo atendió');
        return false;
      }
    }
    
    return true;
  }
  
  /// Enviar solicitud de ausencia médica
  Future<bool> submitMedicalAbsence() async {
    if (!validateForm()) return false;
    
    _setLoading(true);
    _clearError();
    
    try {
      // Preparar datos del certificado
      final certificateData = {
        'startDate': _currentFormData['startDate']!.toIso8601String(),
        'requestedDays': _currentFormData['requestedDays'],
        'symptoms': _currentFormData['symptoms'],
        'hasVisitedDoctor': _currentFormData['hasVisitedDoctor'],
        'medicalCenter': _currentFormData['medicalCenter'],
        'attendingPhysician': _currentFormData['attendingPhysician'],
        'medicalPrescription': _currentFormData['medicalPrescription'],
        'diagnosisCode': _currentFormData['diagnosisCode'],
        'diagnosis': _currentFormData['diagnosis'],
        'questionnaire': _currentFormData['questionnaire'],
      };
      
      // Subir archivos adjuntos si los hay
      List<String> attachmentUrls = [];
      for (File file in _attachedFiles) {
        final uploadResponse = await _apiService.uploadFile(file, 'medical-certificates');
        if (uploadResponse.isSuccess && uploadResponse.data != null) {
          attachmentUrls.add(uploadResponse.data!['url']);
        }
      }
      
      if (attachmentUrls.isNotEmpty) {
        certificateData['attachments'] = attachmentUrls;
      }
      
      // Crear certificado médico
      final response = await _apiService.post('/medical/certificates', certificateData);
      
      if (response.isSuccess && response.data != null) {
        final certificate = MedicalCertificate.fromJson(response.data!);
        _certificates.insert(0, certificate);
        
        // Crear prescripciones si las hay
        List<Map<String, dynamic>> prescriptions = 
            List<Map<String, dynamic>>.from(_currentFormData['prescriptions'] ?? []);
        
        for (var prescriptionData in prescriptions) {
          prescriptionData['certificateId'] = certificate.id;
          final prescResponse = await _apiService.post('/medical/prescriptions', prescriptionData);
          if (prescResponse.isSuccess) {
            _prescriptions.insert(0, MedicalPrescription.fromJson(prescResponse.data!));
          }
        }
        
        // Limpiar formulario
        initializeMedicalAbsenceForm();
        
        _setLoading(false);
        return true;
      } else {
        _setError(response.error ?? 'Error enviando solicitud');
        _setLoading(false);
        return false;
      }
    } catch (e) {
      _setError('Error inesperado: \$e');
      _setLoading(false);
      return false;
    }
  }
  
  /// Cargar certificados del usuario
  Future<void> loadUserCertificates() async {
    _setLoading(true);
    _clearError();
    
    try {
      final response = await _apiService.get('/medical/certificates/my');
      
      if (response.isSuccess && response.data != null) {
        _certificates = (response.data as List)
            .map((json) => MedicalCertificate.fromJson(json))
            .toList();
        _setLoading(false);
      } else {
        _setError(response.error ?? 'Error cargando certificados');
      }
    } catch (e) {
      _setError('Error inesperado: \$e');
    }
  }
  
  /// Cargar prescripciones del usuario
  Future<void> loadUserPrescriptions() async {
    _setLoading(true);
    _clearError();
    
    try {
      final response = await _apiService.get('/medical/prescriptions/my');
      
      if (response.isSuccess && response.data != null) {
        _prescriptions = (response.data as List)
            .map((json) => MedicalPrescription.fromJson(json))
            .toList();
        _setLoading(false);
      } else {
        _setError(response.error ?? 'Error cargando prescripciones');
      }
    } catch (e) {
      _setError('Error inesperado: \$e');
    }
  }
  
  /// Obtener certificado por ID
  MedicalCertificate? getCertificateById(String id) {
    try {
      return _certificates.firstWhere((cert) => cert.id == id);
    } catch (e) {
      return null;
    }
  }
  
  /// Obtener estado del certificado en texto legible
  String getCertificateStatusText(String status) {
    switch (status) {
      case 'pending':
        return 'Pendiente de revisión';
      case 'under_review':
        return 'En revisión médica';
      case 'approved':
        return 'Aprobado';
      case 'rejected':
        return 'Rechazado';
      case 'needs_audit':
        return 'Requiere auditoría';
      default:
        return 'Estado desconocido';
    }
  }
  
  // Helper methods
  void _setLoading(bool loading) {
    _isLoading = loading;
    if (loading) _error = null;
    notifyListeners();
  }
  
  void _setError(String error) {
    _error = error;
    _isLoading = false;
    notifyListeners();
  }
  
  void _clearError() {
    _error = null;
    notifyListeners();
  }
  
  @override
  void dispose() {
    super.dispose();
  }
}

extension ListExtension<T> on List<T> {
  T? get firstOrNull => isEmpty ? null : first;
}