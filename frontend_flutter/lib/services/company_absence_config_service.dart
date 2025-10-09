import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

class CompanyAbsenceConfigService {
  static final CompanyAbsenceConfigService _instance = CompanyAbsenceConfigService._internal();
  factory CompanyAbsenceConfigService() => _instance;
  CompanyAbsenceConfigService._internal();

  SharedPreferences? _prefs;

  Future<void> initialize() async {
    _prefs = await SharedPreferences.getInstance();
  }

  // Default company absence configuration
  CompanyAbsenceConfig getDefaultConfig() {
    return CompanyAbsenceConfig(
      companyId: 'default',
      companyName: 'Mi Empresa',
      
      // Notification preferences
      enableWhatsAppNotifications: true,
      enableSMSNotifications: true,
      enableEmailNotifications: true,
      enableInAppNotifications: true,
      
      // Automatic notification targets
      autoNotifyHR: true,
      autoNotifyDirectManager: true,
      autoNotifyMedicalTeam: false,
      
      // Contact information
      hrWhatsApp: '+54 9 11 1234-5678',
      hrEmail: 'rrhh@empresa.com',
      hrSMS: '+54 11 1234-5678',
      medicalTeamEmail: 'medico@empresa.com',
      medicalTeamWhatsApp: '+54 9 11 8765-4321',
      
      // Time limits and rules
      advanceNoticeHours: 24,
      maxAbsenceDaysWithoutCertificate: 3,
      requireCertificateForMedical: true,
      requireManagerApproval: true,
      
      // Custom absence types per company
      customAbsenceTypes: [
        AbsenceType(
          key: 'medical',
          label: '🏥 Médica',
          description: 'Enfermedad, estudios médicos, consultas',
          requiresCertificate: true,
          requiresManagerApproval: false,
          autoNotifyMedical: true,
          maxDaysWithoutApproval: 3,
        ),
        AbsenceType(
          key: 'personal',
          label: '👤 Personal',
          description: 'Asuntos personales, familiares',
          requiresCertificate: false,
          requiresManagerApproval: true,
          autoNotifyMedical: false,
          maxDaysWithoutApproval: 1,
        ),
        AbsenceType(
          key: 'emergency',
          label: '🚨 Emergencia',
          description: 'Situaciones imprevistas urgentes',
          requiresCertificate: false,
          requiresManagerApproval: false,
          autoNotifyMedical: false,
          maxDaysWithoutApproval: 1,
        ),
      ],
      
      // Working hours and calendar
      workingHours: WorkingHours(
        start: '08:00',
        end: '17:00',
        lunchBreakStart: '12:00',
        lunchBreakEnd: '13:00',
      ),
      
      // Notification templates
      templates: NotificationTemplates(
        whatsappTemplate: '📋 *Notificación de Inasistencia*\n\nEmpleado: {{employee_name}}\nTipo: {{absence_type}}\nFecha: {{date_range}}\nMotivo: {{reason}}\n\nEnviado desde Sistema de Asistencia Biométrico',
        emailSubjectTemplate: 'Notificación de Inasistencia - {{employee_name}}',
        emailBodyTemplate: '''
Estimado/a,

Se ha registrado una nueva notificación de inasistencia:

*Datos del Empleado:*
- Nombre: {{employee_name}}
- Legajo: {{employee_id}}
- Departamento: {{department}}

*Detalles de la Inasistencia:*
- Tipo: {{absence_type}}
- Fecha de inicio: {{start_date}}
- Fecha de fin: {{end_date}}
- Motivo: {{reason}}
- Observaciones: {{notes}}

*Documentación:*
{{attachment_info}}

Saludos cordiales,
Sistema de Asistencia Biométrico
        ''',
        smsTemplate: 'INASISTENCIA: {{employee_name}} - {{absence_type}} del {{start_date}} al {{end_date}}. Motivo: {{reason}}',
      ),
    );
  }

