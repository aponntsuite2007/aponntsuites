class MedicalStudy {
  final String id;
  final String certificateId;
  final String userId;
  
  // Información del estudio
  final String studyType;
  final String studyName;
  final String? studyDescription;
  
  // Fechas
  final DateTime studyDate;
  final DateTime uploadDate;
  
  // Información médica
  final String? requestingPhysician;
  final String? performingInstitution;
  final String? technician;
  
  // Resultados
  final String? results;
  final String? interpretation;
  final String? conclusion;
  final String? recommendations;
  
  // Valores de referencia (para estudios de laboratorio)
  final Map<String, dynamic>? referenceValues;
  final Map<String, dynamic>? abnormalValues;
  
  // Archivos
  final List<String>? files;
  final String? mainFileUrl;
  final String? thumbnailUrl;
  
  // Estado del estudio
  final String status;
  final String priority;
  
  // Clasificación médica
  final String? bodySystem;
  final String? bodyPart;
  
  // Seguimiento
  final bool requiresFollowUp;
  final String? followUpInstructions;
  final DateTime? followUpDate;
  
  // Metadata
  final Map<String, dynamic>? metadata;
  
  // Control de calidad
  final bool isValidated;
  final String? validatedById;
  final DateTime? validatedAt;
  
  final DateTime createdAt;
  final DateTime updatedAt;

  MedicalStudy({
    required this.id,
    required this.certificateId,
    required this.userId,
    required this.studyType,
    required this.studyName,
    this.studyDescription,
    required this.studyDate,
    required this.uploadDate,
    this.requestingPhysician,
    this.performingInstitution,
    this.technician,
    this.results,
    this.interpretation,
    this.conclusion,
    this.recommendations,
    this.referenceValues,
    this.abnormalValues,
    this.files,
    this.mainFileUrl,
    this.thumbnailUrl,
    required this.status,
    required this.priority,
    this.bodySystem,
    this.bodyPart,
    required this.requiresFollowUp,
    this.followUpInstructions,
    this.followUpDate,
    this.metadata,
    required this.isValidated,
    this.validatedById,
    this.validatedAt,
    required this.createdAt,
    required this.updatedAt,
  });

  factory MedicalStudy.fromJson(Map<String, dynamic> json) {
    return MedicalStudy(
      id: json['id'],
      certificateId: json['certificateId'],
      userId: json['userId'],
      studyType: json['studyType'],
      studyName: json['studyName'],
      studyDescription: json['studyDescription'],
      studyDate: DateTime.parse(json['studyDate']),
      uploadDate: DateTime.parse(json['uploadDate']),
      requestingPhysician: json['requestingPhysician'],
      performingInstitution: json['performingInstitution'],
      technician: json['technician'],
      results: json['results'],
      interpretation: json['interpretation'],
      conclusion: json['conclusion'],
      recommendations: json['recommendations'],
      referenceValues: json['referenceValues'] != null 
          ? Map<String, dynamic>.from(json['referenceValues'])
          : null,
      abnormalValues: json['abnormalValues'] != null 
          ? Map<String, dynamic>.from(json['abnormalValues'])
          : null,
      files: json['files'] != null 
          ? List<String>.from(json['files'])
          : null,
      mainFileUrl: json['mainFileUrl'],
      thumbnailUrl: json['thumbnailUrl'],
      status: json['status'],
      priority: json['priority'],
      bodySystem: json['bodySystem'],
      bodyPart: json['bodyPart'],
      requiresFollowUp: json['requiresFollowUp'] ?? false,
      followUpInstructions: json['followUpInstructions'],
      followUpDate: json['followUpDate'] != null 
          ? DateTime.parse(json['followUpDate'])
          : null,
      metadata: json['metadata'] != null 
          ? Map<String, dynamic>.from(json['metadata'])
          : null,
      isValidated: json['isValidated'] ?? false,
      validatedById: json['validatedById'],
      validatedAt: json['validatedAt'] != null 
          ? DateTime.parse(json['validatedAt'])
          : null,
      createdAt: DateTime.parse(json['createdAt']),
      updatedAt: DateTime.parse(json['updatedAt']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'certificateId': certificateId,
      'userId': userId,
      'studyType': studyType,
      'studyName': studyName,
      'studyDescription': studyDescription,
      'studyDate': studyDate.toIso8601String(),
      'uploadDate': uploadDate.toIso8601String(),
      'requestingPhysician': requestingPhysician,
      'performingInstitution': performingInstitution,
      'technician': technician,
      'results': results,
      'interpretation': interpretation,
      'conclusion': conclusion,
      'recommendations': recommendations,
      'referenceValues': referenceValues,
      'abnormalValues': abnormalValues,
      'files': files,
      'mainFileUrl': mainFileUrl,
      'thumbnailUrl': thumbnailUrl,
      'status': status,
      'priority': priority,
      'bodySystem': bodySystem,
      'bodyPart': bodyPart,
      'requiresFollowUp': requiresFollowUp,
      'followUpInstructions': followUpInstructions,
      'followUpDate': followUpDate?.toIso8601String(),
      'metadata': metadata,
      'isValidated': isValidated,
      'validatedById': validatedById,
      'validatedAt': validatedAt?.toIso8601String(),
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  // Helper methods
  String get studyTypeText {
    switch (studyType) {
      case 'radiography':
        return 'Radiografía';
      case 'ct_scan':
        return 'Tomografía Computada';
      case 'mri':
        return 'Resonancia Magnética';
      case 'ultrasound':
        return 'Ecografía';
      case 'blood_test':
        return 'Análisis de Sangre';
      case 'urine_test':
        return 'Análisis de Orina';
      case 'electrocardiogram':
        return 'Electrocardiograma';
      case 'endoscopy':
        return 'Endoscopía';
      case 'biopsy':
        return 'Biopsia';
      case 'mammography':
        return 'Mamografía';
      case 'bone_scan':
        return 'Gammagrafía Ósea';
      case 'pet_scan':
        return 'PET Scan';
      case 'other':
        return 'Otro';
      default:
        return 'Estudio médico';
    }
  }

  String get statusText {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'completed':
        return 'Completado';
      case 'cancelled':
        return 'Cancelado';
      case 'in_progress':
        return 'En Progreso';
      default:
        return 'Estado desconocido';
    }
  }

  String get priorityText {
    switch (priority) {
      case 'low':
        return 'Baja';
      case 'normal':
        return 'Normal';
      case 'high':
        return 'Alta';
      case 'urgent':
        return 'Urgente';
      default:
        return 'Normal';
    }
  }

  bool get isPending => status == 'pending';
  bool get isCompleted => status == 'completed';
  bool get isCancelled => status == 'cancelled';
  bool get isInProgress => status == 'in_progress';
  
  bool get isLowPriority => priority == 'low';
  bool get isNormalPriority => priority == 'normal';
  bool get isHighPriority => priority == 'high';
  bool get isUrgent => priority == 'urgent';
  
  bool get hasFiles => files != null && files!.isNotEmpty;
  bool get hasMainFile => mainFileUrl != null;
}