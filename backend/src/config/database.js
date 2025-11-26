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
const UserShiftAssignment = require('../models/UserShiftAssignment')(sequelize);
const Branch = require('../models/Branch-postgresql')(sequelize);
const Holiday = require('../models/Holiday')(sequelize);
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

// ✅ MODELOS - Sistema de Staff Aponnt Multi-País
const AponntStaffRole = require('../models/AponntStaffRole')(sequelize);
const AponntStaff = require('../models/AponntStaff')(sequelize);

// ✅ MODELO - Sistema de Testing Phase 4 (Audit Test Logs)
const { defineModel: defineAuditTestLog } = require('../models/AuditTestLog');
const AuditTestLog = defineAuditTestLog(sequelize);

// ✅ MODELOS - Sistema de Attendance Analytics (Scoring + Patrones + OLAP)
const AttendanceProfile = require('../models/AttendanceProfile')(sequelize);
const AttendancePattern = require('../models/AttendancePattern')(sequelize);
const ScoringHistory = require('../models/ScoringHistory')(sequelize);
const AttendanceAnalyticsCache = require('../models/AttendanceAnalyticsCache')(sequelize);
const ComparativeAnalytics = require('../models/ComparativeAnalytics')(sequelize);

// ✅ MODELOS - Email Verification & Consent Management System
const EmailVerificationToken = require('../models/EmailVerificationToken')(sequelize);
const ConsentDefinition = require('../models/ConsentDefinition')(sequelize);
const UserConsent = require('../models/UserConsent')(sequelize);
const ConsentAuditLog = require('../models/ConsentAuditLog')(sequelize);

// ✅ MODELOS - Personal de Aponnt (Staff, Vendedores, Supervisores, etc.)
const AponntStaffCompany = require('../models/AponntStaffCompany')(sequelize);
const VendorStatistics = require('../models/VendorStatistics')(sequelize);

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

// ✅ MODELOS - Sistema de TABs 2-9 Modal Ver Usuario (Persistencia Completa)
const UserDriverLicense = require('../models/UserDriverLicense')(sequelize);
const UserProfessionalLicense = require('../models/UserProfessionalLicense')(sequelize);
const UserLegalIssue = require('../models/UserLegalIssue')(sequelize);
const UserUnionAffiliation = require('../models/UserUnionAffiliation')(sequelize);
const CompanyTask = require('../models/CompanyTask')(sequelize);
const UserAssignedTask = require('../models/UserAssignedTask')(sequelize);
const UserSalaryConfig = require('../models/UserSalaryConfig')(sequelize);

// ✅ MODELO - Sistema de Auditoría de Cambios de Usuarios
const UserAuditLog = require('../models/UserAuditLog')(sequelize);

// ✅ MODELO - Sistema de Roles Adicionales (bombero, capacitador, auditor, etc.)
const AdditionalRoleType = require('../models/AdditionalRoleType')(sequelize);

// ✅ MODELOS - Sistema Médico Avanzado (Antropométricos, Cirugías, Psiquiatría, Deportes)
const {
    UserAnthropometricData: UserAnthropometricDataFn,
    ChronicConditionsCatalog: ChronicConditionsCatalogFn,
    UserChronicConditionsV2: UserChronicConditionsV2Fn,
    UserSurgeries: UserSurgeriesFn,
    UserPsychiatricTreatments: UserPsychiatricTreatmentsFn,
    SportsCatalog: SportsCatalogFn,
    UserSportsActivities: UserSportsActivitiesFn,
    UserHealthyHabits: UserHealthyHabitsFn
} = require('../models/UserMedicalAdvanced');

const UserAnthropometricData = UserAnthropometricDataFn(sequelize);
const ChronicConditionsCatalog = ChronicConditionsCatalogFn(sequelize);
const UserChronicConditionsV2 = UserChronicConditionsV2Fn(sequelize);
const UserSurgeries = UserSurgeriesFn(sequelize);
const UserPsychiatricTreatments = UserPsychiatricTreatmentsFn(sequelize);
const SportsCatalog = SportsCatalogFn(sequelize);
const UserSportsActivities = UserSportsActivitiesFn(sequelize);
const UserHealthyHabits = UserHealthyHabitsFn(sequelize);