  // Load company configuration
  Future<CompanyAbsenceConfig> loadConfig(String companyId) async {
    try {
      final configString = _prefs?.getString('absence_config_$companyId');
      if (configString != null) {
        final configJson = json.decode(configString);
        return CompanyAbsenceConfig.fromJson(configJson);
      }
    } catch (e) {
      print('Error loading absence config: $e');
    }
    
    // Return default config if loading fails
    return getDefaultConfig();
  }

  // Save company configuration
  Future<void> saveConfig(CompanyAbsenceConfig config) async {
    try {
      final configJson = config.toJson();
      await _prefs?.setString('absence_config_${config.companyId}', json.encode(configJson));
    } catch (e) {
      print('Error saving absence config: $e');
    }
  }

  // Get notification preferences for a specific absence type
  AbsenceType? getAbsenceTypeConfig(CompanyAbsenceConfig config, String absenceTypeKey) {
    return config.customAbsenceTypes.firstWhere(
      (type) => type.key == absenceTypeKey,
      orElse: () => AbsenceType(
        key: absenceTypeKey,
        label: absenceTypeKey.toUpperCase(),
        description: 'Tipo de inasistencia personalizado',
        requiresCertificate: false,
        requiresManagerApproval: true,
        autoNotifyMedical: false,
        maxDaysWithoutApproval: 1,
      ),
    );
  }

  // Validate if an absence request meets company requirements
  ValidationResult validateAbsenceRequest({
    required CompanyAbsenceConfig config,
    required String absenceType,
    required DateTime startDate,
    required DateTime endDate,
    required String reason,
    bool hasCertificate = false,
    bool hasManagerApproval = false,
  }) {
    final absenceConfig = getAbsenceTypeConfig(config, absenceType);
    if (absenceConfig == null) {
      return ValidationResult(
        isValid: false,
        errors: ['Tipo de inasistencia no válido'],
        warnings: [],
      );
    }

    List<String> errors = [];
    List<String> warnings = [];

    // Check advance notice
    final hoursInAdvance = startDate.difference(DateTime.now()).inHours;
    if (hoursInAdvance < config.advanceNoticeHours && absenceType != 'emergency') {
      warnings.add('Aviso con menos de ${config.advanceNoticeHours}h de anticipación');
    }

    // Check certificate requirement
    if (absenceConfig.requiresCertificate && !hasCertificate) {
      final absenceDays = endDate.difference(startDate).inDays + 1;
      if (absenceDays > config.maxAbsenceDaysWithoutCertificate) {
        errors.add('Se requiere certificado para inasistencias mayores a ${config.maxAbsenceDaysWithoutCertificate} días');
      } else {
        warnings.add('Se recomienda adjuntar certificado médico');
      }
    }

    // Check manager approval requirement
    if (absenceConfig.requiresManagerApproval && !hasManagerApproval) {
      final absenceDays = endDate.difference(startDate).inDays + 1;
      if (absenceDays > absenceConfig.maxDaysWithoutApproval) {
        warnings.add('Se requiere aprobación de supervisor para más de ${absenceConfig.maxDaysWithoutApproval} días');
      }
    }

    // Check if dates are valid
    if (startDate.isAfter(endDate)) {
      errors.add('La fecha de inicio no puede ser posterior a la fecha de fin');
    }

    return ValidationResult(
      isValid: errors.isEmpty,
      errors: errors,
      warnings: warnings,
    );
  }
}

// Data models
class CompanyAbsenceConfig {
  final String companyId;
  final String companyName;
  
  // Notification settings
  final bool enableWhatsAppNotifications;
  final bool enableSMSNotifications;
  final bool enableEmailNotifications;
  final bool enableInAppNotifications;
  
  // Auto-notification targets
  final bool autoNotifyHR;
  final bool autoNotifyDirectManager;
  final bool autoNotifyMedicalTeam;
  
