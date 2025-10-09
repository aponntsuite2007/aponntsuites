class MedicalDocument {
  final String id;
  final String fileName;
  final String documentType;
  final String fileUrl;
  final String status;
  final DateTime uploadDate;
  final int? fileSize;
  final String? description;
  final String? rejectionReason;
  final DateTime? approvalDate;
  final String? approvedBy;

  MedicalDocument({
    required this.id,
    required this.fileName,
    required this.documentType,
    required this.fileUrl,
    required this.status,
    required this.uploadDate,
    this.fileSize,
    this.description,
    this.rejectionReason,
    this.approvalDate,
    this.approvedBy,
  });

  factory MedicalDocument.fromJson(Map<String, dynamic> json) {
    return MedicalDocument(
      id: json['id'],
      fileName: json['fileName'] ?? json['originalFileName'],
      documentType: json['documentType'],
      fileUrl: json['fileUrl'] ?? json['mainFileUrl'],
      status: json['status'],
      uploadDate: DateTime.parse(json['uploadDate'] ?? json['createdAt']),
      fileSize: json['fileSize'],
      description: json['description'],
      rejectionReason: json['rejectionReason'],
      approvalDate: json['approvalDate'] != null 
          ? DateTime.parse(json['approvalDate']) 
          : null,
      approvedBy: json['approvedBy'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'fileName': fileName,
      'documentType': documentType,
      'fileUrl': fileUrl,
      'status': status,
      'uploadDate': uploadDate.toIso8601String(),
      'fileSize': fileSize,
      'description': description,
      'rejectionReason': rejectionReason,
      'approvalDate': approvalDate?.toIso8601String(),
      'approvedBy': approvedBy,
    };
  }

  bool get isApproved => status == 'approved';
  bool get isRejected => status == 'rejected';
  bool get isPending => status == 'pending';
}