// ✅ MODELOS - Sistema Salarial Avanzado (Convenios, Categorías, Payroll)
const {
    LaborAgreementsCatalog: LaborAgreementsCatalogFn,
    SalaryCategories: SalaryCategoriesFn,
    UserSalaryConfigV2: UserSalaryConfigV2Fn,
    UserPayrollRecords: UserPayrollRecordsFn
} = require('../models/UserSalaryAdvanced');

const LaborAgreementsCatalog = LaborAgreementsCatalogFn(sequelize);
const SalaryCategories = SalaryCategoriesFn(sequelize);
const UserSalaryConfigV2 = UserSalaryConfigV2Fn(sequelize);
const UserPayrollRecords = UserPayrollRecordsFn(sequelize);

// ✅ MODELOS - Sistema de Liquidación Parametrizable v3.0 (Multi-País, Multi-Sucursal)
const PayrollCountry = require('../models/PayrollCountry')(sequelize);
const CompanyBranch = require('../models/CompanyBranch')(sequelize);
const LaborAgreementV2 = require('../models/LaborAgreementV2')(sequelize);
const PayrollConceptType = require('../models/PayrollConceptType')(sequelize);
const PayrollTemplate = require('../models/PayrollTemplate')(sequelize);
const PayrollTemplateConcept = require('../models/PayrollTemplateConcept')(sequelize);
const SalaryCategoryV2 = require('../models/SalaryCategoryV2')(sequelize);
const UserPayrollAssignment = require('../models/UserPayrollAssignment')(sequelize);
const UserPayrollConceptOverride = require('../models/UserPayrollConceptOverride')(sequelize);
const UserPayrollBonus = require('../models/UserPayrollBonus')(sequelize);
const PayrollRun = require('../models/PayrollRun')(sequelize);
const PayrollRunDetail = require('../models/PayrollRunDetail')(sequelize);
const PayrollRunConceptDetail = require('../models/PayrollRunConceptDetail')(sequelize);

// Modelos de Entidades y Liquidaciones Consolidadas
const PayrollEntity = require('../models/PayrollEntity')(sequelize);
const PayrollEntitySettlement = require('../models/PayrollEntitySettlement')(sequelize);
const PayrollEntitySettlementDetail = require('../models/PayrollEntitySettlementDetail')(sequelize);
const PayrollPayslipTemplate = require('../models/PayrollPayslipTemplate')(sequelize);

// SuperUser eliminado - se unificó con tabla User

// Definir asociaciones
// IMPORTANTE: User tiene 'user_id' como PK, NO 'id' - siempre especificar sourceKey
User.hasMany(Attendance, { foreignKey: 'user_id', sourceKey: 'user_id' });
Attendance.belongsTo(User, { foreignKey: 'user_id', targetKey: 'user_id' });

User.belongsToMany(Shift, { through: 'UserShifts', sourceKey: 'user_id' });
Shift.belongsToMany(User, { through: 'UserShifts', targetKey: 'user_id' });

// =========================================================================
// ✅ ASOCIACIONES - Sistema de Turnos Rotativos (User Shift Assignments)
// =========================================================================

// User <-> UserShiftAssignment
User.hasMany(UserShiftAssignment, { foreignKey: 'user_id', sourceKey: 'user_id', as: 'shiftAssignments' });
UserShiftAssignment.belongsTo(User, { foreignKey: 'user_id', targetKey: 'user_id', as: 'user' });

// Shift <-> UserShiftAssignment
Shift.hasMany(UserShiftAssignment, { foreignKey: 'shift_id', as: 'userAssignments' });
UserShiftAssignment.belongsTo(Shift, { foreignKey: 'shift_id', as: 'shift' });

