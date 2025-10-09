class MedicalCertificate {
  final String id;
  final String userId;
  final String? certificateNumber;
  final DateTime issueDate;
  final DateTime startDate;
  final DateTime endDate;
  final int requestedDays;
  
  // Información médica
  final String? diagnosisCode;
  final String? diagnosis;
  final String? symptoms;
  
  // Centro médico
  final bool hasVisitedDoctor;
  final String? medicalCenter;
  final String? attendingPhysician;
  final String? medicalPrescription;
  
  // Cuestionario médico
  final Map<String, dynamic>? questionnaire;
  
  // Estado y respuestas
  final String status;
  final String? auditorId;
  final String? auditorResponse;
  final int? approvedDays;
  final bool needsAudit;
  final bool? isJustified;
  final DateTime? auditDate;
  
  // Archivos adjuntos
  final List<String>? attachments;
  
  // Metadata
  final String createdBy;
  final String? lastModifiedBy;
  final DateTime createdAt;
  final DateTime updatedAt;

  MedicalCertificate({
    required this.id,
    required this.userId,
    this.certificateNumber,
    required this.issueDate,
    required this.startDate,
    required this.endDate,
    required this.requestedDays,
    this.diagnosisCode,
    this.diagnosis,
    this.symptoms,
    required this.hasVisitedDoctor,
    this.medicalCenter,
    this.attendingPhysician,
    this.medicalPrescription,
    this.questionnaire,
    required this.status,
    this.auditorId,
    this.auditorResponse,
    this.approvedDays,
    required this.needsAudit,
    this.isJustified,
    this.auditDate,
    this.attachments,
    required this.createdBy,
    this.lastModifiedBy,
    required this.createdAt,
    required this.updatedAt,
  });

  factory MedicalCertificate.fromJson(Map<String, dynamic> json) {
    return MedicalCertificate(
      id: json['id'],
      userId: json['userId'],
      certificateNumber: json['certificateNumber'],
      issueDate: DateTime.parse(json['issueDate']),
      startDate: DateTime.parse(json['startDate']),
      endDate: DateTime.parse(json['endDate']),
      requestedDays: json['requestedDays'],
      diagnosisCode: json['diagnosisCode'],
      diagnosis: json['diagnosis'],
      symptoms: json['symptoms'],
      hasVisitedDoctor: json['hasVisitedDoctor'] ?? false,
      medicalCenter: json['medicalCenter'],
      attendingPhysician: json['attendingPhysician'],
      medicalPrescription: json['medicalPrescription'],
      questionnaire: json['questionnaire'] != null 
          ? Map<String, dynamic>.from(json['questionnaire'])
          : null,
      status: json['status'],
      auditorId: json['auditorId'],
      auditorResponse: json['auditorResponse'],
      approvedDays: json['approvedDays'],
      needsAudit: json['needsAudit'] ?? true,
      isJustified: json['isJustified'],
      auditDate: json['auditDate'] != null 
          ? DateTime.parse(json['auditDate'])
          : null,
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
      'certificateNumber': certificateNumber,
      'issueDate': issueDate.toIso8601String(),
      'startDate': startDate.toIso8601String(),
      'endDate': endDate.toIso8601String(),
      'requestedDays': requestedDays,
      'diagnosisCode': diagnosisCode,
      'diagnosis': diagnosis,
      'symptoms': symptoms,
      'hasVisitedDoctor': hasVisitedDoctor,
      'medicalCenter': medicalCenter,
      'attendingPhysician': attendingPhysician,
      'medicalPrescription': medicalPrescription,
      'questionnaire': questionnaire,
      'status': status,
      'auditorId': auditorId,
      'auditorResponse': auditorResponse,
      'approvedDays': approvedDays,
      'needsAudit': needsAudit,
      'isJustified': isJustified,
      'auditDate': auditDate?.toIso8601String(),
      'attachments': attachments,
      'createdBy': createdBy,
      'lastModifiedBy': lastModifiedBy,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  // Helper methods
  String get statusText {
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

  bool get isPending => status == 'pending';
  bool get isUnderReview => status == 'under_review';
  bool get isApproved => status == 'approved';
  bool get isRejected => status == 'rejected';
  bool get requiresAudit => status == 'needs_audit';

  int get daysRemaining {
    final now = DateTime.now();
    if (isApproved && endDate.isAfter(now)) {
      return endDate.difference(now).inDays + 1;
    }
    return 0;
  }
}