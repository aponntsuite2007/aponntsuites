const { Sequelize } = require('sequelize');

// CONFIGURACIÓN POSTGRESQL - Compatible con Render y Local
// Render provee DATABASE_URL, Local usa POSTGRES_*
let sequelize;

// DEBUG: Verificar variables de entorno
console.log('🔍 [DEBUG] DATABASE_URL exists?', !!process.env.DATABASE_URL);
console.log('🔍 [DEBUG] DATABASE_URL value:', process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 30) + '...' : 'NOT SET');
console.log('🔍 [DEBUG] NODE_ENV:', process.env.NODE_ENV);

if (process.env.DATABASE_URL) {
  // RENDER/PRODUCCIÓN: Usar DATABASE_URL
  console.log('🚀 Conectando a Render PostgreSQL via DATABASE_URL');
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false, // DESACTIVAR logging en producción
    timezone: '+00:00',
    quoteIdentifiers: true, // ACTIVAR para preservar camelCase (firstName, lastName)
    underscored: false, // DESACTIVAR - Render tiene nombres mixtos
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      },
      timezone: '+00:00',
      useUTC: false,
      dateStrings: true,
      typeCast: true
    }
  });
} else {
  // LOCAL: Usar variables POSTGRES_* (código original sin cambios)
  console.log('💻 Conectando a PostgreSQL local');
  sequelize = new Sequelize(
    process.env.POSTGRES_DB || 'attendance_system',
    process.env.POSTGRES_USER || 'postgres',
    process.env.POSTGRES_PASSWORD || 'Aedr15150302',
    {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      dialect: 'postgres',
      logging: process.env.DB_LOGGING === 'true' ? console.log : false,
      timezone: '+00:00',
      quoteIdentifiers: true,
      underscored: false,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
      },
      dialectOptions: {
        timezone: '+00:00',
        useUTC: false,
        dateStrings: true,
        typeCast: true
      }
    }
  );
}

console.log('🐘 Configuración PostgreSQL - Sistema Optimizado');

// Importar modelos PostgreSQL
const User = require('../models/User-postgresql')(sequelize);
const Attendance = require('../models/Attendance-postgresql')(sequelize);
const Shift = require('../models/Shift-postgresql')(sequelize);
const Branch = require('../models/Branch-postgresql')(sequelize);
const Department = require('../models/Department-postgresql')(sequelize);
const BiometricData = require('../models/BiometricData')(sequelize);
const Message = require('../models/Message')(sequelize);
const MedicalCertificate = require('../models/MedicalCertificate')(sequelize);
const MedicalPrescription = require('../models/MedicalPrescription')(sequelize);
const MedicalQuestionnaire = require('../models/MedicalQuestionnaire')(sequelize);
const MedicalDiagnosis = require('../models/MedicalDiagnosis')(sequelize);
const MedicalPhoto = require('../models/MedicalPhoto')(sequelize);
const MedicalStudy = require('../models/MedicalStudy')(sequelize);
const EmployeeMedicalRecord = require('../models/EmployeeMedicalRecord')(sequelize);
const MedicalHistory = require('../models/MedicalHistory')(sequelize);
const MedicalStudyRequest = require('../models/MedicalStudyRequest')(sequelize);
const ARTConfiguration = require('../models/ARTConfiguration')(sequelize);
const MedicalStatistics = require('../models/MedicalStatistics')(sequelize);
const Permission = require('../models/Permission')(sequelize);
const SystemConfig = require('../models/SystemConfig')(sequelize);

// Modelos para gestión de empresas y módulos
const Company = require('../models/Company')(sequelize);
const SystemModule = require('../models/SystemModule')(sequelize);
const CompanyModule = require('../models/CompanyModule')(sequelize);

// Nuevos modelos para documentación personal y licencias
const MultipleARTConfiguration = require('../models/MultipleARTConfiguration')(sequelize);
const VacationConfiguration = require('../models/VacationConfiguration')(sequelize);
const VacationScale = require('../models/VacationScale')(sequelize);
const ExtraordinaryLicense = require('../models/ExtraordinaryLicense')(sequelize);
const EmployeeDocument = require('../models/EmployeeDocument')(sequelize);
const VacationRequest = require('../models/VacationRequest')(sequelize);
const TaskCompatibility = require('../models/TaskCompatibility')(sequelize);

// Modelo de datos biométricos faciales
const FacialBiometricData = require('../models/FacialBiometricData')(sequelize);

// Modelo de ubicaciones de empleados
const EmployeeLocation = require('../models/EmployeeLocation')(sequelize);

// Modelos de capacitaciones
const Training = require('../models/Training-postgresql')(sequelize);
const TrainingAssignment = require('../models/TrainingAssignment-postgresql')(sequelize);
const TrainingProgress = require('../models/TrainingProgress-postgresql')(sequelize);

// Modelo de Kiosks para control de acceso
const Kiosk = require('../models/Kiosk-postgresql')(sequelize);

// Modelo de Sanciones
const Sanction = require('../models/Sanction-postgresql')(sequelize);

// Modelos para control de acceso de visitantes
const Visitor = require('../models/Visitor-postgresql')(sequelize);
const VisitorGpsTracking = require('../models/VisitorGpsTracking-postgresql')(sequelize);
const AccessNotification = require('../models/AccessNotification-postgresql')(sequelize);

// Modelos para sistema avanzado de comisiones y soporte
const VendorCommission = require('../models/VendorCommission')(sequelize);
const VendorRating = require('../models/VendorRating')(sequelize);
const SupportTicket = require('../models/SupportTicket')(sequelize);
const SupportPackageAuction = require('../models/SupportPackageAuction')(sequelize);
const VendorReferral = require('../models/VendorReferral')(sequelize);