// Company <-> UserShiftAssignment
Company.hasMany(UserShiftAssignment, { foreignKey: 'company_id', sourceKey: 'company_id', as: 'shiftAssignments' });
UserShiftAssignment.belongsTo(Company, { foreignKey: 'company_id', targetKey: 'company_id', as: 'company' });

// Assigned by (User) <-> UserShiftAssignment
User.hasMany(UserShiftAssignment, { foreignKey: 'assigned_by', sourceKey: 'user_id', as: 'assignedShifts' });
UserShiftAssignment.belongsTo(User, { foreignKey: 'assigned_by', targetKey: 'user_id', as: 'assigner' });

// Deactivated by (User) <-> UserShiftAssignment
User.hasMany(UserShiftAssignment, { foreignKey: 'deactivated_by', sourceKey: 'user_id', as: 'deactivatedShifts' });
UserShiftAssignment.belongsTo(User, { foreignKey: 'deactivated_by', targetKey: 'user_id', as: 'deactivator' });

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

// =========================================================================
// ✅ ASOCIACIONES - Sistema Médico Avanzado
// =========================================================================

// User <-> UserAnthropometricData
User.hasMany(UserAnthropometricData, { foreignKey: 'user_id', sourceKey: 'user_id', as: 'anthropometricData' });
UserAnthropometricData.belongsTo(User, { foreignKey: 'user_id', targetKey: 'user_id', as: 'user' });

// User <-> UserChronicConditionsV2
User.hasMany(UserChronicConditionsV2, { foreignKey: 'user_id', sourceKey: 'user_id', as: 'chronicConditionsV2' });
UserChronicConditionsV2.belongsTo(User, { foreignKey: 'user_id', targetKey: 'user_id', as: 'user' });

// ChronicConditionsCatalog <-> UserChronicConditionsV2
ChronicConditionsCatalog.hasMany(UserChronicConditionsV2, { foreignKey: 'condition_catalog_id', as: 'userConditions' });
UserChronicConditionsV2.belongsTo(ChronicConditionsCatalog, { foreignKey: 'condition_catalog_id', as: 'catalogEntry' });

// User <-> UserSurgeries
User.hasMany(UserSurgeries, { foreignKey: 'user_id', sourceKey: 'user_id', as: 'surgeries' });
UserSurgeries.belongsTo(User, { foreignKey: 'user_id', targetKey: 'user_id', as: 'user' });

// User <-> UserPsychiatricTreatments
User.hasMany(UserPsychiatricTreatments, { foreignKey: 'user_id', sourceKey: 'user_id', as: 'psychiatricTreatments' });
UserPsychiatricTreatments.belongsTo(User, { foreignKey: 'user_id', targetKey: 'user_id', as: 'user' });

// User <-> UserSportsActivities
User.hasMany(UserSportsActivities, { foreignKey: 'user_id', sourceKey: 'user_id', as: 'sportsActivities' });
UserSportsActivities.belongsTo(User, { foreignKey: 'user_id', targetKey: 'user_id', as: 'user' });

// SportsCatalog <-> UserSportsActivities
SportsCatalog.hasMany(UserSportsActivities, { foreignKey: 'sport_catalog_id', as: 'userActivities' });
UserSportsActivities.belongsTo(SportsCatalog, { foreignKey: 'sport_catalog_id', as: 'sportCatalog' });

// User <-> UserHealthyHabits (one-to-one)
User.hasOne(UserHealthyHabits, { foreignKey: 'user_id', sourceKey: 'user_id', as: 'healthyHabits' });
UserHealthyHabits.belongsTo(User, { foreignKey: 'user_id', targetKey: 'user_id', as: 'user' });

// =========================================================================
// ✅ ASOCIACIONES - Sistema Salarial Avanzado
// =========================================================================

// User <-> UserSalaryConfigV2
User.hasMany(UserSalaryConfigV2, { foreignKey: 'user_id', sourceKey: 'user_id', as: 'salaryConfigsV2' });
UserSalaryConfigV2.belongsTo(User, { foreignKey: 'user_id', targetKey: 'user_id', as: 'user' });

