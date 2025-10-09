class Attendance {
  final String id;
  final DateTime date;
  final DateTime? checkInTime;
  final DateTime? checkOutTime;
  final String? scheduledCheckIn;
  final String? scheduledCheckOut;
  final String? checkInMethod;
  final String? checkOutMethod;
  final Map<String, dynamic>? checkInLocation;
  final Map<String, dynamic>? checkOutLocation;
  final double workingHours;
  final double overtimeHours;
  final int lateMinutes;
  final int earlyLeaveMinutes;
  final String status;
  final String? notes;
  final bool isManualEntry;
  final String? manualEntryReason;
  final String? approvedBy;
  final DateTime? approvedAt;
  final String userId;
  final String? branchId;
  final DateTime createdAt;
  final DateTime updatedAt;

  Attendance({
    required this.id,
    required this.date,
    this.checkInTime,
    this.checkOutTime,
    this.scheduledCheckIn,
    this.scheduledCheckOut,
    this.checkInMethod,
    this.checkOutMethod,
    this.checkInLocation,
    this.checkOutLocation,
    this.workingHours = 0.0,
    this.overtimeHours = 0.0,
    this.lateMinutes = 0,
    this.earlyLeaveMinutes = 0,
    this.status = 'present',
    this.notes,
    this.isManualEntry = false,
    this.manualEntryReason,
    this.approvedBy,
    this.approvedAt,
    required this.userId,
    this.branchId,
    required this.createdAt,
    required this.updatedAt,
  });

  bool get hasCheckedIn => checkInTime != null;
  bool get hasCheckedOut => checkOutTime != null;
  bool get isComplete => hasCheckedIn && hasCheckedOut;
  
  String get displayStatus {
    switch (status) {
      case 'present':
        return 'Presente';
      case 'late':
        return 'Tarde';
      case 'absent':
        return 'Ausente';
      case 'early_leave':
        return 'Salida Temprana';
      case 'overtime':
        return 'Hora Extra';
      default:
        return status;
    }
  }
  
  String get displayMethod {
    switch (checkInMethod ?? checkOutMethod) {
      case 'fingerprint':
        return 'Huella Digital';
      case 'face':
        return 'Reconocimiento Facial';
      case 'pin':
        return 'PIN';
      case 'manual':
        return 'Manual';
      default:
        return 'Desconocido';
    }
  }

  /// Obtener ubicación de check-in como string
  String? get location {
    if (checkInLocation != null && checkInLocation!.containsKey('address')) {
      return checkInLocation!['address'] as String?;
    }
    return 'Ubicación no disponible';
  }

  factory Attendance.fromJson(Map<String, dynamic> json) {
    return Attendance(
      id: json['id']?.toString() ?? '',
      date: _parseDateTime(json['date']) ?? DateTime.now(),
      checkInTime: json['checkInTime'] != null ? _parseDateTime(json['checkInTime']) : null,
      checkOutTime: json['checkOutTime'] != null ? _parseDateTime(json['checkOutTime']) : null,
      scheduledCheckIn: json['scheduledCheckIn']?.toString(),
      scheduledCheckOut: json['scheduledCheckOut']?.toString(),
      checkInMethod: json['checkInMethod']?.toString(),
      checkOutMethod: json['checkOutMethod']?.toString(),
      checkInLocation: json['checkInLocation'],
      checkOutLocation: json['checkOutLocation'],
      workingHours: _parseDouble(json['workingHours']) ?? 0.0,
      overtimeHours: _parseDouble(json['overtimeHours']) ?? 0.0,
      lateMinutes: _parseInt(json['lateMinutes']) ?? 0,
      earlyLeaveMinutes: _parseInt(json['earlyLeaveMinutes']) ?? 0,
      status: json['status']?.toString() ?? 'present',
      notes: json['notes']?.toString(),
      isManualEntry: json['isManualEntry'] == true || json['isManualEntry'] == 1,
      manualEntryReason: json['manualEntryReason']?.toString(),
      approvedBy: json['approvedBy']?.toString(),
      approvedAt: json['approvedAt'] != null ? _parseDateTime(json['approvedAt']) : null,
      userId: json['UserId']?.toString() ?? json['userId']?.toString() ?? '',
      branchId: json['BranchId']?.toString() ?? json['branchId']?.toString(),
      createdAt: _parseDateTime(json['createdAt']) ?? DateTime.now(),
      updatedAt: _parseDateTime(json['updatedAt']) ?? DateTime.now(),
    );
  }

  static DateTime? _parseDateTime(dynamic value) {
    if (value == null) return null;
    try {
      if (value is String) {
        return DateTime.parse(value);
      } else if (value is int) {
        return DateTime.fromMillisecondsSinceEpoch(value);
      }
      return null;
    } catch (e) {
      print('Error parsing datetime: $value, error: $e');
      return null;
    }
  }

  static double? _parseDouble(dynamic value) {
    if (value == null) return null;
    try {
      if (value is double) return value;
      if (value is int) return value.toDouble();
      if (value is String) return double.tryParse(value);
      return null;
    } catch (e) {
      print('Error parsing double: $value, error: $e');
      return null;
    }
  }

  static int? _parseInt(dynamic value) {
    if (value == null) return null;
    try {
      if (value is int) return value;
      if (value is double) return value.toInt();
      if (value is String) return int.tryParse(value);
      return null;
    } catch (e) {
      print('Error parsing int: $value, error: $e');
      return null;
    }
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'date': date.toIso8601String().substring(0, 10), // Solo fecha YYYY-MM-DD
      'checkInTime': checkInTime?.toIso8601String(),
      'checkOutTime': checkOutTime?.toIso8601String(),
      'scheduledCheckIn': scheduledCheckIn,
      'scheduledCheckOut': scheduledCheckOut,
      'checkInMethod': checkInMethod,
      'checkOutMethod': checkOutMethod,
      'checkInLocation': checkInLocation,
      'checkOutLocation': checkOutLocation,
      'workingHours': workingHours,
      'overtimeHours': overtimeHours,
      'lateMinutes': lateMinutes,
      'earlyLeaveMinutes': earlyLeaveMinutes,
      'status': status,
      'notes': notes,
      'isManualEntry': isManualEntry,
      'manualEntryReason': manualEntryReason,
      'approvedBy': approvedBy,
      'approvedAt': approvedAt?.toIso8601String(),
      'UserId': userId,
      'BranchId': branchId,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  Attendance copyWith({
    String? id,
    DateTime? date,
    DateTime? checkInTime,
    DateTime? checkOutTime,
    String? scheduledCheckIn,
    String? scheduledCheckOut,
    String? checkInMethod,
    String? checkOutMethod,
    Map<String, dynamic>? checkInLocation,
    Map<String, dynamic>? checkOutLocation,
    double? workingHours,
    double? overtimeHours,
    int? lateMinutes,
    int? earlyLeaveMinutes,
    String? status,
    String? notes,
    bool? isManualEntry,
    String? manualEntryReason,
    String? approvedBy,
    DateTime? approvedAt,
    String? userId,
    String? branchId,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Attendance(
      id: id ?? this.id,
      date: date ?? this.date,
      checkInTime: checkInTime ?? this.checkInTime,
      checkOutTime: checkOutTime ?? this.checkOutTime,
      scheduledCheckIn: scheduledCheckIn ?? this.scheduledCheckIn,
      scheduledCheckOut: scheduledCheckOut ?? this.scheduledCheckOut,
      checkInMethod: checkInMethod ?? this.checkInMethod,
      checkOutMethod: checkOutMethod ?? this.checkOutMethod,
      checkInLocation: checkInLocation ?? this.checkInLocation,
      checkOutLocation: checkOutLocation ?? this.checkOutLocation,
      workingHours: workingHours ?? this.workingHours,
      overtimeHours: overtimeHours ?? this.overtimeHours,
      lateMinutes: lateMinutes ?? this.lateMinutes,
      earlyLeaveMinutes: earlyLeaveMinutes ?? this.earlyLeaveMinutes,
      status: status ?? this.status,
      notes: notes ?? this.notes,
      isManualEntry: isManualEntry ?? this.isManualEntry,
      manualEntryReason: manualEntryReason ?? this.manualEntryReason,
      approvedBy: approvedBy ?? this.approvedBy,
      approvedAt: approvedAt ?? this.approvedAt,
      userId: userId ?? this.userId,
      branchId: branchId ?? this.branchId,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is Attendance && other.id == id;
  }

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() {
    return 'Attendance{id: $id, date: $date, status: $status, hasCheckedIn: $hasCheckedIn, hasCheckedOut: $hasCheckedOut}';
  }
}