// ✅ MODELOS - Sistema de Soporte V2.0 (SLA, Escalamiento, Asistente Dual)
const SupportTicketV2 = require('../models/SupportTicketV2')(sequelize);
const SupportTicketMessage = require('../models/SupportTicketMessage')(sequelize);
const SupportActivityLog = require('../models/SupportActivityLog')(sequelize);
const CompanySupportAssignment = require('../models/CompanySupportAssignment')(sequelize);
const SupportVendorStats = require('../models/SupportVendorStats')(sequelize);
const SupportSLAPlan = require('../models/SupportSLAPlan')(sequelize);
const SupportVendorSupervisor = require('../models/SupportVendorSupervisor')(sequelize);
const SupportEscalation = require('../models/SupportEscalation')(sequelize);
const SupportAssistantAttempt = require('../models/SupportAssistantAttempt')(sequelize);

// ✅ MODELOS - Sistema de Notificaciones Enterprise V3.0
const Notification = require('../models/Notification')(sequelize);
const NotificationWorkflow = require('../models/NotificationWorkflow')(sequelize);
const NotificationActionsLog = require('../models/NotificationActionsLog')(sequelize);
const NotificationTemplate = require('../models/NotificationTemplate')(sequelize);
const UserNotificationPreference = require('../models/UserNotificationPreference')(sequelize);

// ✅ MODELO - Sistema de Auditoría y Auto-Diagnóstico
const AuditLog = require('../models/AuditLog')(sequelize);

// ✅ MODELO - Sistema de Asistente IA (Ollama + Llama 3.1)
const AssistantKnowledgeBase = require('../models/AssistantKnowledgeBase')(sequelize);
const AssistantConversation = require('../models/AssistantConversation')(sequelize);

// ✅ MODELO - Sistema de Testing Phase 4 (Audit Test Logs)
const { defineModel: defineAuditTestLog } = require('../models/AuditTestLog');
const AuditTestLog = defineAuditTestLog(sequelize);

// ✅ MODELOS - Email Verification & Consent Management System
const EmailVerificationToken = require('../models/EmailVerificationToken')(sequelize);
const ConsentDefinition = require('../models/ConsentDefinition')(sequelize);
const UserConsent = require('../models/UserConsent')(sequelize);
const ConsentAuditLog = require('../models/ConsentAuditLog')(sequelize);

// ✅ MODELOS - Personal de Aponnt (Staff, Vendedores, Supervisores, etc.)
const AponntStaff = require('../models/AponntStaff')(sequelize);
const AponntStaffCompany = require('../models/AponntStaffCompany')(sequelize);

// ✅ MODELOS - Sistema de Partners Marketplace
const PartnerRole = require('../models/PartnerRole')(sequelize);
const Partner = require('../models/Partner')(sequelize);
const PartnerDocument = require('../models/PartnerDocument')(sequelize);
const PartnerNotification = require('../models/PartnerNotification')(sequelize);
const PartnerAvailability = require('../models/PartnerAvailability')(sequelize);
const PartnerServiceRequest = require('../models/PartnerServiceRequest')(sequelize);
const PartnerReview = require('../models/PartnerReview')(sequelize);
const PartnerServiceConversation = require('../models/PartnerServiceConversation')(sequelize);
const PartnerMediationCase = require('../models/PartnerMediationCase')(sequelize);
const PartnerLegalConsent = require('../models/PartnerLegalConsent')(sequelize);
const PartnerCommissionLog = require('../models/PartnerCommissionLog')(sequelize);

// ✅ MODELOS - Sistema de Vendor Invoicing Completo (Presupuestos, Trials, Contratos)
const Quote = require('../models/Quote')(sequelize);
const ModuleTrial = require('../models/ModuleTrial')(sequelize);
const Contract = require('../models/Contract')(sequelize);

// SuperUser eliminado - se unificó con tabla User

// Definir asociaciones
// IMPORTANTE: User tiene 'user_id' como PK, NO 'id' - siempre especificar sourceKey
User.hasMany(Attendance, { foreignKey: 'user_id', sourceKey: 'user_id' });
Attendance.belongsTo(User, { foreignKey: 'user_id', targetKey: 'user_id' });

User.belongsToMany(Shift, { through: 'UserShifts', sourceKey: 'user_id' });
Shift.belongsToMany(User, { through: 'UserShifts', targetKey: 'user_id' });

// Asociaciones con Branch comentadas temporalmente para PostgreSQL
// User.belongsTo(Branch, { as: 'defaultBranch', foreignKey: 'defaultBranchId' });
// User.belongsToMany(Branch, { through: 'UserBranches', as: 'authorizedBranches' });

User.hasMany(BiometricData, { foreignKey: 'user_id', sourceKey: 'user_id' });
BiometricData.belongsTo(User, { foreignKey: 'user_id', targetKey: 'user_id' });

User.hasMany(Permission, { foreignKey: 'user_id', sourceKey: 'user_id' });
Permission.belongsTo(User, { foreignKey: 'user_id', targetKey: 'user_id' });

User.hasMany(Message, { as: 'receivedMessages', foreignKey: 'recipientId', sourceKey: 'user_id' });
Message.belongsTo(User, { as: 'recipient', foreignKey: 'recipientId', targetKey: 'user_id' });

// Attendance-Branch asociaciones comentadas temporalmente
// Attendance.belongsTo(Branch);
// Branch.hasMany(Attendance);

// Asociaciones médicas
User.hasMany(MedicalCertificate, { foreignKey: 'userId', sourceKey: 'user_id', as: 'medicalCertificates' });
MedicalCertificate.belongsTo(User, { foreignKey: 'userId', targetKey: 'user_id' });

User.hasMany(MedicalPrescription, { foreignKey: 'userId', sourceKey: 'user_id', as: 'medicalPrescriptions' });
MedicalPrescription.belongsTo(User, { foreignKey: 'userId', targetKey: 'user_id' });

MedicalCertificate.hasMany(MedicalPhoto, { foreignKey: 'certificateId', as: 'photos' });
MedicalPhoto.belongsTo(MedicalCertificate, { foreignKey: 'certificateId' });

User.hasMany(MedicalStudyRequest, { foreignKey: 'userId', sourceKey: 'user_id', as: 'studyRequests' });
MedicalStudyRequest.belongsTo(User, { foreignKey: 'userId', targetKey: 'user_id' });

User.hasOne(EmployeeMedicalRecord, { foreignKey: 'userId', sourceKey: 'user_id', as: 'medicalRecord' });
EmployeeMedicalRecord.belongsTo(User, { foreignKey: 'userId', targetKey: 'user_id' });