// LaborAgreementsCatalog <-> SalaryCategories
LaborAgreementsCatalog.hasMany(SalaryCategories, { foreignKey: 'labor_agreement_id', as: 'categories' });
SalaryCategories.belongsTo(LaborAgreementsCatalog, { foreignKey: 'labor_agreement_id', as: 'laborAgreement' });

// LaborAgreementsCatalog <-> UserSalaryConfigV2
LaborAgreementsCatalog.hasMany(UserSalaryConfigV2, { foreignKey: 'labor_agreement_id', as: 'userConfigs' });
UserSalaryConfigV2.belongsTo(LaborAgreementsCatalog, { foreignKey: 'labor_agreement_id', as: 'laborAgreement' });

// SalaryCategories <-> UserSalaryConfigV2
SalaryCategories.hasMany(UserSalaryConfigV2, { foreignKey: 'salary_category_id', as: 'userConfigs' });
UserSalaryConfigV2.belongsTo(SalaryCategories, { foreignKey: 'salary_category_id', as: 'salaryCategory' });

// User <-> UserPayrollRecords
User.hasMany(UserPayrollRecords, { foreignKey: 'user_id', sourceKey: 'user_id', as: 'payrollRecords' });
UserPayrollRecords.belongsTo(User, { foreignKey: 'user_id', targetKey: 'user_id', as: 'user' });

// =========================================================================
// ✅ ASOCIACIONES - Sistema de Liquidación Parametrizable v3.0
// =========================================================================

// PayrollCountry associations
PayrollCountry.hasMany(CompanyBranch, { foreignKey: 'country_id', as: 'branches' });
CompanyBranch.belongsTo(PayrollCountry, { foreignKey: 'country_id', as: 'country' });

PayrollCountry.hasMany(LaborAgreementV2, { foreignKey: 'country_id', as: 'laborAgreements' });
LaborAgreementV2.belongsTo(PayrollCountry, { foreignKey: 'country_id', as: 'country' });

PayrollCountry.hasMany(PayrollTemplate, { foreignKey: 'country_id', as: 'templates' });
PayrollTemplate.belongsTo(PayrollCountry, { foreignKey: 'country_id', as: 'country' });

// CompanyBranch associations
Company.hasMany(CompanyBranch, { foreignKey: 'company_id', sourceKey: 'company_id', as: 'branches' });
CompanyBranch.belongsTo(Company, { foreignKey: 'company_id', targetKey: 'company_id', as: 'company' });

CompanyBranch.belongsTo(PayrollTemplate, { foreignKey: 'default_template_id', as: 'defaultTemplate' });
PayrollTemplate.hasMany(CompanyBranch, { foreignKey: 'default_template_id', as: 'defaultForBranches' });

CompanyBranch.hasMany(PayrollRun, { foreignKey: 'branch_id', as: 'payrollRuns' });
PayrollRun.belongsTo(CompanyBranch, { foreignKey: 'branch_id', as: 'branch' });

// LaborAgreementV2 associations
LaborAgreementV2.hasMany(PayrollTemplate, { foreignKey: 'agreement_id', as: 'templates' });
PayrollTemplate.belongsTo(LaborAgreementV2, { foreignKey: 'agreement_id', as: 'laborAgreement' });

LaborAgreementV2.hasMany(SalaryCategoryV2, { foreignKey: 'agreement_id', as: 'categories' });
SalaryCategoryV2.belongsTo(LaborAgreementV2, { foreignKey: 'agreement_id', as: 'laborAgreement' });

// PayrollTemplate associations
Company.hasMany(PayrollTemplate, { foreignKey: 'company_id', sourceKey: 'company_id', as: 'payrollTemplates' });
PayrollTemplate.belongsTo(Company, { foreignKey: 'company_id', targetKey: 'company_id', as: 'company' });

