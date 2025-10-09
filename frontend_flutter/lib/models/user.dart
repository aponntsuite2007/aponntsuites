class User {
  final String id;
  final String legajo;
  final String firstName;
  final String lastName;
  final String dni;
  final String email;
  final String? phone;
  final String? company;
  final String role;
  final bool isActive;
  final String? profilePhoto;
  final String? address;
  final String? emergencyContact;
  final String? emergencyPhone;
  final DateTime? hireDate;
  final double? salary;
  final String? position;
  final String? department;
  final DateTime? lastLogin;
  final DateTime createdAt;
  final DateTime updatedAt;

  User({
    required this.id,
    required this.legajo,
    required this.firstName,
    required this.lastName,
    required this.dni,
    required this.email,
    this.phone,
    this.company,
    required this.role,
    required this.isActive,
    this.profilePhoto,
    this.address,
    this.emergencyContact,
    this.emergencyPhone,
    this.hireDate,
    this.salary,
    this.position,
    this.department,
    this.lastLogin,
    required this.createdAt,
    required this.updatedAt,
  });

  String get fullName => '$firstName $lastName';
  
  String get displayRole {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'supervisor':
        return 'Supervisor';
      case 'employee':
        return 'Empleado';
      default:
        return role;
    }
  }

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id']?.toString() ?? '',
      legajo: json['legajo']?.toString() ?? '',
      firstName: json['firstName']?.toString() ?? '',
      lastName: json['lastName']?.toString() ?? '',
      dni: json['dni']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      phone: json['phone']?.toString(),
      company: json['company']?.toString(),
      role: json['role']?.toString() ?? 'employee',
      isActive: json['isActive'] == true || json['isActive'] == 1,
      profilePhoto: json['profilePhoto']?.toString(),
      address: json['address']?.toString(),
      emergencyContact: json['emergencyContact']?.toString(),
      emergencyPhone: json['emergencyPhone']?.toString(),
      hireDate: json['hireDate'] != null ? _parseDateTime(json['hireDate']) : null,
      salary: _parseDouble(json['salary']),
      position: json['position']?.toString(),
      department: json['department']?.toString(),
      lastLogin: json['lastLogin'] != null ? _parseDateTime(json['lastLogin']) : null,
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

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'legajo': legajo,
      'firstName': firstName,
      'lastName': lastName,
      'dni': dni,
      'email': email,
      'phone': phone,
      'company': company,
      'role': role,
      'isActive': isActive,
      'profilePhoto': profilePhoto,
      'address': address,
      'emergencyContact': emergencyContact,
      'emergencyPhone': emergencyPhone,
      'hireDate': hireDate?.toIso8601String(),
      'salary': salary,
      'position': position,
      'department': department,
      'lastLogin': lastLogin?.toIso8601String(),
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  User copyWith({
    String? id,
    String? legajo,
    String? firstName,
    String? lastName,
    String? dni,
    String? email,
    String? phone,
    String? company,
    String? role,
    bool? isActive,
    String? profilePhoto,
    String? address,
    String? emergencyContact,
    String? emergencyPhone,
    DateTime? hireDate,
    double? salary,
    String? position,
    String? department,
    DateTime? lastLogin,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return User(
      id: id ?? this.id,
      legajo: legajo ?? this.legajo,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      dni: dni ?? this.dni,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      company: company ?? this.company,
      role: role ?? this.role,
      isActive: isActive ?? this.isActive,
      profilePhoto: profilePhoto ?? this.profilePhoto,
      address: address ?? this.address,
      emergencyContact: emergencyContact ?? this.emergencyContact,
      emergencyPhone: emergencyPhone ?? this.emergencyPhone,
      hireDate: hireDate ?? this.hireDate,
      salary: salary ?? this.salary,
      position: position ?? this.position,
      department: department ?? this.department,
      lastLogin: lastLogin ?? this.lastLogin,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is User && other.id == id;
  }

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() {
    return 'User{id: $id, legajo: $legajo, fullName: $fullName, role: $role}';
  }
}