User.hasMany(MedicalHistory, { foreignKey: 'userId', sourceKey: 'user_id', as: 'medicalHistory' });
MedicalHistory.belongsTo(User, { foreignKey: 'userId', targetKey: 'user_id' });

MedicalCertificate.hasMany(MedicalStudy, { foreignKey: 'certificateId', as: 'studies' });
MedicalStudy.belongsTo(MedicalCertificate, { foreignKey: 'certificateId' });

// Department relations (ajustadas para PostgreSQL)
Department.hasMany(User, { foreignKey: 'departmentId', as: 'employees' });
User.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });

// Kiosk relations
// IMPORTANTE: Company tiene 'company_id' como PK, NO 'id' - siempre especificar sourceKey
Company.hasMany(Kiosk, { foreignKey: 'company_id', sourceKey: 'company_id', as: 'kiosks' });
Kiosk.belongsTo(Company, { foreignKey: 'company_id', targetKey: 'company_id', as: 'company' });

Kiosk.hasMany(Attendance, { foreignKey: 'kiosk_id', as: 'attendances' });
Attendance.belongsTo(Kiosk, { foreignKey: 'kiosk_id', as: 'kiosk' });

// Visitor relations
Company.hasMany(Visitor, { foreignKey: 'company_id', sourceKey: 'company_id', as: 'visitors' });
Visitor.belongsTo(Company, { foreignKey: 'company_id', targetKey: 'company_id', as: 'company' });

Department.hasMany(Visitor, { foreignKey: 'visiting_department_id', as: 'visitors' });
Visitor.belongsTo(Department, { foreignKey: 'visiting_department_id', as: 'visitingDepartment' });

User.hasMany(Visitor, { foreignKey: 'responsible_employee_id', sourceKey: 'user_id', as: 'responsibleForVisitors' });
Visitor.belongsTo(User, { foreignKey: 'responsible_employee_id', targetKey: 'user_id', as: 'responsibleEmployee' });

User.hasMany(Visitor, { foreignKey: 'authorized_by', sourceKey: 'user_id', as: 'authorizedVisitors' });
Visitor.belongsTo(User, { foreignKey: 'authorized_by', targetKey: 'user_id', as: 'authorizedBy' });

Kiosk.hasMany(Visitor, { foreignKey: 'kiosk_id', as: 'visitors' });
Visitor.belongsTo(Kiosk, { foreignKey: 'kiosk_id', as: 'kiosk' });

// VisitorGpsTracking relations
Visitor.hasMany(VisitorGpsTracking, { foreignKey: 'visitor_id', as: 'gpsTracking' });
VisitorGpsTracking.belongsTo(Visitor, { foreignKey: 'visitor_id', as: 'visitor' });

Company.hasMany(VisitorGpsTracking, { foreignKey: 'company_id', sourceKey: 'company_id', as: 'visitorGpsTracking' });
VisitorGpsTracking.belongsTo(Company, { foreignKey: 'company_id', targetKey: 'company_id', as: 'company' });

// AccessNotification relations
Company.hasMany(AccessNotification, { foreignKey: 'company_id', sourceKey: 'company_id', as: 'notifications' });
AccessNotification.belongsTo(Company, { foreignKey: 'company_id', targetKey: 'company_id', as: 'company' });

User.hasMany(AccessNotification, { foreignKey: 'recipient_user_id', sourceKey: 'user_id', as: 'receivedNotifications' });
AccessNotification.belongsTo(User, { foreignKey: 'recipient_user_id', targetKey: 'user_id', as: 'recipient' });

Visitor.hasMany(AccessNotification, { foreignKey: 'related_visitor_id', as: 'notifications' });
AccessNotification.belongsTo(Visitor, { foreignKey: 'related_visitor_id', as: 'relatedVisitor' });

User.hasMany(AccessNotification, { foreignKey: 'related_user_id', sourceKey: 'user_id', as: 'relatedNotifications' });
AccessNotification.belongsTo(User, { foreignKey: 'related_user_id', targetKey: 'user_id', as: 'relatedUser' });

Kiosk.hasMany(AccessNotification, { foreignKey: 'related_kiosk_id', as: 'notifications' });
AccessNotification.belongsTo(Kiosk, { foreignKey: 'related_kiosk_id', as: 'relatedKiosk' });

Attendance.hasMany(AccessNotification, { foreignKey: 'related_attendance_id', as: 'notifications' });
AccessNotification.belongsTo(Attendance, { foreignKey: 'related_attendance_id', as: 'relatedAttendance' });

User.hasMany(AccessNotification, { foreignKey: 'action_taken_by', sourceKey: 'user_id', as: 'actionsOnNotifications' });
AccessNotification.belongsTo(User, { foreignKey: 'action_taken_by', targetKey: 'user_id', as: 'actionTakenBy' });

// Asociaciones para nuevos modelos

// Documentos de empleados
User.hasMany(EmployeeDocument, { foreignKey: 'userId', sourceKey: 'user_id', as: 'documents' });
EmployeeDocument.belongsTo(User, { foreignKey: 'userId', targetKey: 'user_id' });

// Solicitudes de vacaciones
User.hasMany(VacationRequest, { foreignKey: 'userId', sourceKey: 'user_id', as: 'vacationRequests' });
VacationRequest.belongsTo(User, { foreignKey: 'userId', targetKey: 'user_id', as: 'employee' });

// Aprobaciones de vacaciones
User.hasMany(VacationRequest, { foreignKey: 'approvedBy', sourceKey: 'user_id', as: 'approvedVacations' });
VacationRequest.belongsTo(User, { foreignKey: 'approvedBy', targetKey: 'user_id', as: 'approver' });

// Licencias extraordinarias
VacationRequest.belongsTo(ExtraordinaryLicense, { foreignKey: 'extraordinaryLicenseId', as: 'licenseType' });
ExtraordinaryLicense.hasMany(VacationRequest, { foreignKey: 'extraordinaryLicenseId', as: 'requests' });

