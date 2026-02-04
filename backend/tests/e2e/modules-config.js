/**
 * ═══════════════════════════════════════════════════════════════════════
 * MODULES CONFIGURATION - 36 Módulos Comerciales de Panel Empresa
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Configuración para testing CRUD completo de cada módulo.
 *
 * Para cada módulo se define:
 * - key: Identificador único del módulo
 * - name: Nombre legible
 * - tableName: Tabla PostgreSQL donde se guardan los datos
 * - routeFile: Archivo de rutas en src/routes/
 * - modelFile: Archivo de modelo en src/models/
 * - menuText: Texto que aparece en el menú para navegar
 * - createButtonText: Texto del botón para crear nuevo registro
 * - formFields: Campos a llenar al CREAR (field: value)
 * - updateFields: Campos a CAMBIAR al EDITAR (field: newValue)
 * - uniqueField: Campo único para identificar el registro en BD
 */

// Helper para generar timestamp único
const timestamp = () => Date.now();

// ═══════════════════════════════════════════════════════════════════════
// 🔵 MÓDULOS CORE (9) - Incluidos en paquete base
// ═══════════════════════════════════════════════════════════════════════

const coreModules = [
  {
    key: 'users',
    name: 'Gestión de Usuarios',
    tableName: 'users',
    routeFile: 'users.js',
    modelFile: 'User.js',
    menuText: 'Usuarios',
    createButtonText: 'Agregar Usuario',
    formFields: {
      newUserName: `Usuario Test ${timestamp()}`,
      newUserEmail: `test${timestamp()}@test.com`,
      newUserLegajo: `EMP${timestamp()}`,
      newUserPassword: '123456',
      newUserRole: 'employee'
      // newUserDept: '' - Skip, puede ser vacío
    },
    updateFields: {
      newUserName: 'Usuario Test Updated'
    },
    uniqueField: 'email'
  },

  {
    key: 'attendance',
    name: 'Control de Asistencia',
    tableName: 'attendance',
    routeFile: 'attendance.js',
    modelFile: 'Attendance.js',
    menuText: 'Asistencia',
    createButtonText: 'Registrar Asistencia',
    formFields: {
      fecha: new Date().toISOString().split('T')[0],
      tipo: 'entrada',
      observaciones: `Test asistencia ${timestamp()}`
    },
    updateFields: {
      observaciones: 'Asistencia actualizada'
    },
    uniqueField: 'id'
  },

  {
    key: 'organizational-structure',
    name: 'Estructura Organizacional',
    tableName: 'departments', // Tabla principal
    routeFile: 'organizationalStructure.js',
    modelFile: 'Department.js',
    menuText: 'Estructura Organizacional',
    createButtonText: 'Nuevo Departamento',
    formFields: {
      nombre: `Depto Test ${timestamp()}`,
      descripcion: 'Departamento de prueba',
      codigo: `DEPT${timestamp()}`
    },
    updateFields: {
      descripcion: 'Departamento actualizado'
    },
    uniqueField: 'nombre'
  },

  {
    key: 'kiosks',
    name: 'Kioscos Biométricos',
    tableName: 'kiosks',
    routeFile: 'kiosks.js',
    modelFile: 'Kiosk.js',
    menuText: 'Kioscos',
    createButtonText: 'Nuevo Kiosco',
    formFields: {
      nombre: `Kiosco Test ${timestamp()}`,
      ubicacion: 'Planta Baja',
      tipo: 'biometrico',
      activo: true
    },
    updateFields: {
      ubicacion: 'Planta Alta'
    },
    uniqueField: 'nombre'
  },

  {
    key: 'dms-dashboard',
    name: 'Gestión Documental (DMS)',
    tableName: 'documents',
    routeFile: 'dms.js',
    modelFile: 'Document.js',
    menuText: 'DMS',
    createButtonText: 'Nuevo Documento',
    formFields: {
      titulo: `Documento Test ${timestamp()}`,
      descripcion: 'Documento de prueba',
      tipo: 'general',
      estado: 'borrador'
    },
    updateFields: {
      estado: 'publicado'
    },
    uniqueField: 'titulo'
  },

  {
    key: 'notifications-enterprise',
    name: 'Centro de Notificaciones',
    tableName: 'notifications',
    routeFile: 'notifications.js',
    modelFile: 'Notification.js',
    menuText: 'Notificaciones',
    createButtonText: 'Nueva Notificación',
    formFields: {
      titulo: `Notificación Test ${timestamp()}`,
      mensaje: 'Mensaje de prueba',
      tipo: 'info',
      destinatarios: 'todos'
    },
    updateFields: {
      tipo: 'urgente'
    },
    uniqueField: 'titulo'
  },

  {
    key: 'biometric-consent',
    name: 'Consentimientos Biométricos',
    tableName: 'biometric_consents',
    routeFile: 'biometricConsent.js',
    modelFile: 'BiometricConsent.js',
    menuText: 'Consentimientos',
    createButtonText: 'Nuevo Consentimiento',
    formFields: {
      employee_id: 1,
      tipo: 'huella',
      estado: 'pendiente',
      fecha: new Date().toISOString().split('T')[0]
    },
    updateFields: {
      estado: 'aprobado'
    },
    uniqueField: 'id'
  },

  {
    key: 'support',
    name: 'Soporte al Usuario',
    tableName: 'support_tickets',
    routeFile: 'support.js',
    modelFile: 'SupportTicket.js',
    menuText: 'Soporte',
    createButtonText: 'Nuevo Ticket',
    formFields: {
      asunto: `Ticket Test ${timestamp()}`,
      descripcion: 'Descripción del problema',
      prioridad: 'media',
      estado: 'abierto'
    },
    updateFields: {
      estado: 'en_proceso'
    },
    uniqueField: 'asunto'
  },

  {
    key: 'employee-360',
    name: 'Empleado 360°',
    tableName: 'employee_profiles',
    routeFile: 'employee360.js',
    modelFile: 'EmployeeProfile.js',
    menuText: 'Empleado 360',
    createButtonText: 'Nuevo Perfil',
    formFields: {
      nombre: `Empleado Test ${timestamp()}`,
      puesto: 'Analista',
      departamento: 'TI',
      fecha_ingreso: new Date().toISOString().split('T')[0]
    },
    updateFields: {
      puesto: 'Senior Analista'
    },
    uniqueField: 'nombre'
  }
];

