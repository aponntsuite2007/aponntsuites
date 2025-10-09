class MedicalPrescription {
  final String id;
  final String certificateId;
  final String userId;
  
  // Información de la receta
  final String? prescriptionNumber;
  final DateTime issueDate;
  final DateTime? expiryDate;
  
  // Médico prescriptor
  final String physicianName;
  final String? physicianLicense;
  final String? medicalCenter;
  
  // Medicamentos
  final List<Medication> medications;
  
  // Indicaciones
  final String? generalInstructions;
  final String? specialInstructions;
  
  // Estado de la receta
  final String status;
  
  // Archivos
  final List<String>? attachments;
  
  // Metadata
  final String createdBy;
  final DateTime createdAt;
  final DateTime updatedAt;

  MedicalPrescription({
    required this.id,
    required this.certificateId,
    required this.userId,
    this.prescriptionNumber,
    required this.issueDate,
    this.expiryDate,
    required this.physicianName,
    this.physicianLicense,
    this.medicalCenter,
    required this.medications,
    this.generalInstructions,
    this.specialInstructions,
    required this.status,
    this.attachments,
    required this.createdBy,
    required this.createdAt,
    required this.updatedAt,
  });

  factory MedicalPrescription.fromJson(Map<String, dynamic> json) {
    return MedicalPrescription(
      id: json['id'],
      certificateId: json['certificateId'],
      userId: json['userId'],
      prescriptionNumber: json['prescriptionNumber'],
      issueDate: DateTime.parse(json['issueDate']),
      expiryDate: json['expiryDate'] != null 
          ? DateTime.parse(json['expiryDate'])
          : null,
      physicianName: json['physicianName'],
      physicianLicense: json['physicianLicense'],
      medicalCenter: json['medicalCenter'],
      medications: (json['medications'] as List)
          .map((med) => Medication.fromJson(med))
          .toList(),
      generalInstructions: json['generalInstructions'],
      specialInstructions: json['specialInstructions'],
      status: json['status'],
      attachments: json['attachments'] != null 
          ? List<String>.from(json['attachments'])
          : null,
      createdBy: json['createdBy'],
      createdAt: DateTime.parse(json['createdAt']),
      updatedAt: DateTime.parse(json['updatedAt']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'certificateId': certificateId,
      'userId': userId,
      'prescriptionNumber': prescriptionNumber,
      'issueDate': issueDate.toIso8601String(),
      'expiryDate': expiryDate?.toIso8601String(),
      'physicianName': physicianName,
      'physicianLicense': physicianLicense,
      'medicalCenter': medicalCenter,
      'medications': medications.map((med) => med.toJson()).toList(),
      'generalInstructions': generalInstructions,
      'specialInstructions': specialInstructions,
      'status': status,
      'attachments': attachments,
      'createdBy': createdBy,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  // Helper methods
  String get statusText {
    switch (status) {
      case 'active':
        return 'Activa';
      case 'used':
        return 'Utilizada';
      case 'expired':
        return 'Vencida';
      case 'cancelled':
        return 'Cancelada';
      default:
        return 'Estado desconocido';
    }
  }

  bool get isActive => status == 'active';
  bool get isExpired => status == 'expired' || 
      (expiryDate != null && expiryDate!.isBefore(DateTime.now()));
  
  bool get isValid => isActive && !isExpired;
}

class Medication {
  final String name;
  final String? brand;
  final String dosage;
  final String frequency;
  final String duration;
  final String? instructions;
  final int quantity;

  Medication({
    required this.name,
    this.brand,
    required this.dosage,
    required this.frequency,
    required this.duration,
    this.instructions,
    required this.quantity,
  });

  factory Medication.fromJson(Map<String, dynamic> json) {
    return Medication(
      name: json['name'],
      brand: json['brand'],
      dosage: json['dosage'],
      frequency: json['frequency'],
      duration: json['duration'],
      instructions: json['instructions'],
      quantity: json['quantity'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'brand': brand,
      'dosage': dosage,
      'frequency': frequency,
      'duration': duration,
      'instructions': instructions,
      'quantity': quantity,
    };
  }

  String get displayText {
    return '$name${brand != null ? ' ($brand)' : ''} - $dosage';
  }
}