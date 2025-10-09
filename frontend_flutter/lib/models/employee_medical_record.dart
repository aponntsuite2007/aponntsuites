class EmployeeMedicalRecord {
  final String id;
  final String userId;
  
  // Información personal médica
  final String? bloodType;
  final double? height;
  final double? weight;
  
  // Información de contacto de emergencia
  final Map<String, dynamic>? emergencyContact;
  
  // Alergias
  final List<dynamic>? allergies;
  final List<dynamic>? medicationAllergies;
  
  // Enfermedades crónicas y preexistentes
  final List<dynamic>? chronicDiseases;
  final List<dynamic>? preexistingConditions;
  
  // Medicación habitual
  final List<dynamic>? currentMedications;
  
  // Historial quirúrgico
  final List<dynamic>? surgicalHistory;
  
  // Historial familiar
  final Map<String, dynamic>? familyMedicalHistory;
  
  // Hábitos y estilo de vida
  final String? smokingStatus;
  final String? alcoholConsumption;
  final String? exerciseFrequency;
  
  // Vacunas
  final List<dynamic>? vaccinations;
  
  // Información ocupacional
  final List<dynamic>? occupationalHazards;
  final List<dynamic>? workInjuryHistory;
  
  // Exámenes médicos laborales
  final DateTime? lastMedicalExam;
  final DateTime? nextMedicalExam;
  final Map<String, dynamic>? medicalExamResults;
  
  // Estado de salud actual
  final String? healthStatus;
  final String fitnessForWork;
  final List<dynamic>? workRestrictions;
  
  // Seguimiento médico
  final bool requiresFollowUp;
  final String? followUpFrequency;
  final String? followUpNotes;
  
  // Control de privacidad
  final bool privacyConsent;
  final DateTime? dataRetentionUntil;
  
  // Metadata
  final String? lastUpdatedBy;
  final String? medicalOfficerId;
  final DateTime createdAt;
  final DateTime updatedAt;

  EmployeeMedicalRecord({
    required this.id,
    required this.userId,
    this.bloodType,
    this.height,
    this.weight,
    this.emergencyContact,
    this.allergies,
    this.medicationAllergies,
    this.chronicDiseases,
    this.preexistingConditions,
    this.currentMedications,
    this.surgicalHistory,
    this.familyMedicalHistory,
    this.smokingStatus,
    this.alcoholConsumption,
    this.exerciseFrequency,
    this.vaccinations,
    this.occupationalHazards,
    this.workInjuryHistory,
    this.lastMedicalExam,
    this.nextMedicalExam,
    this.medicalExamResults,
    this.healthStatus,
    required this.fitnessForWork,
    this.workRestrictions,
    required this.requiresFollowUp,
    this.followUpFrequency,
    this.followUpNotes,
    required this.privacyConsent,
    this.dataRetentionUntil,
    this.lastUpdatedBy,
    this.medicalOfficerId,
    required this.createdAt,
    required this.updatedAt,
  });

  factory EmployeeMedicalRecord.fromJson(Map<String, dynamic> json) {
    return EmployeeMedicalRecord(
      id: json['id'],
      userId: json['userId'],
      bloodType: json['bloodType'],
      height: json['height'] != null ? double.parse(json['height'].toString()) : null,
      weight: json['weight'] != null ? double.parse(json['weight'].toString()) : null,
      emergencyContact: json['emergencyContact'] != null 
          ? Map<String, dynamic>.from(json['emergencyContact'])
          : null,
      allergies: json['allergies'],
      medicationAllergies: json['medicationAllergies'],
      chronicDiseases: json['chronicDiseases'],
      preexistingConditions: json['preexistingConditions'],
      currentMedications: json['currentMedications'],
      surgicalHistory: json['surgicalHistory'],
      familyMedicalHistory: json['familyMedicalHistory'] != null 
          ? Map<String, dynamic>.from(json['familyMedicalHistory'])
          : null,
      smokingStatus: json['smokingStatus'],
      alcoholConsumption: json['alcoholConsumption'],
      exerciseFrequency: json['exerciseFrequency'],
      vaccinations: json['vaccinations'],
      occupationalHazards: json['occupationalHazards'],
      workInjuryHistory: json['workInjuryHistory'],
      lastMedicalExam: json['lastMedicalExam'] != null 
          ? DateTime.parse(json['lastMedicalExam'])
          : null,
      nextMedicalExam: json['nextMedicalExam'] != null 
          ? DateTime.parse(json['nextMedicalExam'])
          : null,
      medicalExamResults: json['medicalExamResults'] != null 
          ? Map<String, dynamic>.from(json['medicalExamResults'])
          : null,
      healthStatus: json['healthStatus'],
      fitnessForWork: json['fitnessForWork'] ?? 'fit',
      workRestrictions: json['workRestrictions'],
      requiresFollowUp: json['requiresFollowUp'] ?? false,
      followUpFrequency: json['followUpFrequency'],
      followUpNotes: json['followUpNotes'],
      privacyConsent: json['privacyConsent'] ?? false,
      dataRetentionUntil: json['dataRetentionUntil'] != null 
          ? DateTime.parse(json['dataRetentionUntil'])
          : null,
      lastUpdatedBy: json['lastUpdatedBy'],
      medicalOfficerId: json['medicalOfficerId'],
      createdAt: DateTime.parse(json['createdAt']),
      updatedAt: DateTime.parse(json['updatedAt']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'bloodType': bloodType,
      'height': height,
      'weight': weight,
      'emergencyContact': emergencyContact,
      'allergies': allergies,
      'medicationAllergies': medicationAllergies,
      'chronicDiseases': chronicDiseases,
      'preexistingConditions': preexistingConditions,
      'currentMedications': currentMedications,
      'surgicalHistory': surgicalHistory,
      'familyMedicalHistory': familyMedicalHistory,
      'smokingStatus': smokingStatus,
      'alcoholConsumption': alcoholConsumption,
      'exerciseFrequency': exerciseFrequency,
      'vaccinations': vaccinations,
      'occupationalHazards': occupationalHazards,
      'workInjuryHistory': workInjuryHistory,
      'lastMedicalExam': lastMedicalExam?.toIso8601String(),
      'nextMedicalExam': nextMedicalExam?.toIso8601String(),
      'medicalExamResults': medicalExamResults,
      'healthStatus': healthStatus,
      'fitnessForWork': fitnessForWork,
      'workRestrictions': workRestrictions,
      'requiresFollowUp': requiresFollowUp,
      'followUpFrequency': followUpFrequency,
      'followUpNotes': followUpNotes,
      'privacyConsent': privacyConsent,
      'dataRetentionUntil': dataRetentionUntil?.toIso8601String(),
      'lastUpdatedBy': lastUpdatedBy,
      'medicalOfficerId': medicalOfficerId,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  // Helper methods
  double? get bmi {
    if (height != null && weight != null && height! > 0) {
      final heightInMeters = height! / 100;
      return weight! / (heightInMeters * heightInMeters);
    }
    return null;
  }

  String get bmiCategory {
    final bmiValue = bmi;
    if (bmiValue == null) return 'No calculado';
    
    if (bmiValue < 18.5) return 'Bajo peso';
    if (bmiValue < 25) return 'Peso normal';
    if (bmiValue < 30) return 'Sobrepeso';
    return 'Obesidad';
  }

  bool get hasAllergies => 
      (allergies != null && allergies!.isNotEmpty) || 
      (medicationAllergies != null && medicationAllergies!.isNotEmpty);

  bool get hasChronicDiseases => 
      (chronicDiseases != null && chronicDiseases!.isNotEmpty) || 
      (preexistingConditions != null && preexistingConditions!.isNotEmpty);

  bool get hasCurrentMedications => 
      currentMedications != null && currentMedications!.isNotEmpty;

  bool get hasSurgicalHistory => 
      surgicalHistory != null && surgicalHistory!.isNotEmpty;

  bool get hasWorkRestrictions => 
      workRestrictions != null && workRestrictions!.isNotEmpty;

  bool get isApprovedForWork => 
      fitnessForWork == 'fit' || fitnessForWork == 'fit_with_restrictions';

  bool get needsMedicalExam {
    if (nextMedicalExam == null) return true;
    return DateTime.now().isAfter(nextMedicalExam!);
  }
}