  // Contact info
  final String hrWhatsApp;
  final String hrEmail;
  final String hrSMS;
  final String medicalTeamEmail;
  final String medicalTeamWhatsApp;
  
  // Rules
  final int advanceNoticeHours;
  final int maxAbsenceDaysWithoutCertificate;
  final bool requireCertificateForMedical;
  final bool requireManagerApproval;
  
  // Custom types
  final List<AbsenceType> customAbsenceTypes;
  
  // Working hours
  final WorkingHours workingHours;
  
  // Templates
  final NotificationTemplates templates;

  CompanyAbsenceConfig({
    required this.companyId,
    required this.companyName,
    required this.enableWhatsAppNotifications,
    required this.enableSMSNotifications,
    required this.enableEmailNotifications,
    required this.enableInAppNotifications,
    required this.autoNotifyHR,
    required this.autoNotifyDirectManager,
    required this.autoNotifyMedicalTeam,
    required this.hrWhatsApp,
    required this.hrEmail,
    required this.hrSMS,
    required this.medicalTeamEmail,
    required this.medicalTeamWhatsApp,
    required this.advanceNoticeHours,
    required this.maxAbsenceDaysWithoutCertificate,
    required this.requireCertificateForMedical,
    required this.requireManagerApproval,
    required this.customAbsenceTypes,
    required this.workingHours,
    required this.templates,
  });

  Map<String, dynamic> toJson() {
    return {
      'companyId': companyId,
      'companyName': companyName,
      'enableWhatsAppNotifications': enableWhatsAppNotifications,
      'enableSMSNotifications': enableSMSNotifications,
      'enableEmailNotifications': enableEmailNotifications,
      'enableInAppNotifications': enableInAppNotifications,
      'autoNotifyHR': autoNotifyHR,
      'autoNotifyDirectManager': autoNotifyDirectManager,
      'autoNotifyMedicalTeam': autoNotifyMedicalTeam,
      'hrWhatsApp': hrWhatsApp,
      'hrEmail': hrEmail,
      'hrSMS': hrSMS,
      'medicalTeamEmail': medicalTeamEmail,
      'medicalTeamWhatsApp': medicalTeamWhatsApp,
      'advanceNoticeHours': advanceNoticeHours,
      'maxAbsenceDaysWithoutCertificate': maxAbsenceDaysWithoutCertificate,
      'requireCertificateForMedical': requireCertificateForMedical,
      'requireManagerApproval': requireManagerApproval,
      'customAbsenceTypes': customAbsenceTypes.map((t) => t.toJson()).toList(),
      'workingHours': workingHours.toJson(),
      'templates': templates.toJson(),
    };
  }

  factory CompanyAbsenceConfig.fromJson(Map<String, dynamic> json) {
    return CompanyAbsenceConfig(
      companyId: json['companyId'] ?? '',
      companyName: json['companyName'] ?? '',
      enableWhatsAppNotifications: json['enableWhatsAppNotifications'] ?? true,
      enableSMSNotifications: json['enableSMSNotifications'] ?? true,
      enableEmailNotifications: json['enableEmailNotifications'] ?? true,
      enableInAppNotifications: json['enableInAppNotifications'] ?? true,
      autoNotifyHR: json['autoNotifyHR'] ?? true,
      autoNotifyDirectManager: json['autoNotifyDirectManager'] ?? true,
      autoNotifyMedicalTeam: json['autoNotifyMedicalTeam'] ?? false,
      hrWhatsApp: json['hrWhatsApp'] ?? '',
      hrEmail: json['hrEmail'] ?? '',
      hrSMS: json['hrSMS'] ?? '',
      medicalTeamEmail: json['medicalTeamEmail'] ?? '',
      medicalTeamWhatsApp: json['medicalTeamWhatsApp'] ?? '',
      advanceNoticeHours: json['advanceNoticeHours'] ?? 24,
      maxAbsenceDaysWithoutCertificate: json['maxAbsenceDaysWithoutCertificate'] ?? 3,
      requireCertificateForMedical: json['requireCertificateForMedical'] ?? true,
      requireManagerApproval: json['requireManagerApproval'] ?? true,
      customAbsenceTypes: (json['customAbsenceTypes'] as List?)
          ?.map((t) => AbsenceType.fromJson(t))
          .toList() ?? [],
      workingHours: WorkingHours.fromJson(json['workingHours'] ?? {}),
      templates: NotificationTemplates.fromJson(json['templates'] ?? {}),
    );
  }
}