User.hasMany(PayrollTemplate, { foreignKey: 'created_by', sourceKey: 'user_id', as: 'createdPayrollTemplates' });
PayrollTemplate.belongsTo(User, { foreignKey: 'created_by', targetKey: 'user_id', as: 'creator' });

PayrollTemplate.hasMany(PayrollTemplateConcept, { foreignKey: 'template_id', as: 'concepts' });
PayrollTemplateConcept.belongsTo(PayrollTemplate, { foreignKey: 'template_id', as: 'template' });

PayrollTemplate.hasMany(UserPayrollAssignment, { foreignKey: 'template_id', as: 'userAssignments' });
UserPayrollAssignment.belongsTo(PayrollTemplate, { foreignKey: 'template_id', as: 'template' });

PayrollTemplate.hasMany(PayrollRun, { foreignKey: 'template_id', as: 'payrollRuns' });
PayrollRun.belongsTo(PayrollTemplate, { foreignKey: 'template_id', as: 'template' });

// PayrollConceptType associations
PayrollConceptType.hasMany(PayrollTemplateConcept, { foreignKey: 'concept_type_id', as: 'templateConcepts' });
PayrollTemplateConcept.belongsTo(PayrollConceptType, { foreignKey: 'concept_type_id', as: 'conceptType' });

// PayrollTemplateConcept associations
PayrollTemplateConcept.hasMany(UserPayrollConceptOverride, { foreignKey: 'concept_id', as: 'userOverrides' });
UserPayrollConceptOverride.belongsTo(PayrollTemplateConcept, { foreignKey: 'concept_id', as: 'concept' });

PayrollTemplateConcept.hasMany(PayrollRunConceptDetail, { foreignKey: 'concept_id', as: 'runDetails' });
PayrollRunConceptDetail.belongsTo(PayrollTemplateConcept, { foreignKey: 'concept_id', as: 'templateConcept' });

// SalaryCategoryV2 associations
SalaryCategoryV2.hasMany(UserPayrollAssignment, { foreignKey: 'category_id', as: 'userAssignments' });
UserPayrollAssignment.belongsTo(SalaryCategoryV2, { foreignKey: 'category_id', as: 'category' });

// UserPayrollAssignment associations
User.hasMany(UserPayrollAssignment, { foreignKey: 'user_id', sourceKey: 'user_id', as: 'payrollAssignments' });
UserPayrollAssignment.belongsTo(User, { foreignKey: 'user_id', targetKey: 'user_id', as: 'user' });

UserPayrollAssignment.belongsTo(CompanyBranch, { foreignKey: 'branch_id', as: 'branch' });
CompanyBranch.hasMany(UserPayrollAssignment, { foreignKey: 'branch_id', as: 'userAssignments' });

UserPayrollAssignment.hasMany(UserPayrollConceptOverride, { foreignKey: 'assignment_id', as: 'conceptOverrides' });
UserPayrollConceptOverride.belongsTo(UserPayrollAssignment, { foreignKey: 'assignment_id', as: 'assignment' });

// UserPayrollConceptOverride associations
User.hasMany(UserPayrollConceptOverride, { foreignKey: 'approved_by', sourceKey: 'user_id', as: 'approvedOverrides' });
UserPayrollConceptOverride.belongsTo(User, { foreignKey: 'approved_by', targetKey: 'user_id', as: 'approver' });

// UserPayrollBonus associations
User.hasMany(UserPayrollBonus, { foreignKey: 'user_id', sourceKey: 'user_id', as: 'payrollBonuses' });
UserPayrollBonus.belongsTo(User, { foreignKey: 'user_id', targetKey: 'user_id', as: 'user' });

Company.hasMany(UserPayrollBonus, { foreignKey: 'company_id', sourceKey: 'company_id', as: 'payrollBonuses' });
UserPayrollBonus.belongsTo(Company, { foreignKey: 'company_id', targetKey: 'company_id', as: 'company' });