// Compatibilidad de tareas
User.hasMany(TaskCompatibility, { foreignKey: 'primaryUserId', sourceKey: 'user_id', as: 'taskCompatibilityAsPrimary' });
User.hasMany(TaskCompatibility, { foreignKey: 'coverUserId', sourceKey: 'user_id', as: 'taskCompatibilityAsCover' });
TaskCompatibility.belongsTo(User, { foreignKey: 'primaryUserId', targetKey: 'user_id', as: 'primaryUser' });
TaskCompatibility.belongsTo(User, { foreignKey: 'coverUserId', targetKey: 'user_id', as: 'coverUser' });

// Asociaciones biométricas faciales
User.hasMany(FacialBiometricData, { foreignKey: 'userId', sourceKey: 'user_id', as: 'facialBiometrics' });
FacialBiometricData.belongsTo(User, { foreignKey: 'userId', targetKey: 'user_id', as: 'User' });

// Asociaciones de ubicaciones de empleados
User.hasMany(EmployeeLocation, { foreignKey: 'userId', sourceKey: 'user_id', as: 'locations' });
EmployeeLocation.belongsTo(User, { foreignKey: 'userId', targetKey: 'user_id', as: 'employee' });

// Asociaciones de capacitaciones
Company.hasMany(Training, { foreignKey: 'company_id', sourceKey: 'company_id', as: 'trainings' });
Training.belongsTo(Company, { foreignKey: 'company_id', targetKey: 'company_id', as: 'company' });

Training.hasMany(TrainingAssignment, { foreignKey: 'training_id', as: 'assignments' });
TrainingAssignment.belongsTo(Training, { foreignKey: 'training_id', as: 'training' });

User.hasMany(TrainingAssignment, { foreignKey: 'user_id', sourceKey: 'user_id', as: 'trainingAssignments' });
TrainingAssignment.belongsTo(User, { foreignKey: 'user_id', targetKey: 'user_id', as: 'user' });

TrainingAssignment.hasMany(TrainingProgress, { foreignKey: 'assignment_id', as: 'progressRecords' });
TrainingProgress.belongsTo(TrainingAssignment, { foreignKey: 'assignment_id', as: 'assignment' });

// Asociaciones para gestión de empresas y módulos (usando nombres reales de columnas)
Company.hasMany(CompanyModule, { foreignKey: 'company_id', sourceKey: 'company_id', as: 'modules' });
CompanyModule.belongsTo(Company, { foreignKey: 'company_id', targetKey: 'company_id', as: 'company' });

SystemModule.hasMany(CompanyModule, { foreignKey: 'system_module_id', as: 'companySubscriptions' });
CompanyModule.belongsTo(SystemModule, { foreignKey: 'system_module_id', as: 'systemModule' });

// Los usuarios pertenecen a empresas
User.belongsTo(Company, { foreignKey: 'company_id', targetKey: 'company_id', as: 'company' });
Company.hasMany(User, { foreignKey: 'company_id', sourceKey: 'company_id', as: 'users' });

// Asociaciones para sistema avanzado de comisiones y soporte

// VendorCommission associations
User.hasMany(VendorCommission, { foreignKey: 'vendorId', sourceKey: 'user_id', as: 'vendorCommissions' });
VendorCommission.belongsTo(User, { foreignKey: 'vendorId', targetKey: 'user_id', as: 'vendor' });

User.hasMany(VendorCommission, { foreignKey: 'originalVendorId', sourceKey: 'user_id', as: 'originalCommissions' });
VendorCommission.belongsTo(User, { foreignKey: 'originalVendorId', targetKey: 'user_id', as: 'originalVendor' });

Company.hasMany(VendorCommission, { foreignKey: 'companyId', sourceKey: 'company_id', as: 'commissions' });
VendorCommission.belongsTo(Company, { foreignKey: 'companyId', targetKey: 'company_id', as: 'company' });

// VendorRating associations
User.hasMany(VendorRating, { foreignKey: 'vendorId', sourceKey: 'user_id', as: 'ratings' });
VendorRating.belongsTo(User, { foreignKey: 'vendorId', targetKey: 'user_id', as: 'vendor' });

Company.hasMany(VendorRating, { foreignKey: 'companyId', sourceKey: 'company_id', as: 'vendorRatings' });
VendorRating.belongsTo(Company, { foreignKey: 'companyId', targetKey: 'company_id', as: 'company' });

// SupportTicket associations
Company.hasMany(SupportTicket, { foreignKey: 'companyId', sourceKey: 'company_id', as: 'supportTickets' });
SupportTicket.belongsTo(Company, { foreignKey: 'companyId', targetKey: 'company_id', as: 'company' });

User.hasMany(SupportTicket, { foreignKey: 'userId', sourceKey: 'user_id', as: 'createdTickets' });
SupportTicket.belongsTo(User, { foreignKey: 'userId', targetKey: 'user_id', as: 'creator' });

User.hasMany(SupportTicket, { foreignKey: 'vendorId', sourceKey: 'user_id', as: 'assignedTickets' });
SupportTicket.belongsTo(User, { foreignKey: 'vendorId', targetKey: 'user_id', as: 'assignedVendor' });

User.hasMany(SupportTicket, { foreignKey: 'supportVendorId', sourceKey: 'user_id', as: 'supportTickets' });
SupportTicket.belongsTo(User, { foreignKey: 'supportVendorId', targetKey: 'user_id', as: 'supportVendor' });

// SupportPackageAuction associations
Company.hasMany(SupportPackageAuction, { foreignKey: 'companyId', sourceKey: 'company_id', as: 'packageAuctions' });
SupportPackageAuction.belongsTo(Company, { foreignKey: 'companyId', targetKey: 'company_id', as: 'company' });

User.hasMany(SupportPackageAuction, { foreignKey: 'originalVendorId', sourceKey: 'user_id', as: 'lostPackages' });
SupportPackageAuction.belongsTo(User, { foreignKey: 'originalVendorId', targetKey: 'user_id', as: 'originalVendor' });

User.hasMany(SupportPackageAuction, { foreignKey: 'currentVendorId', sourceKey: 'user_id', as: 'currentPackages' });
SupportPackageAuction.belongsTo(User, { foreignKey: 'currentVendorId', targetKey: 'user_id', as: 'currentVendor' });