class AbsenceType {
  final String key;
  final String label;
  final String description;
  final bool requiresCertificate;
  final bool requiresManagerApproval;
  final bool autoNotifyMedical;
  final int maxDaysWithoutApproval;

  AbsenceType({
    required this.key,
    required this.label,
    required this.description,
    required this.requiresCertificate,
    required this.requiresManagerApproval,
    required this.autoNotifyMedical,
    required this.maxDaysWithoutApproval,
  });

  Map<String, dynamic> toJson() {
    return {
      'key': key,
      'label': label,
      'description': description,
      'requiresCertificate': requiresCertificate,
      'requiresManagerApproval': requiresManagerApproval,
      'autoNotifyMedical': autoNotifyMedical,
      'maxDaysWithoutApproval': maxDaysWithoutApproval,
    };
  }

  factory AbsenceType.fromJson(Map<String, dynamic> json) {
    return AbsenceType(
      key: json['key'] ?? '',
      label: json['label'] ?? '',
      description: json['description'] ?? '',
      requiresCertificate: json['requiresCertificate'] ?? false,
      requiresManagerApproval: json['requiresManagerApproval'] ?? true,
      autoNotifyMedical: json['autoNotifyMedical'] ?? false,
      maxDaysWithoutApproval: json['maxDaysWithoutApproval'] ?? 1,
    );
  }
}

class WorkingHours {
  final String start;
  final String end;
  final String lunchBreakStart;
  final String lunchBreakEnd;

  WorkingHours({
    required this.start,
    required this.end,
    required this.lunchBreakStart,
    required this.lunchBreakEnd,
  });

  Map<String, dynamic> toJson() {
    return {
      'start': start,
      'end': end,
      'lunchBreakStart': lunchBreakStart,
      'lunchBreakEnd': lunchBreakEnd,
    };
  }

  factory WorkingHours.fromJson(Map<String, dynamic> json) {
    return WorkingHours(
      start: json['start'] ?? '08:00',
      end: json['end'] ?? '17:00',
      lunchBreakStart: json['lunchBreakStart'] ?? '12:00',
      lunchBreakEnd: json['lunchBreakEnd'] ?? '13:00',
    );
  }
}

class NotificationTemplates {
  final String whatsappTemplate;
  final String emailSubjectTemplate;
  final String emailBodyTemplate;
  final String smsTemplate;

  NotificationTemplates({
    required this.whatsappTemplate,
    required this.emailSubjectTemplate,
    required this.emailBodyTemplate,
    required this.smsTemplate,
  });

  Map<String, dynamic> toJson() {
    return {
      'whatsappTemplate': whatsappTemplate,
      'emailSubjectTemplate': emailSubjectTemplate,
      'emailBodyTemplate': emailBodyTemplate,
      'smsTemplate': smsTemplate,
    };
  }

  factory NotificationTemplates.fromJson(Map<String, dynamic> json) {
    return NotificationTemplates(
      whatsappTemplate: json['whatsappTemplate'] ?? '',
      emailSubjectTemplate: json['emailSubjectTemplate'] ?? '',
      emailBodyTemplate: json['emailBodyTemplate'] ?? '',
      smsTemplate: json['smsTemplate'] ?? '',
    );
  }
}

class ValidationResult {
  final bool isValid;
  final List<String> errors;
  final List<String> warnings;

  ValidationResult({
    required this.isValid,
    required this.errors,
    required this.warnings,
  });
}