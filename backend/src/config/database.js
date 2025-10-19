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

// ✅ MODELOS - Sistema de Notificaciones Enterprise V3.0
const Notification = require('../models/Notification')(sequelize);
const NotificationWorkflow = require('../models/NotificationWorkflow')(sequelize);
const NotificationActionsLog = require('../models/NotificationActionsLog')(sequelize);
const NotificationTemplate = require('../models/NotificationTemplate')(sequelize);
const UserNotificationPreference = require('../models/UserNotificationPreference')(sequelize);

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
// ✅ ASOCIACIONES - Sistema de Notificaciones Enterprise V3.0
// =========================================================================

// Notification associations
Company.hasMany(Notification, { foreignKey: 'company_id', sourceKey: 'company_id', as: 'notifications' });
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
  // ✅ EXPORTS - Modelos Enterprise V3.0
  Notification,
  NotificationWorkflow,
  NotificationActionsLog,
  NotificationTemplate,
  UserNotificationPreference,

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