User.hasMany(SupportPackageAuction, { foreignKey: 'newVendorId', sourceKey: 'user_id', as: 'wonPackages' });
SupportPackageAuction.belongsTo(User, { foreignKey: 'newVendorId', targetKey: 'user_id', as: 'newVendor' });

// VendorReferral associations - Sistema piramidal de referidos
User.hasMany(VendorReferral, { foreignKey: 'referrerId', sourceKey: 'user_id', as: 'referrals' });
VendorReferral.belongsTo(User, { foreignKey: 'referrerId', targetKey: 'user_id', as: 'referrer' });

User.hasMany(VendorReferral, { foreignKey: 'referredId', sourceKey: 'user_id', as: 'referredBy' });
VendorReferral.belongsTo(User, { foreignKey: 'referredId', targetKey: 'user_id', as: 'referred' });

VendorCommission.belongsTo(VendorReferral, { foreignKey: 'referralId', as: 'referral' });
VendorReferral.hasMany(VendorCommission, { foreignKey: 'referralId', as: 'commissions' });

// =========================================================================
// ✅ ASOCIACIONES - Sistema de Soporte V2.0 (SLA, Escalamiento, Asistente)
// =========================================================================

// SupportSLAPlan associations
Company.belongsTo(SupportSLAPlan, { foreignKey: 'support_sla_plan_id', as: 'supportSLAPlan' });
SupportSLAPlan.hasMany(Company, { foreignKey: 'support_sla_plan_id', as: 'companies' });

// SupportTicketV2 associations (modelo nuevo principal)
if (SupportTicketV2.associate) SupportTicketV2.associate({ Company, User, SupportTicketMessage, SupportActivityLog, SupportEscalation, SupportAssistantAttempt });

// SupportTicketMessage associations
if (SupportTicketMessage.associate) SupportTicketMessage.associate({ SupportTicketV2, User });

// SupportActivityLog associations
if (SupportActivityLog.associate) SupportActivityLog.associate({ SupportTicketV2, User, Company });

// CompanySupportAssignment associations
if (CompanySupportAssignment.associate) CompanySupportAssignment.associate({ Company, User });

// SupportVendorStats associations
if (SupportVendorStats.associate) SupportVendorStats.associate({ User });

// SupportVendorSupervisor associations
if (SupportVendorSupervisor.associate) SupportVendorSupervisor.associate({ User });

// SupportEscalation associations
if (SupportEscalation.associate) SupportEscalation.associate({ SupportTicketV2, User });

// SupportAssistantAttempt associations
if (SupportAssistantAttempt.associate) SupportAssistantAttempt.associate({ SupportTicketV2 });

// =========================================================================
// ✅ ASOCIACIONES - Sistema de Notificaciones Enterprise V3.0
// =========================================================================

// Notification associations
Company.hasMany(Notification, { foreignKey: 'company_id', sourceKey: 'company_id', as: 'companyNotifications' });
Notification.belongsTo(Company, { foreignKey: 'company_id', targetKey: 'company_id', as: 'company' });

