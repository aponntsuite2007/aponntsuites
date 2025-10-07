const { Sequelize } = require('sequelize');

// CONFIGURACIÓN POSTGRESQL - Compatible con Railway y Local
// Railway provee DATABASE_URL, Local usa POSTGRES_*
let sequelize;

// DEBUG: Verificar variables de entorno
console.log('🔍 [DEBUG] DATABASE_URL exists?', !!process.env.DATABASE_URL);
console.log('🔍 [DEBUG] DATABASE_URL value:', process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 30) + '...' : 'NOT SET');
console.log('🔍 [DEBUG] NODE_ENV:', process.env.NODE_ENV);

if (process.env.DATABASE_URL) {
  // RAILWAY/PRODUCCIÓN: Usar DATABASE_URL
  console.log('🚂 Conectando a Railway PostgreSQL via DATABASE_URL');
  sequelize = new Sequelize(process.env.DATABASE_URL, {
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

// Modelo de Kiosks para control de acceso
const Kiosk = require('../models/Kiosk-postgresql')(sequelize);

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

// SuperUser eliminado - se unificó con tabla User

// Definir asociaciones
User.hasMany(Attendance, { foreignKey: 'user_id' });
Attendance.belongsTo(User, { foreignKey: 'user_id' });

User.belongsToMany(Shift, { through: 'UserShifts' });
Shift.belongsToMany(User, { through: 'UserShifts' });

// Asociaciones con Branch comentadas temporalmente para PostgreSQL
// User.belongsTo(Branch, { as: 'defaultBranch', foreignKey: 'defaultBranchId' });
// User.belongsToMany(Branch, { through: 'UserBranches', as: 'authorizedBranches' });

User.hasMany(BiometricData, { foreignKey: 'user_id' });
BiometricData.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Permission, { foreignKey: 'user_id' });
Permission.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Message, { as: 'receivedMessages', foreignKey: 'recipientId' });
Message.belongsTo(User, { as: 'recipient', foreignKey: 'recipientId' });

// Attendance-Branch asociaciones comentadas temporalmente
// Attendance.belongsTo(Branch);
// Branch.hasMany(Attendance);

// Asociaciones médicas
User.hasMany(MedicalCertificate, { foreignKey: 'userId', as: 'medicalCertificates' });
MedicalCertificate.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(MedicalPrescription, { foreignKey: 'userId', as: 'medicalPrescriptions' });
MedicalPrescription.belongsTo(User, { foreignKey: 'userId' });

MedicalCertificate.hasMany(MedicalPhoto, { foreignKey: 'certificateId', as: 'photos' });
MedicalPhoto.belongsTo(MedicalCertificate, { foreignKey: 'certificateId' });

User.hasMany(MedicalStudyRequest, { foreignKey: 'userId', as: 'studyRequests' });
MedicalStudyRequest.belongsTo(User, { foreignKey: 'userId' });

User.hasOne(EmployeeMedicalRecord, { foreignKey: 'userId', as: 'medicalRecord' });
EmployeeMedicalRecord.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(MedicalHistory, { foreignKey: 'userId', as: 'medicalHistory' });
MedicalHistory.belongsTo(User, { foreignKey: 'userId' });

MedicalCertificate.hasMany(MedicalStudy, { foreignKey: 'certificateId', as: 'studies' });
MedicalStudy.belongsTo(MedicalCertificate, { foreignKey: 'certificateId' });

// Department relations (ajustadas para PostgreSQL)
Department.hasMany(User, { foreignKey: 'departmentId', as: 'employees' });
User.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });

// Kiosk relations
Company.hasMany(Kiosk, { foreignKey: 'company_id', as: 'kiosks' });
Kiosk.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

Kiosk.hasMany(Attendance, { foreignKey: 'kiosk_id', as: 'attendances' });
Attendance.belongsTo(Kiosk, { foreignKey: 'kiosk_id', as: 'kiosk' });

// Visitor relations
Company.hasMany(Visitor, { foreignKey: 'company_id', as: 'visitors' });
Visitor.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

Department.hasMany(Visitor, { foreignKey: 'visiting_department_id', as: 'visitors' });
Visitor.belongsTo(Department, { foreignKey: 'visiting_department_id', as: 'visitingDepartment' });

User.hasMany(Visitor, { foreignKey: 'responsible_employee_id', as: 'responsibleForVisitors' });
Visitor.belongsTo(User, { foreignKey: 'responsible_employee_id', as: 'responsibleEmployee' });