User.hasMany(UserPayrollBonus, { foreignKey: 'approved_by', sourceKey: 'user_id', as: 'approvedBonuses' });
UserPayrollBonus.belongsTo(User, { foreignKey: 'approved_by', targetKey: 'user_id', as: 'bonusApprover' });

// PayrollRun associations
Company.hasMany(PayrollRun, { foreignKey: 'company_id', sourceKey: 'company_id', as: 'payrollRuns' });
PayrollRun.belongsTo(Company, { foreignKey: 'company_id', targetKey: 'company_id', as: 'company' });

User.hasMany(PayrollRun, { foreignKey: 'created_by', sourceKey: 'user_id', as: 'createdPayrollRuns' });
PayrollRun.belongsTo(User, { foreignKey: 'created_by', targetKey: 'user_id', as: 'creator' });

User.hasMany(PayrollRun, { foreignKey: 'approved_by', sourceKey: 'user_id', as: 'approvedPayrollRuns' });
PayrollRun.belongsTo(User, { foreignKey: 'approved_by', targetKey: 'user_id', as: 'approver' });

PayrollRun.hasMany(PayrollRunDetail, { foreignKey: 'run_id', as: 'details' });
PayrollRunDetail.belongsTo(PayrollRun, { foreignKey: 'run_id', as: 'payrollRun' });

// PayrollRunDetail associations
User.hasMany(PayrollRunDetail, { foreignKey: 'user_id', sourceKey: 'user_id', as: 'payrollRunDetails' });
PayrollRunDetail.belongsTo(User, { foreignKey: 'user_id', targetKey: 'user_id', as: 'user' });

PayrollRunDetail.belongsTo(UserPayrollAssignment, { foreignKey: 'assignment_id', as: 'assignment' });
UserPayrollAssignment.hasMany(PayrollRunDetail, { foreignKey: 'assignment_id', as: 'runDetails' });

PayrollRunDetail.hasMany(PayrollRunConceptDetail, { foreignKey: 'detail_id', as: 'concepts' });
PayrollRunConceptDetail.belongsTo(PayrollRunDetail, { foreignKey: 'detail_id', as: 'runDetail' });

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

// AponntStaff - Auto-relación (jerarquía organizacional)
AponntStaff.belongsTo(AponntStaff, { foreignKey: 'reports_to_staff_id', as: 'supervisor' });
AponntStaff.hasMany(AponntStaff, { foreignKey: 'reports_to_staff_id', as: 'subordinates' });

// AponntStaff <-> AponntStaffRole (rol organizacional)
AponntStaff.belongsTo(AponntStaffRole, { foreignKey: 'role_id', as: 'role' });
AponntStaffRole.hasMany(AponntStaff, { foreignKey: 'role_id', as: 'staff_members' });

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

// VendorStatistics - Estadísticas consolidadas de vendedores
VendorStatistics.belongsTo(AponntStaff, { foreignKey: 'vendor_id', as: 'vendor' });
AponntStaff.hasOne(VendorStatistics, { foreignKey: 'vendor_id', as: 'statistics' });

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

// =========================================================================
// ✅ ASOCIACIONES - Sistema de TABs 2-9 Modal Ver Usuario (Persistencia)
// =========================================================================

// TAB 2: Datos Personales - Driver Licenses
User.hasMany(UserDriverLicense, { foreignKey: 'userId', sourceKey: 'user_id', as: 'driverLicenses' });
UserDriverLicense.belongsTo(User, { foreignKey: 'userId', targetKey: 'user_id', as: 'user' });

// TAB 2: Datos Personales - Professional Licenses
User.hasMany(UserProfessionalLicense, { foreignKey: 'userId', sourceKey: 'user_id', as: 'professionalLicenses' });
UserProfessionalLicense.belongsTo(User, { foreignKey: 'userId', targetKey: 'user_id', as: 'user' });