// ═══════════════════════════════════════════════════════════════════════
// 🟢 MÓDULOS OPCIONALES (27) - Venta individual
// ═══════════════════════════════════════════════════════════════════════

const optionalModules = [
  {
    key: 'vacation-management',
    name: 'Gestión de Vacaciones',
    tableName: 'vacations',
    routeFile: 'vacationManagement.js',
    modelFile: 'Vacation.js',
    menuText: 'Vacaciones',
    createButtonText: 'Nueva Solicitud',
    formFields: {
      empleado_id: 1,
      fecha_inicio: new Date().toISOString().split('T')[0],
      fecha_fin: new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0],
      dias: 7,
      estado: 'pendiente'
    },
    updateFields: {
      estado: 'aprobado'
    },
    uniqueField: 'id'
  },

  {
    key: 'medical',
    name: 'Gestión Médica',
    tableName: 'medical_records',
    routeFile: 'medical.js',
    modelFile: 'MedicalRecord.js',
    menuText: 'Médico',
    createButtonText: 'Nuevo Registro',
    formFields: {
      empleado_id: 1,
      tipo: 'examen',
      fecha: new Date().toISOString().split('T')[0],
      diagnostico: `Test médico ${timestamp()}`,
      estado: 'activo'
    },
    updateFields: {
      diagnostico: 'Diagnóstico actualizado'
    },
    uniqueField: 'id'
  },

  {
    key: 'payroll-liquidation',
    name: 'Liquidación de Sueldos',
    tableName: 'payroll',
    routeFile: 'payroll.js',
    modelFile: 'Payroll.js',
    menuText: 'Liquidación',
    createButtonText: 'Nueva Liquidación',
    formFields: {
      periodo: new Date().toISOString().slice(0, 7), // YYYY-MM
      tipo: 'mensual',
      estado: 'borrador',
      total: 0
    },
    updateFields: {
      estado: 'procesado'
    },
    uniqueField: 'id'
  },

  {
    key: 'training-management',
    name: 'Gestión de Capacitaciones',
    tableName: 'training',
    routeFile: 'training.js',
    modelFile: 'Training.js',
    menuText: 'Capacitaciones',
    createButtonText: 'Nueva Capacitación',
    formFields: {
      titulo: `Capacitación Test ${timestamp()}`,
      descripcion: 'Curso de prueba',
      fecha_inicio: new Date().toISOString().split('T')[0],
      duracion_horas: 8,
      estado: 'planificado'
    },
    updateFields: {
      estado: 'en_curso'
    },
    uniqueField: 'titulo'
  },

  {
    key: 'art-management',
    name: 'Gestión ART',
    tableName: 'art_cases',
    routeFile: 'art.js',
    modelFile: 'ARTCase.js',
    menuText: 'ART',
    createButtonText: 'Nuevo Caso',
    formFields: {
      empleado_id: 1,
      tipo: 'accidente',
      fecha: new Date().toISOString().split('T')[0],
      descripcion: `Caso ART test ${timestamp()}`,
      estado: 'abierto'
    },
    updateFields: {
      estado: 'en_tratamiento'
    },
    uniqueField: 'id'
  },

  {
    key: 'sanctions-management',
    name: 'Gestión de Sanciones',
    tableName: 'sanctions',
    routeFile: 'sanctions.js',
    modelFile: 'Sanction.js',
    menuText: 'Sanciones',
    createButtonText: 'Nueva Sanción',
    formFields: {
      empleado_id: 1,
      tipo: 'amonestacion',
      fecha: new Date().toISOString().split('T')[0],
      motivo: `Sanción test ${timestamp()}`,
      estado: 'activa'
    },
    updateFields: {
      estado: 'archivada'
    },
    uniqueField: 'id'
  },

  {
    key: 'hour-bank',
    name: 'Banco de Horas',
    tableName: 'hour_bank',
    routeFile: 'hourBank.js',
    modelFile: 'HourBank.js',
    menuText: 'Banco de Horas',
    createButtonText: 'Nuevo Registro',
    formFields: {
      empleado_id: 1,
      fecha: new Date().toISOString().split('T')[0],
      horas: 8,
      tipo: 'credito',
      concepto: `Registro test ${timestamp()}`
    },
    updateFields: {
      horas: 10
    },
    uniqueField: 'id'
  },

  {
    key: 'benefits-management',
    name: 'Gestión de Beneficios',
    tableName: 'benefits',
    routeFile: 'benefits.js',
    modelFile: 'Benefit.js',
    menuText: 'Beneficios',
    createButtonText: 'Nuevo Beneficio',
    formFields: {
      nombre: `Beneficio Test ${timestamp()}`,
      descripcion: 'Beneficio de prueba',
      tipo: 'monetario',
      valor: 1000,
      estado: 'activo'
    },
    updateFields: {
      valor: 1500
    },
    uniqueField: 'nombre'
  },

  {
    key: 'job-postings',
    name: 'Búsquedas Laborales',
    tableName: 'job_postings',
    routeFile: 'jobPostings.js',
    modelFile: 'JobPosting.js',
    menuText: 'Búsquedas',
    createButtonText: 'Nueva Búsqueda',
    formFields: {
      titulo: `Búsqueda Test ${timestamp()}`,
      descripcion: 'Descripción del puesto',
      departamento: 'TI',
      vacantes: 1,
      estado: 'abierto'
    },
    updateFields: {
      vacantes: 2
    },
    uniqueField: 'titulo'
  },

  {
    key: 'procurement-management',
    name: 'Gestión de Compras',
    tableName: 'procurement',
    routeFile: 'procurement.js',
    modelFile: 'Procurement.js',
    menuText: 'Compras',
    createButtonText: 'Nueva Compra',
    formFields: {
      descripcion: `Compra Test ${timestamp()}`,
      proveedor: 'Proveedor Test',
      monto: 1000,
      estado: 'pendiente',
      fecha: new Date().toISOString().split('T')[0]
    },
    updateFields: {
      estado: 'aprobado'
    },
    uniqueField: 'id'
  },

  {
    key: 'visitors',
    name: 'Control de Visitantes',
    tableName: 'visitors',
    routeFile: 'visitors.js',
    modelFile: 'Visitor.js',
    menuText: 'Visitantes',
    createButtonText: 'Nuevo Visitante',
    formFields: {
      nombre: `Visitante Test ${timestamp()}`,
      documento: `DNI${timestamp()}`,
      empresa: 'Empresa Test',
      motivo: 'Reunión',
      fecha: new Date().toISOString().split('T')[0]
    },
    updateFields: {
      motivo: 'Reunión actualizada'
    },
    uniqueField: 'documento'
  },

  {
    key: 'admin-finance-dashboard',
    name: 'Dashboard Finanzas',
    tableName: 'financial_transactions',
    routeFile: 'finance.js',
    modelFile: 'FinancialTransaction.js',
    menuText: 'Finanzas',
    createButtonText: 'Nueva Transacción',
    formFields: {
      tipo: 'ingreso',
      monto: 1000,
      concepto: `Transacción test ${timestamp()}`,
      fecha: new Date().toISOString().split('T')[0],
      categoria: 'operativo'
    },
    updateFields: {
      monto: 1500
    },
    uniqueField: 'id'
  },

  {
    key: 'warehouse-management',
    name: 'Gestión de Almacén',
    tableName: 'warehouse_items',
    routeFile: 'warehouse.js',
    modelFile: 'WarehouseItem.js',
    menuText: 'Almacén',
    createButtonText: 'Nuevo Item',
    formFields: {
      nombre: `Item Test ${timestamp()}`,
      codigo: `ITEM${timestamp()}`,
      cantidad: 10,
      ubicacion: 'A1',
      estado: 'disponible'
    },
    updateFields: {
      cantidad: 15
    },
    uniqueField: 'codigo'
  },

  {
    key: 'legal-dashboard',
    name: 'Dashboard Legal',
    tableName: 'legal_cases',
    routeFile: 'legal.js',
    modelFile: 'LegalCase.js',
    menuText: 'Legal',
    createButtonText: 'Nuevo Caso',
    formFields: {
      titulo: `Caso Legal Test ${timestamp()}`,
      tipo: 'laboral',
      estado: 'abierto',
      fecha_inicio: new Date().toISOString().split('T')[0],
      descripcion: 'Descripción del caso'
    },
    updateFields: {
      estado: 'en_proceso'
    },
    uniqueField: 'titulo'
  },

  {
    key: 'logistics-dashboard',
    name: 'Dashboard Logística',
    tableName: 'logistics',
    routeFile: 'logistics.js',
    modelFile: 'LogisticsOrder.js',
    menuText: 'Logística',
    createButtonText: 'Nueva Orden',
    formFields: {
      numero_orden: `ORD${timestamp()}`,
      origen: 'Depósito Central',
      destino: 'Sucursal Norte',
      estado: 'pendiente',
      fecha: new Date().toISOString().split('T')[0]
    },
    updateFields: {
      estado: 'en_transito'
    },
    uniqueField: 'numero_orden'
  },

  {
    key: 'procedures-manual',
    name: 'Manual de Procedimientos',
    tableName: 'procedures',
    routeFile: 'procedures.js',
    modelFile: 'Procedure.js',
    menuText: 'Procedimientos',
    createButtonText: 'Nuevo Procedimiento',
    formFields: {
      titulo: `Procedimiento Test ${timestamp()}`,
      descripcion: 'Descripción del procedimiento',
      categoria: 'operativo',
      version: '1.0',
      estado: 'borrador'
    },
    updateFields: {
      estado: 'publicado'
    },
    uniqueField: 'titulo'
  },

  {
    key: 'employee-map',
    name: 'Mapa de Empleados',
    tableName: 'employee_locations',
    routeFile: 'employeeMap.js',
    modelFile: 'EmployeeLocation.js',
    menuText: 'Mapa',
    createButtonText: 'Nueva Ubicación',
    formFields: {
      empleado_id: 1,
      ubicacion: 'Oficina Central',
      piso: '2',
      area: 'IT',
      fecha: new Date().toISOString().split('T')[0]
    },
    updateFields: {
      piso: '3'
    },
    uniqueField: 'id'
  },

  {
    key: 'marketplace',
    name: 'Marketplace Interno',
    tableName: 'marketplace_items',
    routeFile: 'marketplace.js',
    modelFile: 'MarketplaceItem.js',
    menuText: 'Marketplace',
    createButtonText: 'Nuevo Artículo',
    formFields: {
      titulo: `Artículo Test ${timestamp()}`,
      descripcion: 'Descripción del artículo',
      precio: 100,
      categoria: 'general',
      estado: 'disponible'
    },
    updateFields: {
      precio: 150
    },
    uniqueField: 'titulo'
  },

  {
    key: 'my-procedures',
    name: 'Mis Trámites',
    tableName: 'employee_procedures',
    routeFile: 'myProcedures.js',
    modelFile: 'EmployeeProcedure.js',
    menuText: 'Mis Trámites',
    createButtonText: 'Nuevo Trámite',
    formFields: {
      tipo: 'solicitud',
      descripcion: `Trámite test ${timestamp()}`,
      estado: 'iniciado',
      fecha: new Date().toISOString().split('T')[0]
    },
    updateFields: {
      estado: 'en_proceso'
    },
    uniqueField: 'id'
  },

  {
    key: 'audit-reports',
    name: 'Reportes de Auditoría',
    tableName: 'audit_reports',
    routeFile: 'auditReports.js',
    modelFile: 'AuditReport.js',
    menuText: 'Auditoría',
    createButtonText: 'Nuevo Reporte',
    formFields: {
      titulo: `Reporte Auditoría ${timestamp()}`,
      tipo: 'interno',
      periodo: new Date().toISOString().slice(0, 7),
      estado: 'borrador',
      auditor: 'Admin'
    },
    updateFields: {
      estado: 'finalizado'
    },
    uniqueField: 'titulo'
  },

  {
    key: 'compliance-dashboard',
    name: 'Dashboard de Cumplimiento',
    tableName: 'compliance_items',
    routeFile: 'compliance.js',
    modelFile: 'ComplianceItem.js',
    menuText: 'Cumplimiento',
    createButtonText: 'Nuevo Item',
    formFields: {
      normativa: `Norma Test ${timestamp()}`,
      descripcion: 'Descripción de la norma',
      estado: 'pendiente',
      fecha_limite: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0]
    },
    updateFields: {
      estado: 'cumplido'
    },
    uniqueField: 'normativa'
  },

  {
    key: 'sla-tracking',
    name: 'Seguimiento de SLAs',
    tableName: 'sla_tracking',
    routeFile: 'sla.js',
    modelFile: 'SLATracking.js',
    menuText: 'SLAs',
    createButtonText: 'Nuevo SLA',
    formFields: {
      servicio: `Servicio Test ${timestamp()}`,
      objetivo: '99.9',
      periodo: 'mensual',
      estado: 'activo',
      responsable: 'Admin'
    },
    updateFields: {
      objetivo: '99.5'
    },
    uniqueField: 'servicio'
  },

  {
    key: 'hse-management',
    name: 'Gestión de HSE',
    tableName: 'hse_incidents',
    routeFile: 'hse.js',
    modelFile: 'HSEIncident.js',
    menuText: 'HSE',
    createButtonText: 'Nuevo Incidente',
    formFields: {
      tipo: 'accidente',
      descripcion: `Incidente HSE ${timestamp()}`,
      gravedad: 'leve',
      fecha: new Date().toISOString().split('T')[0],
      estado: 'reportado'
    },
    updateFields: {
      estado: 'investigado'
    },
    uniqueField: 'id'
  },

  {
    key: 'emotional-analysis',
    name: 'Análisis Emocional',
    tableName: 'emotional_surveys',
    routeFile: 'emotionalAnalysis.js',
    modelFile: 'EmotionalSurvey.js',
    menuText: 'Análisis Emocional',
    createButtonText: 'Nueva Encuesta',
    formFields: {
      titulo: `Encuesta Test ${timestamp()}`,
      tipo: 'clima_laboral',
      estado: 'activa',
      fecha_inicio: new Date().toISOString().split('T')[0],
      fecha_fin: new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0]
    },
    updateFields: {
      estado: 'cerrada'
    },
    uniqueField: 'titulo'
  },

  {
    key: 'siac-commercial-dashboard',
    name: 'Dashboard Comercial SIAC',
    tableName: 'commercial_activities',
    routeFile: 'siacCommercial.js',
    modelFile: 'CommercialActivity.js',
    menuText: 'SIAC',
    createButtonText: 'Nueva Actividad',
    formFields: {
      tipo: 'venta',
      descripcion: `Actividad comercial ${timestamp()}`,
      monto: 1000,
      cliente: 'Cliente Test',
      estado: 'prospecto'
    },
    updateFields: {
      estado: 'cerrado'
    },
    uniqueField: 'id'
  },

  {
    key: 'voice-platform',
    name: 'Plataforma de Voz',
    tableName: 'voice_recordings',
    routeFile: 'voicePlatform.js',
    modelFile: 'VoiceRecording.js',
    menuText: 'Voz',
    createButtonText: 'Nueva Grabación',
    formFields: {
      titulo: `Grabación Test ${timestamp()}`,
      duracion: 120,
      tipo: 'mensaje',
      estado: 'procesado',
      fecha: new Date().toISOString().split('T')[0]
    },
    updateFields: {
      duracion: 180
    },
    uniqueField: 'titulo'
  }
];

// ═══════════════════════════════════════════════════════════════════════
// EXPORTAR TODOS LOS MÓDULOS (36 TOTAL)
// ═══════════════════════════════════════════════════════════════════════

const allModules = [...coreModules, ...optionalModules];

console.log(`\n📊 MÓDULOS CONFIGURADOS: ${allModules.length}`);
console.log(`   🔵 CORE: ${coreModules.length}`);
console.log(`   🟢 OPCIONALES: ${optionalModules.length}\n`);

module.exports = {
  coreModules,
  optionalModules,
  allModules
};