User.hasMany(Visitor, { foreignKey: 'authorized_by', as: 'authorizedVisitors' });
Visitor.belongsTo(User, { foreignKey: 'authorized_by', as: 'authorizedBy' });

Kiosk.hasMany(Visitor, { foreignKey: 'kiosk_id', as: 'visitors' });
Visitor.belongsTo(Kiosk, { foreignKey: 'kiosk_id', as: 'kiosk' });

// VisitorGpsTracking relations
Visitor.hasMany(VisitorGpsTracking, { foreignKey: 'visitor_id', as: 'gpsTracking' });
VisitorGpsTracking.belongsTo(Visitor, { foreignKey: 'visitor_id', as: 'visitor' });

Company.hasMany(VisitorGpsTracking, { foreignKey: 'company_id', as: 'visitorGpsTracking' });
VisitorGpsTracking.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

// AccessNotification relations
Company.hasMany(AccessNotification, { foreignKey: 'company_id', as: 'notifications' });
AccessNotification.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

User.hasMany(AccessNotification, { foreignKey: 'recipient_user_id', as: 'receivedNotifications' });
AccessNotification.belongsTo(User, { foreignKey: 'recipient_user_id', as: 'recipient' });

Visitor.hasMany(AccessNotification, { foreignKey: 'related_visitor_id', as: 'notifications' });
AccessNotification.belongsTo(Visitor, { foreignKey: 'related_visitor_id', as: 'relatedVisitor' });

User.hasMany(AccessNotification, { foreignKey: 'related_user_id', as: 'relatedNotifications' });
AccessNotification.belongsTo(User, { foreignKey: 'related_user_id', as: 'relatedUser' });

Kiosk.hasMany(AccessNotification, { foreignKey: 'related_kiosk_id', as: 'notifications' });
AccessNotification.belongsTo(Kiosk, { foreignKey: 'related_kiosk_id', as: 'relatedKiosk' });

Attendance.hasMany(AccessNotification, { foreignKey: 'related_attendance_id', as: 'notifications' });
AccessNotification.belongsTo(Attendance, { foreignKey: 'related_attendance_id', as: 'relatedAttendance' });

User.hasMany(AccessNotification, { foreignKey: 'action_taken_by', as: 'actionsOnNotifications' });
AccessNotification.belongsTo(User, { foreignKey: 'action_taken_by', as: 'actionTakenBy' });

// Asociaciones para nuevos modelos

// Documentos de empleados
User.hasMany(EmployeeDocument, { foreignKey: 'userId', as: 'documents' });
EmployeeDocument.belongsTo(User, { foreignKey: 'userId' });

// Solicitudes de vacaciones
User.hasMany(VacationRequest, { foreignKey: 'userId', as: 'vacationRequests' });
VacationRequest.belongsTo(User, { foreignKey: 'userId', as: 'employee' });

// Aprobaciones de vacaciones
User.hasMany(VacationRequest, { foreignKey: 'approvedBy', as: 'approvedVacations' });
VacationRequest.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });

// Licencias extraordinarias
VacationRequest.belongsTo(ExtraordinaryLicense, { foreignKey: 'extraordinaryLicenseId', as: 'licenseType' });
ExtraordinaryLicense.hasMany(VacationRequest, { foreignKey: 'extraordinaryLicenseId', as: 'requests' });

// Compatibilidad de tareas
User.hasMany(TaskCompatibility, { foreignKey: 'primaryUserId', as: 'taskCompatibilityAsPrimary' });
User.hasMany(TaskCompatibility, { foreignKey: 'coverUserId', as: 'taskCompatibilityAsCover' });
TaskCompatibility.belongsTo(User, { foreignKey: 'primaryUserId', as: 'primaryUser' });
TaskCompatibility.belongsTo(User, { foreignKey: 'coverUserId', as: 'coverUser' });

// Asociaciones biométricas faciales
User.hasMany(FacialBiometricData, { foreignKey: 'userId', as: 'facialBiometrics' });
FacialBiometricData.belongsTo(User, { foreignKey: 'userId', as: 'User' });

// Asociaciones de ubicaciones de empleados
User.hasMany(EmployeeLocation, { foreignKey: 'userId', as: 'locations' });
EmployeeLocation.belongsTo(User, { foreignKey: 'userId', as: 'employee' });