// TAB 3: Antecedentes Laborales - Legal Issues
User.hasMany(UserLegalIssue, { foreignKey: 'userId', sourceKey: 'user_id', as: 'legalIssues' });
UserLegalIssue.belongsTo(User, { foreignKey: 'userId', targetKey: 'user_id', as: 'user' });

// TAB 3: Antecedentes Laborales - Union Affiliations
User.hasMany(UserUnionAffiliation, { foreignKey: 'userId', sourceKey: 'user_id', as: 'unionAffiliations' });
UserUnionAffiliation.belongsTo(User, { foreignKey: 'userId', targetKey: 'user_id', as: 'user' });

// TAB 8: Config. Tareas - Company Tasks (multi-tenant)
Company.hasMany(CompanyTask, { foreignKey: 'companyId', sourceKey: 'company_id', as: 'companyTasks' });
CompanyTask.belongsTo(Company, { foreignKey: 'companyId', targetKey: 'company_id', as: 'company' });

User.hasMany(CompanyTask, { foreignKey: 'createdBy', sourceKey: 'user_id', as: 'createdTasks' });
CompanyTask.belongsTo(User, { foreignKey: 'createdBy', targetKey: 'user_id', as: 'creator' });

// TAB 8: Config. Tareas - User Assigned Tasks
CompanyTask.hasMany(UserAssignedTask, { foreignKey: 'taskId', as: 'assignments' });
UserAssignedTask.belongsTo(CompanyTask, { foreignKey: 'taskId', as: 'task' });

User.hasMany(UserAssignedTask, { foreignKey: 'userId', sourceKey: 'user_id', as: 'assignedTasks' });
UserAssignedTask.belongsTo(User, { foreignKey: 'userId', targetKey: 'user_id', as: 'user' });

// TAB 8: Config. Tareas - User Salary Configuration (multi-tenant)
User.hasOne(UserSalaryConfig, { foreignKey: 'userId', sourceKey: 'user_id', as: 'salaryConfig' });
UserSalaryConfig.belongsTo(User, { foreignKey: 'userId', targetKey: 'user_id', as: 'user' });

Company.hasMany(UserSalaryConfig, { foreignKey: 'companyId', sourceKey: 'company_id', as: 'salaryConfigs' });
UserSalaryConfig.belongsTo(Company, { foreignKey: 'companyId', targetKey: 'company_id', as: 'company' });

// =========================================================================
// ✅ ASOCIACIONES - Sistema de Attendance Analytics (Scoring + Patrones)
// =========================================================================

// AttendanceProfile associations
User.hasOne(AttendanceProfile, { foreignKey: 'user_id', sourceKey: 'user_id', as: 'attendanceProfile' });
AttendanceProfile.belongsTo(User, { foreignKey: 'user_id', targetKey: 'user_id', as: 'user' });

Company.hasMany(AttendanceProfile, { foreignKey: 'company_id', sourceKey: 'company_id', as: 'attendanceProfiles' });
AttendanceProfile.belongsTo(Company, { foreignKey: 'company_id', targetKey: 'company_id', as: 'company' });

Department.hasMany(AttendanceProfile, { foreignKey: 'department_id', as: 'attendanceProfiles' });
AttendanceProfile.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });

Shift.hasMany(AttendanceProfile, { foreignKey: 'shift_id', as: 'attendanceProfiles' });
AttendanceProfile.belongsTo(Shift, { foreignKey: 'shift_id', as: 'shift' });

Branch.hasMany(AttendanceProfile, { foreignKey: 'branch_id', as: 'attendanceProfiles' });
AttendanceProfile.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });

// AttendancePattern associations
User.hasMany(AttendancePattern, { foreignKey: 'user_id', sourceKey: 'user_id', as: 'attendancePatterns' });
AttendancePattern.belongsTo(User, { foreignKey: 'user_id', targetKey: 'user_id', as: 'user' });

Company.hasMany(AttendancePattern, { foreignKey: 'company_id', sourceKey: 'company_id', as: 'attendancePatterns' });
AttendancePattern.belongsTo(Company, { foreignKey: 'company_id', targetKey: 'company_id', as: 'company' });

