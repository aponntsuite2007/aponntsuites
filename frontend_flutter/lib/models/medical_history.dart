class MedicalHistory {
  final String id;
  final String userId;
  
  // Información del episodio médico
  final DateTime episodeDate;
  final String episodeType;
  
  // Diagnóstico
  final String primaryDiagnosis;
  final String? primaryDiagnosisCode;
  final List<dynamic>? secondaryDiagnoses;
  
  // Detalles del episodio
  final String? symptoms;
  final String? treatment;
  final List<dynamic>? medications;
  
  // Duración y severidad
  final DateTime startDate;
  final DateTime? endDate;
  final int? duration;
  final String? severity;
  
  // Impacto laboral
  final int workDaysLost;
  final bool workRelated;
  final DateTime? returnToWorkDate;
  final List<dynamic>? workRestrictions;
  
  // Proveedor médico
  final String? healthcareProvider;
  final String? attendingPhysician;
  final String? institution;
  
  // Seguimiento
  final bool followUpRequired;
  final bool followUpCompleted;
  final DateTime? nextAppointment;
  
  // Estado del episodio
  final String status;
  final String? outcome;
  
  // Complicaciones
  final String? complications;
  
  // Prevención
  final String? preventiveMeasures;
  
  // Certificado médico asociado
  final String? certificateId;
  
  // Documentación
  final List<String>? attachments;
  
  // Metadata
  final String createdBy;
  final String? lastModifiedBy;
  final DateTime createdAt;
  final DateTime updatedAt;

  MedicalHistory({
    required this.id,
    required this.userId,
    required this.episodeDate,
    required this.episodeType,
    required this.primaryDiagnosis,
    this.primaryDiagnosisCode,
    this.secondaryDiagnoses,
    this.symptoms,
    this.treatment,
    this.medications,
    required this.startDate,
    this.endDate,
    this.duration,
    this.severity,
    required this.workDaysLost,
    required this.workRelated,
    this.returnToWorkDate,
    this.workRestrictions,
    this.healthcareProvider,
    this.attendingPhysician,
    this.institution,
    required this.followUpRequired,
    required this.followUpCompleted,
    this.nextAppointment,
    required this.status,
    this.outcome,
    this.complications,
    this.preventiveMeasures,
    this.certificateId,
    this.attachments,
    required this.createdBy,
    this.lastModifiedBy,
    required this.createdAt,
    required this.updatedAt,
  });

  factory MedicalHistory.fromJson(Map<String, dynamic> json) {
    return MedicalHistory(
      id: json['id'],
      userId: json['userId'],
      episodeDate: DateTime.parse(json['episodeDate']),
      episodeType: json['episodeType'],
      primaryDiagnosis: json['primaryDiagnosis'],
      primaryDiagnosisCode: json['primaryDiagnosisCode'],
      secondaryDiagnoses: json['secondaryDiagnoses'],
      symptoms: json['symptoms'],
      treatment: json['treatment'],
      medications: json['medications'],
      startDate: DateTime.parse(json['startDate']),
      endDate: json['endDate'] != null 
          ? DateTime.parse(json['endDate'])
          : null,
      duration: json['duration'],
      severity: json['severity'],
      workDaysLost: json['workDaysLost'] ?? 0,
      workRelated: json['workRelated'] ?? false,
      returnToWorkDate: json['returnToWorkDate'] != null 
          ? DateTime.parse(json['returnToWorkDate'])
          : null,
      workRestrictions: json['workRestrictions'],
      healthcareProvider: json['healthcareProvider'],
      attendingPhysician: json['attendingPhysician'],
      institution: json['institution'],
      followUpRequired: json['followUpRequired'] ?? false,
      followUpCompleted: json['followUpCompleted'] ?? false,
      nextAppointment: json['nextAppointment'] != null 
          ? DateTime.parse(json['nextAppointment'])
          : null,
      status: json['status'] ?? 'resolved',
      outcome: json['outcome'],
      complications: json['complications'],
      preventiveMeasures: json['preventiveMeasures'],
      certificateId: json['certificateId'],
      attachments: json['attachments'] != null 
          ? List<String>.from(json['attachments'])
          : null,
      createdBy: json['createdBy'],
      lastModifiedBy: json['lastModifiedBy'],
      createdAt: DateTime.parse(json['createdAt']),
      updatedAt: DateTime.parse(json['updatedAt']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'episodeDate': episodeDate.toIso8601String(),
      'episodeType': episodeType,
      'primaryDiagnosis': primaryDiagnosis,
      'primaryDiagnosisCode': primaryDiagnosisCode,
      'secondaryDiagnoses': secondaryDiagnoses,
      'symptoms': symptoms,
      'treatment': treatment,
      'medications': medications,
      'startDate': startDate.toIso8601String(),
      'endDate': endDate?.toIso8601String(),
      'duration': duration,
      'severity': severity,
      'workDaysLost': workDaysLost,
      'workRelated': workRelated,
      'returnToWorkDate': returnToWorkDate?.toIso8601String(),
      'workRestrictions': workRestrictions,
      'healthcareProvider': healthcareProvider,
      'attendingPhysician': attendingPhysician,
      'institution': institution,
      'followUpRequired': followUpRequired,
      'followUpCompleted': followUpCompleted,
      'nextAppointment': nextAppointment?.toIso8601String(),
      'status': status,
      'outcome': outcome,
      'complications': complications,
      'preventiveMeasures': preventiveMeasures,
      'certificateId': certificateId,
      'attachments': attachments,
      'createdBy': createdBy,
      'lastModifiedBy': lastModifiedBy,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  // Helper methods
  String get episodeTypeText {
    switch (episodeType) {
      case 'illness':
        return 'Enfermedad';
      case 'injury':
        return 'Lesión';
      case 'accident':
        return 'Accidente';
      case 'surgery':
        return 'Cirugía';
      case 'hospitalization':
        return 'Hospitalización';
      case 'emergency_visit':
        return 'Visita de Emergencia';
      case 'routine_checkup':
        return 'Chequeo de Rutina';
      case 'vaccination':
        return 'Vacunación';
      case 'other':
        return 'Otro';
      default:
        return 'Episodio médico';
    }
  }

  String get statusText {
    switch (status) {
      case 'active':
        return 'Activo';
      case 'resolved':
        return 'Resuelto';
      case 'chronic':
        return 'Crónico';
      case 'recurring':
        return 'Recurrente';
      default:
        return 'Estado desconocido';
    }
  }

  String get severityText {
    switch (severity) {
      case 'mild':
        return 'Leve';
      case 'moderate':
        return 'Moderado';
      case 'severe':
        return 'Severo';
      case 'critical':
        return 'Crítico';
      default:
        return 'No especificado';
    }
  }

  String get outcomeText {
    switch (outcome) {
      case 'full_recovery':
        return 'Recuperación completa';
      case 'partial_recovery':
        return 'Recuperación parcial';
      case 'no_change':
        return 'Sin cambios';
      case 'worsened':
        return 'Empeorado';
      case 'chronic':
        return 'Crónico';
      default:
        return 'No especificado';
    }
  }

  bool get isActive => status == 'active';
  bool get isResolved => status == 'resolved';
  bool get isChronic => status == 'chronic';
  bool get isRecurring => status == 'recurring';

  bool get isMild => severity == 'mild';
  bool get isModerate => severity == 'moderate';
  bool get isSevere => severity == 'severe';
  bool get isCritical => severity == 'critical';

  bool get isIllness => episodeType == 'illness';
  bool get isInjury => episodeType == 'injury';
  bool get isAccident => episodeType == 'accident';
  bool get isSurgery => episodeType == 'surgery';

  bool get hasComplications => complications != null && complications!.isNotEmpty;
  bool get hasAttachments => attachments != null && attachments!.isNotEmpty;
  bool get hasMedications => medications != null && medications!.isNotEmpty;

  bool get needsFollowUp => followUpRequired && !followUpCompleted;

  int get daysUntilFollowUp {
    if (nextAppointment == null) return -1;
    return nextAppointment!.difference(DateTime.now()).inDays;
  }

  bool get hasRecentOccurrence {
    final daysSinceEpisode = DateTime.now().difference(episodeDate).inDays;
    return daysSinceEpisode <= 30;
  }
}