// Asociaciones para gestión de empresas y módulos
Company.hasMany(CompanyModule, { foreignKey: 'companyId', as: 'modules' });
CompanyModule.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

SystemModule.hasMany(CompanyModule, { foreignKey: 'systemModuleId', as: 'companySubscriptions' });
CompanyModule.belongsTo(SystemModule, { foreignKey: 'systemModuleId', as: 'systemModule' });

// Los usuarios pertenecen a empresas
User.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });
Company.hasMany(User, { foreignKey: 'company_id', as: 'users' });

// Asociaciones para sistema avanzado de comisiones y soporte

// VendorCommission associations
User.hasMany(VendorCommission, { foreignKey: 'vendorId', as: 'vendorCommissions' });
VendorCommission.belongsTo(User, { foreignKey: 'vendorId', as: 'vendor' });

User.hasMany(VendorCommission, { foreignKey: 'originalVendorId', as: 'originalCommissions' });
VendorCommission.belongsTo(User, { foreignKey: 'originalVendorId', as: 'originalVendor' });

Company.hasMany(VendorCommission, { foreignKey: 'companyId', as: 'commissions' });
VendorCommission.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

// VendorRating associations
User.hasMany(VendorRating, { foreignKey: 'vendorId', as: 'ratings' });
VendorRating.belongsTo(User, { foreignKey: 'vendorId', as: 'vendor' });

Company.hasMany(VendorRating, { foreignKey: 'companyId', as: 'vendorRatings' });
VendorRating.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

// SupportTicket associations
Company.hasMany(SupportTicket, { foreignKey: 'companyId', as: 'supportTickets' });
SupportTicket.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

User.hasMany(SupportTicket, { foreignKey: 'userId', as: 'createdTickets' });
SupportTicket.belongsTo(User, { foreignKey: 'userId', as: 'creator' });

User.hasMany(SupportTicket, { foreignKey: 'vendorId', as: 'assignedTickets' });
SupportTicket.belongsTo(User, { foreignKey: 'vendorId', as: 'assignedVendor' });

User.hasMany(SupportTicket, { foreignKey: 'supportVendorId', as: 'supportTickets' });
SupportTicket.belongsTo(User, { foreignKey: 'supportVendorId', as: 'supportVendor' });

// SupportPackageAuction associations
Company.hasMany(SupportPackageAuction, { foreignKey: 'companyId', as: 'packageAuctions' });
SupportPackageAuction.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

User.hasMany(SupportPackageAuction, { foreignKey: 'originalVendorId', as: 'lostPackages' });
SupportPackageAuction.belongsTo(User, { foreignKey: 'originalVendorId', as: 'originalVendor' });

User.hasMany(SupportPackageAuction, { foreignKey: 'currentVendorId', as: 'currentPackages' });
SupportPackageAuction.belongsTo(User, { foreignKey: 'currentVendorId', as: 'currentVendor' });

User.hasMany(SupportPackageAuction, { foreignKey: 'newVendorId', as: 'wonPackages' });
SupportPackageAuction.belongsTo(User, { foreignKey: 'newVendorId', as: 'newVendor' });

// VendorReferral associations - Sistema piramidal de referidos
User.hasMany(VendorReferral, { foreignKey: 'referrerId', as: 'referrals' });
VendorReferral.belongsTo(User, { foreignKey: 'referrerId', as: 'referrer' });

User.hasMany(VendorReferral, { foreignKey: 'referredId', as: 'referredBy' });
VendorReferral.belongsTo(User, { foreignKey: 'referredId', as: 'referred' });

VendorCommission.belongsTo(VendorReferral, { foreignKey: 'referralId', as: 'referral' });
VendorReferral.hasMany(VendorCommission, { foreignKey: 'referralId', as: 'commissions' });

// SuperUser asociaciones removidas - funcionalidad movida a User

module.exports = {
  sequelize,
  User,
  Attendance,
  Shift,
  Branch,
  Department,
  Kiosk,
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
  Company,
  SystemModule,
  CompanyModule,
  VendorCommission,
  VendorRating,
  SupportTicket,
  SupportPackageAuction,
  VendorReferral,
  
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
      // BYPASS: Deshabilitar sincronización por error SQL UNIQUE
      console.log('🎯 Sincronización PostgreSQL deshabilitada temporalmente');
      return true;
    } catch (error) {
      console.error('❌ Error sincronizando PostgreSQL:', error);
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