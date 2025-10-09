class DocumentRequest {
  final String id;
  final String documentType;
  final DateTime requestDate;
  final DateTime dueDate;
  final String? description;
  final String? notes;
  final String status;
  final String requestedBy;
  final String? urgency;

  DocumentRequest({
    required this.id,
    required this.documentType,
    required this.requestDate,
    required this.dueDate,
    this.description,
    this.notes,
    required this.status,
    required this.requestedBy,
    this.urgency,
  });

  factory DocumentRequest.fromJson(Map<String, dynamic> json) {
    return DocumentRequest(
      id: json['id'],
      documentType: json['documentType'] ?? json['type'],
      requestDate: DateTime.parse(json['requestDate'] ?? json['createdAt']),
      dueDate: json['dueDate'] != null 
          ? DateTime.parse(json['dueDate'])
          : DateTime.parse(json['requestDate'] ?? json['createdAt']).add(Duration(days: 7)),
      description: json['description'] ?? json['requestReason'],
      notes: json['notes'] ?? json['requestInstructions'],
      status: json['status'] ?? 'requested',
      requestedBy: json['requestedBy'] ?? json['requestedById'] ?? 'Sistema Médico',
      urgency: json['urgency'] ?? 'normal',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'documentType': documentType,
      'requestDate': requestDate.toIso8601String(),
      'dueDate': dueDate.toIso8601String(),
      'description': description,
      'notes': notes,
      'status': status,
      'requestedBy': requestedBy,
      'urgency': urgency,
    };
  }

  bool get isPending => status == 'requested' || status == 'pending';
  bool get isCompleted => status == 'completed' || status == 'fulfilled';
  bool get isOverdue => DateTime.now().isAfter(dueDate) && isPending;
  
  int get daysUntilDue => dueDate.difference(DateTime.now()).inDays;
  bool get isDueSoon => daysUntilDue <= 2 && daysUntilDue >= 0;
}