class MedicalPhoto {
  final String id;
  final String certificateId;
  final String userId;
  final String requestedById;
  
  // Información de la foto
  final String? photoUrl;
  final String? thumbnailUrl;
  final String? originalFileName;
  final int? fileSize;
  
  // Detalles médicos
  final String bodyPart;
  final String? bodyPartDetail;
  final String photoType;
  final String? description;
  
  // Solicitud del médico
  final String requestReason;
  final String? requestInstructions;
  final DateTime requestDate;
  
  // Respuesta del empleado
  final String? employeeNotes;
  final DateTime? photoDate;
  
  // Estado
  final String status;
  final bool isRequired;
  
  // Revisión médica de la foto
  final String? medicalReview;
  final DateTime? reviewedAt;
  final String? reviewedById;
  
  // Metadata
  final Map<String, dynamic>? metadata;
  final DateTime createdAt;
  final DateTime updatedAt;

  MedicalPhoto({
    required this.id,
    required this.certificateId,
    required this.userId,
    required this.requestedById,
    this.photoUrl,
    this.thumbnailUrl,
    this.originalFileName,
    this.fileSize,
    required this.bodyPart,
    this.bodyPartDetail,
    required this.photoType,
    this.description,
    required this.requestReason,
    this.requestInstructions,
    required this.requestDate,
    this.employeeNotes,
    this.photoDate,
    required this.status,
    required this.isRequired,
    this.medicalReview,
    this.reviewedAt,
    this.reviewedById,
    this.metadata,
    required this.createdAt,
    required this.updatedAt,
  });

  factory MedicalPhoto.fromJson(Map<String, dynamic> json) {
    return MedicalPhoto(
      id: json['id'],
      certificateId: json['certificateId'],
      userId: json['userId'],
      requestedById: json['requestedById'],
      photoUrl: json['photoUrl'],
      thumbnailUrl: json['thumbnailUrl'],
      originalFileName: json['originalFileName'],
      fileSize: json['fileSize'],
      bodyPart: json['bodyPart'],
      bodyPartDetail: json['bodyPartDetail'],
      photoType: json['photoType'],
      description: json['description'],
      requestReason: json['requestReason'],
      requestInstructions: json['requestInstructions'],
      requestDate: DateTime.parse(json['requestDate']),
      employeeNotes: json['employeeNotes'],
      photoDate: json['photoDate'] != null 
          ? DateTime.parse(json['photoDate'])
          : null,
      status: json['status'],
      isRequired: json['isRequired'] ?? true,
      medicalReview: json['medicalReview'],
      reviewedAt: json['reviewedAt'] != null 
          ? DateTime.parse(json['reviewedAt'])
          : null,
      reviewedById: json['reviewedById'],
      metadata: json['metadata'] != null 
          ? Map<String, dynamic>.from(json['metadata'])
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
      'requestedById': requestedById,
      'photoUrl': photoUrl,
      'thumbnailUrl': thumbnailUrl,
      'originalFileName': originalFileName,
      'fileSize': fileSize,
      'bodyPart': bodyPart,
      'bodyPartDetail': bodyPartDetail,
      'photoType': photoType,
      'description': description,
      'requestReason': requestReason,
      'requestInstructions': requestInstructions,
      'requestDate': requestDate.toIso8601String(),
      'employeeNotes': employeeNotes,
      'photoDate': photoDate?.toIso8601String(),
      'status': status,
      'isRequired': isRequired,
      'medicalReview': medicalReview,
      'reviewedAt': reviewedAt?.toIso8601String(),
      'reviewedById': reviewedById,
      'metadata': metadata,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  // Helper methods
  String get statusText {
    switch (status) {
      case 'requested':
        return 'Solicitada';
      case 'uploaded':
        return 'Subida';
      case 'reviewed':
        return 'Revisada';
      case 'rejected':
        return 'Rechazada';
      default:
        return 'Estado desconocido';
    }
  }

  String get photoTypeText {
    switch (photoType) {
      case 'injury':
        return 'Lesión';
      case 'lesion':
        return 'Lesión cutánea';
      case 'swelling':
        return 'Inflamación';
      case 'rash':
        return 'Erupción/Sarpullido';
      case 'wound':
        return 'Herida';
      case 'other':
        return 'Otro';
      default:
        return 'Tipo desconocido';
    }
  }

  bool get isRequested => status == 'requested';
  bool get isUploaded => status == 'uploaded';
  bool get isReviewed => status == 'reviewed';
  bool get isRejected => status == 'rejected';
  bool get isPending => isRequested || isUploaded;
  bool get hasPhoto => photoUrl != null;
}