User.hasMany(Notification, { foreignKey: 'recipient_user_id', sourceKey: 'user_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'recipient_user_id', targetKey: 'user_id', as: 'recipient' });

User.hasMany(Notification, { foreignKey: 'related_user_id', sourceKey: 'user_id', as: 'relatedToNotifications' });
Notification.belongsTo(User, { foreignKey: 'related_user_id', targetKey: 'user_id', as: 'relatedUser' });

User.hasMany(Notification, { foreignKey: 'created_by', sourceKey: 'user_id', as: 'createdNotifications' });
Notification.belongsTo(User, { foreignKey: 'created_by', targetKey: 'user_id', as: 'creator' });

User.hasMany(Notification, { foreignKey: 'read_by', sourceKey: 'user_id', as: 'readNotifications' });
Notification.belongsTo(User, { foreignKey: 'read_by', targetKey: 'user_id', as: 'reader' });

User.hasMany(Notification, { foreignKey: 'action_taken_by', sourceKey: 'user_id', as: 'actedNotifications' });
Notification.belongsTo(User, { foreignKey: 'action_taken_by', targetKey: 'user_id', as: 'actor' });

Department.hasMany(Notification, { foreignKey: 'recipient_department_id', as: 'departmentNotifications' });
Notification.belongsTo(Department, { foreignKey: 'recipient_department_id', as: 'recipientDepartment' });

Shift.hasMany(Notification, { foreignKey: 'recipient_shift_id', as: 'shiftNotifications' });
Notification.belongsTo(Shift, { foreignKey: 'recipient_shift_id', as: 'recipientShift' });

Department.hasMany(Notification, { foreignKey: 'related_department_id', as: 'relatedNotifications' });
Notification.belongsTo(Department, { foreignKey: 'related_department_id', as: 'relatedDepartment' });

Kiosk.hasMany(Notification, { foreignKey: 'related_kiosk_id', as: 'kioskNotifications' });
Notification.belongsTo(Kiosk, { foreignKey: 'related_kiosk_id', as: 'relatedKiosk' });

Attendance.hasMany(Notification, { foreignKey: 'related_attendance_id', as: 'attendanceNotifications' });
Notification.belongsTo(Attendance, { foreignKey: 'related_attendance_id', as: 'relatedAttendance' });

// Escalation chain
Notification.belongsTo(Notification, { foreignKey: 'escalated_from_notification_id', as: 'escalatedFrom' });
Notification.hasOne(Notification, { foreignKey: 'escalated_from_notification_id', as: 'escalatedTo' });

// NotificationWorkflow associations
Company.hasMany(NotificationWorkflow, { foreignKey: 'company_id', sourceKey: 'company_id', as: 'workflows' });
NotificationWorkflow.belongsTo(Company, { foreignKey: 'company_id', targetKey: 'company_id', as: 'company' });

// NotificationActionsLog associations
Notification.hasMany(NotificationActionsLog, { foreignKey: 'notification_id', as: 'actionsLog' });
NotificationActionsLog.belongsTo(Notification, { foreignKey: 'notification_id', as: 'notification' });

Company.hasMany(NotificationActionsLog, { foreignKey: 'company_id', sourceKey: 'company_id', as: 'notificationActions' });
NotificationActionsLog.belongsTo(Company, { foreignKey: 'company_id', targetKey: 'company_id', as: 'company' });

User.hasMany(NotificationActionsLog, { foreignKey: 'action_by', sourceKey: 'user_id', as: 'notificationActions' });
NotificationActionsLog.belongsTo(User, { foreignKey: 'action_by', targetKey: 'user_id', as: 'actionBy' });

// NotificationTemplate associations
Company.hasMany(NotificationTemplate, { foreignKey: 'company_id', sourceKey: 'company_id', as: 'notificationTemplates' });
NotificationTemplate.belongsTo(Company, { foreignKey: 'company_id', targetKey: 'company_id', as: 'company' });

// UserNotificationPreference associations
User.hasMany(UserNotificationPreference, { foreignKey: 'user_id', sourceKey: 'user_id', as: 'notificationPreferences' });
UserNotificationPreference.belongsTo(User, { foreignKey: 'user_id', targetKey: 'user_id', as: 'user' });

Company.hasMany(UserNotificationPreference, { foreignKey: 'company_id', sourceKey: 'company_id', as: 'userNotificationPreferences' });
UserNotificationPreference.belongsTo(Company, { foreignKey: 'company_id', targetKey: 'company_id', as: 'company' });

// SuperUser asociaciones removidas - funcionalidad movida a User

// ============================================================================
// ASOCIACIONES - Sistema de Asistente IA
// ============================================================================

// AssistantKnowledgeBase associations (GLOBAL - company_id opcional)
Company.hasMany(AssistantKnowledgeBase, { foreignKey: 'company_id', sourceKey: 'company_id', as: 'knowledgeEntries' });
AssistantKnowledgeBase.belongsTo(Company, { foreignKey: 'company_id', targetKey: 'company_id', as: 'company' });

User.hasMany(AssistantKnowledgeBase, { foreignKey: 'user_id', sourceKey: 'user_id', as: 'knowledgeEntries' });
AssistantKnowledgeBase.belongsTo(User, { foreignKey: 'user_id', targetKey: 'user_id', as: 'user' });

User.hasMany(AssistantKnowledgeBase, { foreignKey: 'verified_by_admin', sourceKey: 'user_id', as: 'verifiedKnowledge' });
AssistantKnowledgeBase.belongsTo(User, { foreignKey: 'verified_by_admin', targetKey: 'user_id', as: 'verifier' });

// AssistantConversation associations (MULTI-TENANT - company_id obligatorio)
Company.hasMany(AssistantConversation, { foreignKey: 'company_id', sourceKey: 'company_id', as: 'conversations' });
AssistantConversation.belongsTo(Company, { foreignKey: 'company_id', targetKey: 'company_id', as: 'company' });

User.hasMany(AssistantConversation, { foreignKey: 'user_id', sourceKey: 'user_id', as: 'conversations' });
AssistantConversation.belongsTo(User, { foreignKey: 'user_id', targetKey: 'user_id', as: 'user' });

AssistantConversation.belongsTo(AssistantKnowledgeBase, { foreignKey: 'knowledge_entry_id', targetKey: 'id', as: 'knowledgeEntry' });
AssistantKnowledgeBase.hasMany(AssistantConversation, { foreignKey: 'knowledge_entry_id', sourceKey: 'id', as: 'conversations' });

// ============================================================================
// ASOCIACIONES - Email Verification & Consent Management System
// ============================================================================

// ConsentDefinition associations
ConsentDefinition.hasMany(UserConsent, {
  foreignKey: 'consent_id',
  as: 'user_consents'
});

// UserConsent associations
UserConsent.belongsTo(ConsentDefinition, {
  foreignKey: 'consent_id',
  as: 'consent_definition'
});

UserConsent.belongsTo(User, {
  foreignKey: 'user_id',
  targetKey: 'user_id',
  as: 'user'
});

User.hasMany(UserConsent, {
  foreignKey: 'user_id',
  sourceKey: 'user_id',
  as: 'consents'
});

UserConsent.belongsTo(Company, {
  foreignKey: 'company_id',
  targetKey: 'company_id',
  as: 'company'
});

Company.hasMany(UserConsent, {
  foreignKey: 'company_id',
  sourceKey: 'company_id',
  as: 'user_consents'
});

UserConsent.hasMany(ConsentAuditLog, {
  foreignKey: 'user_consent_id',
  as: 'audit_logs'
});

// ConsentAuditLog associations
ConsentAuditLog.belongsTo(UserConsent, {
  foreignKey: 'user_consent_id',
  as: 'user_consent'
});

ConsentAuditLog.belongsTo(User, {
  foreignKey: 'changed_by',
  targetKey: 'user_id',
  as: 'changed_by_user'
});

// EmailVerificationToken associations
EmailVerificationToken.belongsTo(Company, {
  foreignKey: 'company_id',
  targetKey: 'company_id',
  as: 'company'
});

Company.hasMany(EmailVerificationToken, {
  foreignKey: 'company_id',
  sourceKey: 'company_id',
  as: 'email_verification_tokens'
});

// ============================================================================
// ASOCIACIONES - Personal de Aponnt (Staff System)
// ============================================================================

// AponntStaff - Auto-relación (líder)
AponntStaff.belongsTo(AponntStaff, { foreignKey: 'leader_id', as: 'leader' });
AponntStaff.hasMany(AponntStaff, { foreignKey: 'leader_id', as: 'team_members' });

// AponntStaff - Auto-relación (supervisor)
AponntStaff.belongsTo(AponntStaff, { foreignKey: 'supervisor_id', as: 'supervisor' });
AponntStaff.hasMany(AponntStaff, { foreignKey: 'supervisor_id', as: 'supervised_staff' });

// AponntStaff - Auto-relación (auditoría: quién creó)
AponntStaff.belongsTo(AponntStaff, { foreignKey: 'created_by', as: 'creator' });
AponntStaff.hasMany(AponntStaff, { foreignKey: 'created_by', as: 'created_staff' });

// AponntStaff <-> Company (many-to-many via AponntStaffCompany)
AponntStaff.belongsToMany(Company, {
  through: AponntStaffCompany,
  foreignKey: 'staff_id',
  otherKey: 'company_id',
  as: 'assigned_companies'
});

Company.belongsToMany(AponntStaff, {
  through: AponntStaffCompany,
  foreignKey: 'company_id',
  otherKey: 'staff_id',
  sourceKey: 'company_id',
  as: 'assigned_staff'
});

// AponntStaffCompany associations
AponntStaffCompany.belongsTo(AponntStaff, { foreignKey: 'staff_id', as: 'staff' });
AponntStaffCompany.belongsTo(Company, { foreignKey: 'company_id', targetKey: 'company_id', as: 'company' });
AponntStaffCompany.belongsTo(AponntStaff, { foreignKey: 'assigned_by', as: 'assigner' });
AponntStaffCompany.belongsTo(AponntStaff, { foreignKey: 'deactivated_by', as: 'deactivator' });

// Partner - approved_by (FK a AponntStaff)
Partner.belongsTo(AponntStaff, { foreignKey: 'approved_by', as: 'approver' });
AponntStaff.hasMany(Partner, { foreignKey: 'approved_by', as: 'approved_partners' });

// ============================================================================
// ASOCIACIONES - Sistema de Partners Marketplace
// ============================================================================

// PartnerRole associations
PartnerRole.hasMany(Partner, { foreignKey: 'partner_role_id', as: 'partners' });
Partner.belongsTo(PartnerRole, { foreignKey: 'partner_role_id', as: 'role' });

// Partner - Documents
Partner.hasMany(PartnerDocument, { foreignKey: 'partner_id', as: 'documents' });
PartnerDocument.belongsTo(Partner, { foreignKey: 'partner_id', as: 'partner' });

// Partner - Notifications
Partner.hasMany(PartnerNotification, { foreignKey: 'partner_id', as: 'notifications' });
PartnerNotification.belongsTo(Partner, { foreignKey: 'partner_id', as: 'partner' });

// Partner - Availability
Partner.hasMany(PartnerAvailability, { foreignKey: 'partner_id', as: 'availability' });
PartnerAvailability.belongsTo(Partner, { foreignKey: 'partner_id', as: 'partner' });

// Partner - Service Requests
Partner.hasMany(PartnerServiceRequest, { foreignKey: 'partner_id', as: 'serviceRequests' });
PartnerServiceRequest.belongsTo(Partner, { foreignKey: 'partner_id', as: 'partner' });

Company.hasMany(PartnerServiceRequest, { foreignKey: 'company_id', sourceKey: 'company_id', as: 'partnerServiceRequests' });
PartnerServiceRequest.belongsTo(Company, { foreignKey: 'company_id', targetKey: 'company_id', as: 'company' });

User.hasMany(PartnerServiceRequest, { foreignKey: 'user_id', sourceKey: 'user_id', as: 'partnerServiceRequests' });
PartnerServiceRequest.belongsTo(User, { foreignKey: 'user_id', targetKey: 'user_id', as: 'requester' });

// Partner - Reviews
Partner.hasMany(PartnerReview, { foreignKey: 'partner_id', as: 'reviews' });
PartnerReview.belongsTo(Partner, { foreignKey: 'partner_id', as: 'partner' });

Company.hasMany(PartnerReview, { foreignKey: 'company_id', sourceKey: 'company_id', as: 'partnerReviews' });
PartnerReview.belongsTo(Company, { foreignKey: 'company_id', targetKey: 'company_id', as: 'company' });

PartnerServiceRequest.hasMany(PartnerReview, { foreignKey: 'service_request_id', as: 'reviews' });
PartnerReview.belongsTo(PartnerServiceRequest, { foreignKey: 'service_request_id', as: 'serviceRequest' });

// Partner - Service Conversations
PartnerServiceRequest.hasMany(PartnerServiceConversation, { foreignKey: 'service_request_id', as: 'conversations' });
PartnerServiceConversation.belongsTo(PartnerServiceRequest, { foreignKey: 'service_request_id', as: 'serviceRequest' });

// Partner - Mediation Cases
Partner.hasMany(PartnerMediationCase, { foreignKey: 'partner_id', as: 'mediationCases' });
PartnerMediationCase.belongsTo(Partner, { foreignKey: 'partner_id', as: 'partner' });

Company.hasMany(PartnerMediationCase, { foreignKey: 'company_id', sourceKey: 'company_id', as: 'partnerMediationCases' });
PartnerMediationCase.belongsTo(Company, { foreignKey: 'company_id', targetKey: 'company_id', as: 'company' });

PartnerServiceRequest.hasMany(PartnerMediationCase, { foreignKey: 'service_request_id', as: 'mediationCases' });
PartnerMediationCase.belongsTo(PartnerServiceRequest, { foreignKey: 'service_request_id', as: 'serviceRequest' });

// Partner - Legal Consents
Partner.hasMany(PartnerLegalConsent, { foreignKey: 'partner_id', as: 'legalConsents' });
PartnerLegalConsent.belongsTo(Partner, { foreignKey: 'partner_id', as: 'partner' });

// Partner - Commission Logs
Partner.hasMany(PartnerCommissionLog, { foreignKey: 'partner_id', as: 'commissionLogs' });
PartnerCommissionLog.belongsTo(Partner, { foreignKey: 'partner_id', as: 'partner' });

Company.hasMany(PartnerCommissionLog, { foreignKey: 'company_id', sourceKey: 'company_id', as: 'partnerCommissions' });
PartnerCommissionLog.belongsTo(Company, { foreignKey: 'company_id', targetKey: 'company_id', as: 'company' });

PartnerServiceRequest.hasMany(PartnerCommissionLog, { foreignKey: 'service_request_id', as: 'commissions' });
PartnerCommissionLog.belongsTo(PartnerServiceRequest, { foreignKey: 'service_request_id', as: 'serviceRequest' });

// Notification to ServiceRequest link
PartnerNotification.belongsTo(PartnerServiceRequest, { foreignKey: 'related_service_request_id', as: 'serviceRequest' });
PartnerServiceRequest.hasMany(PartnerNotification, { foreignKey: 'related_service_request_id', as: 'notifications' });

// ═══════════════════════════════════════════════════════════
// ✅ ASOCIACIONES - Sistema de Vendor Invoicing Completo
// ═══════════════════════════════════════════════════════════

// Quote associations
Company.hasMany(Quote, { foreignKey: 'company_id', sourceKey: 'company_id', as: 'quotes' });
Quote.belongsTo(Company, { foreignKey: 'company_id', targetKey: 'company_id', as: 'company' });

Partner.hasMany(Quote, { foreignKey: 'seller_id', as: 'sellerQuotes' });
Quote.belongsTo(Partner, { foreignKey: 'seller_id', as: 'seller' });

// Quote self-references (previous/replaces/replaced_by)
Quote.belongsTo(Quote, { foreignKey: 'previous_quote_id', as: 'previousQuote' });
Quote.belongsTo(Quote, { foreignKey: 'replaces_quote_id', as: 'replacesQuote' });
Quote.belongsTo(Quote, { foreignKey: 'replaced_by_quote_id', as: 'replacedByQuote' });

// ModuleTrial associations
Company.hasMany(ModuleTrial, { foreignKey: 'company_id', sourceKey: 'company_id', as: 'moduleTrials' });
ModuleTrial.belongsTo(Company, { foreignKey: 'company_id', targetKey: 'company_id', as: 'company' });

Quote.hasMany(ModuleTrial, { foreignKey: 'quote_id', as: 'moduleTrials' });
ModuleTrial.belongsTo(Quote, { foreignKey: 'quote_id', as: 'quote' });

// Contract associations
Company.hasMany(Contract, { foreignKey: 'company_id', sourceKey: 'company_id', as: 'contracts' });
Contract.belongsTo(Company, { foreignKey: 'company_id', targetKey: 'company_id', as: 'company' });

Quote.hasOne(Contract, { foreignKey: 'quote_id', as: 'contract' });
Contract.belongsTo(Quote, { foreignKey: 'quote_id', as: 'quote' });

Partner.hasMany(Contract, { foreignKey: 'seller_id', as: 'sellerContracts' });
Contract.belongsTo(Partner, { foreignKey: 'seller_id', as: 'seller' });

Partner.hasMany(Contract, { foreignKey: 'support_partner_id', as: 'supportContracts' });
Contract.belongsTo(Partner, { foreignKey: 'support_partner_id', as: 'supportPartner' });

module.exports = {
  sequelize,
  User,
  Attendance,
  Shift,
  Branch,
  Department,
  Kiosk,
  Sanction,
  Visitor,
  VisitorGpsTracking,
  AccessNotification,
  BiometricData,
  Message,
  Permission,
  SystemConfig,
  MedicalCertificate,
  MedicalPrescription,
  MedicalQuestionnaire,
  MedicalDiagnosis,
  MedicalPhoto,
  MedicalStudy,
  EmployeeMedicalRecord,
  MedicalHistory,
  MedicalStudyRequest,
  ARTConfiguration,
  MedicalStatistics,
  MultipleARTConfiguration,
  VacationConfiguration,
  VacationScale,
  ExtraordinaryLicense,
  EmployeeDocument,
  VacationRequest,
  TaskCompatibility,
  FacialBiometricData,
  EmployeeLocation,
  Training,
  TrainingAssignment,
  TrainingProgress,
  Company,
  SystemModule,
  CompanyModule,
  VendorCommission,
  VendorRating,
  SupportTicket,
  SupportPackageAuction,
  VendorReferral,
  // ✅ EXPORTS - Sistema de Soporte V2.0
  SupportTicketV2,
  SupportTicketMessage,
  SupportActivityLog,
  CompanySupportAssignment,
  SupportVendorStats,
  SupportSLAPlan,
  SupportVendorSupervisor,
  SupportEscalation,
  SupportAssistantAttempt,
  // ✅ EXPORTS - Modelos Enterprise V3.0
  Notification,
  NotificationWorkflow,
  NotificationActionsLog,
  NotificationTemplate,
  UserNotificationPreference,
  // ✅ EXPORT - Sistema de Auditoría
  AuditLog,
  // ✅ EXPORT - Sistema de Testing Phase 4
  AuditTestLog,
  // ✅ EXPORT - Sistema de Asistente IA
  AssistantKnowledgeBase,
  AssistantConversation,
  // ✅ EXPORTS - Email Verification & Consent Management
  EmailVerificationToken,
  ConsentDefinition,
  UserConsent,
  ConsentAuditLog,
  // ✅ EXPORTS - Personal de Aponnt (Staff System)
  AponntStaff,
  AponntStaffCompany,
  // ✅ EXPORTS - Sistema de Partners Marketplace
  PartnerRole,
  Partner,
  PartnerDocument,
  PartnerNotification,
  PartnerAvailability,
  PartnerServiceRequest,
  PartnerReview,
  PartnerServiceConversation,
  PartnerMediationCase,
  PartnerLegalConsent,
  PartnerCommissionLog,

  // Vendor Invoicing System
  Quote,
  ModuleTrial,
  Contract,

  connect: async () => {
    try {
      await sequelize.authenticate();
      console.log('✅ Conexión a PostgreSQL establecida (Optimizado)');
      return true;
    } catch (error) {
      console.error('❌ Error conectando a PostgreSQL:', error);
      throw error;
    }
  },
  
  sync: async () => {
    try {
      console.log('🔄 Iniciando sincronización PostgreSQL con asociaciones corregidas...');

      // Sincronizar con alter:true para actualizar tablas existentes sin borrarlas
      await sequelize.sync({ alter: true });

      console.log('✅ Sincronización PostgreSQL completada exitosamente');
      return true;
    } catch (error) {
      console.error('❌ Error sincronizando PostgreSQL:', error.message);
      console.error('Stack trace:', error.stack);
      throw error;
    }
  },
  
  close: async () => {
    try {
      await sequelize.close();
      return true;
    } catch (error) {
      console.error('Error cerrando conexión PostgreSQL:', error);
      throw error;
    }
  },
  
  isConnected: () => {
    try {
      return sequelize.authenticate();
    } catch {
      return false;
    }
  }
};