User.hasMany(AttendancePattern, { foreignKey: 'action_taken_by', sourceKey: 'user_id', as: 'patternsActionsBy' });
AttendancePattern.belongsTo(User, { foreignKey: 'action_taken_by', targetKey: 'user_id', as: 'actionTaker' });

// ScoringHistory associations
User.hasMany(ScoringHistory, { foreignKey: 'user_id', sourceKey: 'user_id', as: 'scoringHistory' });
ScoringHistory.belongsTo(User, { foreignKey: 'user_id', targetKey: 'user_id', as: 'user' });

Company.hasMany(ScoringHistory, { foreignKey: 'company_id', sourceKey: 'company_id', as: 'scoringHistory' });
ScoringHistory.belongsTo(Company, { foreignKey: 'company_id', targetKey: 'company_id', as: 'company' });

// AttendanceAnalyticsCache associations
Company.hasMany(AttendanceAnalyticsCache, { foreignKey: 'company_id', sourceKey: 'company_id', as: 'analyticsCache' });
AttendanceAnalyticsCache.belongsTo(Company, { foreignKey: 'company_id', targetKey: 'company_id', as: 'company' });

// ComparativeAnalytics associations
Company.hasMany(ComparativeAnalytics, { foreignKey: 'company_id', sourceKey: 'company_id', as: 'comparativeAnalytics' });
ComparativeAnalytics.belongsTo(Company, { foreignKey: 'company_id', targetKey: 'company_id', as: 'company' });

module.exports = {
  sequelize,
  Sequelize,
  User,
  Attendance,
  Shift,
  Branch,
  Holiday,
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
  // ✅ EXPORTS - Sistema de Staff Aponnt Multi-País
  AponntStaffRole,
  AponntStaff,
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

  // ✅ EXPORT - Sistema de Turnos Rotativos
  UserShiftAssignment,

  // Vendor Invoicing System
  Quote,
  ModuleTrial,
  Contract,

  // ✅ EXPORTS - TABs 2-9 Modal Ver Usuario (Persistencia Completa)
  UserDriverLicense,
  UserProfessionalLicense,
  UserLegalIssue,
  UserUnionAffiliation,
  CompanyTask,
  UserAssignedTask,
  UserSalaryConfig,
  // ✅ EXPORT - Sistema de Auditoría de Cambios de Usuarios
  UserAuditLog,

  // ✅ EXPORT - Sistema de Roles Adicionales (Bombero, Capacitador, Auditor, etc.)
  AdditionalRoleType,

  // ✅ EXPORTS - Sistema de Attendance Analytics (Scoring + Patrones + OLAP)
  AttendanceProfile,
  AttendancePattern,
  ScoringHistory,
  AttendanceAnalyticsCache,
  ComparativeAnalytics,

  // ✅ EXPORTS - Sistema Médico Avanzado (Antropométricos, Cirugías, Psiquiatría, Deportes)
  UserAnthropometricData,
  ChronicConditionsCatalog,
  UserChronicConditionsV2,
  UserSurgeries,
  UserPsychiatricTreatments,
  SportsCatalog,
  UserSportsActivities,
  UserHealthyHabits,

  // ✅ EXPORTS - Sistema Salarial Avanzado (Convenios, Categorías, Payroll)
  LaborAgreementsCatalog,
  SalaryCategories,
  UserSalaryConfigV2,
  UserPayrollRecords,

  // ✅ EXPORTS - Sistema de Liquidación Parametrizable v3.0 (Multi-País, Multi-Sucursal)
  PayrollCountry,
  CompanyBranch,
  LaborAgreementV2,
  PayrollConceptType,
  PayrollTemplate,
  PayrollTemplateConcept,
  SalaryCategoryV2,
  UserPayrollAssignment,
  UserPayrollConceptOverride,
  UserPayrollBonus,
  PayrollRun,
  PayrollRunDetail,
  PayrollRunConceptDetail,

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