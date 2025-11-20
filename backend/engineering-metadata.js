/**
 * ============================================================================
 * ENGINEERING METADATA - SINGLE SOURCE OF TRUTH
 * ============================================================================
 *
 * Este archivo ES LA FUENTE DE VERDAD del sistema completo.
 *
 * ⚠️ REGLAS CRÍTICAS:
 * 1. Claude Code DEBE leer este archivo SIEMPRE antes de hacer cambios
 * 2. Se actualiza con CADA feature completada
 * 3. Es consumido por el Engineering Dashboard (UI 3D interactiva)
 * 4. NO duplicar información - este archivo es la referencia única
 * 5. Actualizar lastUpdated al modificar cualquier sección
 *
 * 🎯 PARA CLAUDE CODE:
 * - Antes de crear código nuevo: verificar si ya existe aquí
 * - Antes de modificar: chequear dependencies y knownIssues
 * - Después de completar: actualizar status y progress
 * - Si algo no está claro: revisar designDoc de la feature
 *
 * 🎯 PARA HUMANOS:
 * - Abrir panel-administrativo → Tab "🏗️ Ingeniería"
 * - Vista 3D interactiva con drill-down
 * - Gantt charts, progress bars, dependency graphs
 *
 * ============================================================================
 */

module.exports = {
  // ==================== METADATA DEL PROYECTO ====================
  project: {
    name: "Sistema de Asistencia Biométrico Aponnt",
    version: "2.0.0-beta",
    architecture: "Modular Monolith Multi-Tenant",
    startDate: "2024-01-01",
    currentPhase: "DEVELOPMENT",
    totalProgress: 45, // % global del proyecto
    lastUpdated: "2025-01-19T23:30:00Z", // Secciones help agregadas a workflows
    latestChanges: [
      "✅ Secciones help agregadas a los 6 workflows (quickStart, commonIssues, requiredRoles, etc.)",
      "✅ Engineering Dashboard 3D creado e integrado",
      "✅ Arquitectura completa ERP Comisiones diseñada (ARQUITECTURA-COMPLETA-ERP-COMISIONES.md)",
      "✅ 6 workflows críticos completamente detallados (10 pasos c/u)",
      "✅ Sistema de notificaciones separado: aponnt_external_notifications (nuevo)",
      "✅ Diseño de tablas: wallet_change_requests, commission_liquidations, bank_transfers, etc."
    ]
  },

  // ==================== STACK TECNOLÓGICO ====================
  techStack: {
    backend: {
      runtime: "Node.js 18+",
      framework: "Express.js 4.x",
      orm: "Sequelize 6.x",
      database: "PostgreSQL 14+",
      authentication: "JWT + bcrypt",
      realtime: "Socket.io (WebSockets)",
      jobScheduler: "node-cron",
      email: "Nodemailer + SendGrid/SMTP",
      fileStorage: "Local filesystem (uploads/)",
      ai: "Ollama + Llama 3.1 (8B) - Local LLM"
    },
    frontend: {
      panelAdmin: "Vanilla JS + HTML5 + CSS3",
      panelEmpresa: "Vanilla JS + HTML5 + CSS3",
      uiLibraries: "None (custom components)",
      charts: "Chart.js",
      icons: "Emoji + Font Awesome",
      stateManagement: "localStorage + fetch API"
    },
    mobile: {
      kioskApp: {
        platform: "Android (Java/Kotlin)",
        minSDK: "21 (Android 5.0)",
        features: ["Camera", "NFC", "Biometric", "GPS"],
        status: "PRODUCTION"
      },
      employeeApp: {
        platform: "Android + iOS",
        framework: "PENDING_DECISION",
        status: "PLANNED"
      },
      vendorApp: {
        platform: "Android + iOS",
        framework: "PENDING_DECISION",
        status: "PLANNED"
      },
      partnerApp: {
        platform: "Android + iOS",
        framework: "PENDING_DECISION",
        status: "PLANNED"
      }
    },
    infrastructure: {
      os: "Windows Server / Linux",
      webServer: "Node.js built-in (Express)",
      reverseProxy: "OPTIONAL (Nginx/Apache)",
      ssl: "Let's Encrypt",
      backup: "Manual (pg_dump)"
    }
  },

  // ==================== APLICACIONES DEL ECOSISTEMA ====================
  applications: {
    // ============ WEB APPLICATIONS ============
    panelAdministrativo: {
      name: "Panel Administrativo Aponnt",
      type: "WEB_APP",
      platform: "Web (Desktop)",
      url: "http://localhost:9998/panel-administrativo.html",
      purpose: "Gestión comercial y soporte de la plataforma Aponnt",
      users: ["CEO", "Gerentes Regionales", "Supervisores", "Líderes", "Vendedores", "Soporte", "Admin"],
      status: "IN_PROGRESS",
      progress: 60,
      phase: "DEVELOPMENT",

      features: {
        empresas: {
          name: "Gestión de Empresas",
          status: "COMPLETE",
          progress: 95,
          subfeatures: {
            crud: { done: true, tested: true },
            modulesConfig: { done: true, tested: true },
            licenseTypes: { done: true, tested: true },
            commissionCalc: { done: true, tested: false }, // ← NUEVO esta sesión
            vendorAssignment: { done: true, tested: false } // ← NUEVO esta sesión
          }
        },
        vendedores: {
          name: "Gestión de Vendedores y Jerarquía",
          status: "IN_PROGRESS",
          progress: 40,
          subfeatures: {
            crud: { done: true, tested: true },
            hierarchySelection: { done: false, inProgress: true }, // ← PENDIENTE esta sesión
            commissionTracking: { done: false, inProgress: false }, // ← PENDIENTE esta sesión
            statsView: { done: false, inProgress: false } // ← PENDIENTE esta sesión
          }
        },
        presupuestos: {
          name: "Sistema de Presupuestos",
          status: "PLANNED",
          progress: 0,
          designDoc: "ARQUITECTURA-COMPLETA-ERP-COMISIONES.md"
        },
        contratos: {
          name: "Sistema de Contratos",
          status: "PLANNED",
          progress: 0,
          designDoc: "ARQUITECTURA-COMPLETA-ERP-COMISIONES.md"
        },
        facturacion: {
          name: "Facturación Automática",
          status: "PLANNED",
          progress: 0,
          designDoc: "ARQUITECTURA-COMPLETA-ERP-COMISIONES.md"
        },
        liquidaciones: {
          name: "Liquidación de Comisiones",
          status: "PLANNED",
          progress: 0,
          designDoc: "ARQUITECTURA-COMPLETA-ERP-COMISIONES.md"
        },
        cobranzas: {
          name: "Gestión de Cobranzas",
          status: "PLANNED",
          progress: 0,
          designDoc: "ARQUITECTURA-COMPLETA-ERP-COMISIONES.md"
        },
        partners: {
          name: "Gestión de Asociados (Partners)",
          status: "COMPLETE",
          progress: 100,
          description: "Médicos, abogados, ingenieros, etc."
        },
        dashboard: {
          name: "Dashboard Comercial",
          status: "COMPLETE",
          progress: 90
        },
        reportes: {
          name: "Reportes y Analytics",
          status: "PARTIAL",
          progress: 30
        }
      },

      files: [
        "backend/public/panel-administrativo.html",
        "backend/public/css/admin-modern.css",
        "backend/src/routes/aponntDashboard.js"
      ],

      dependencies: [
        "backend/src/models/AponntStaff.js",
        "backend/src/models/Company.js",
        "backend/src/models/VendorStatistics.js", // ← NUEVO esta sesión
        "backend/src/models/Partner.js"
      ],

      knownIssues: [
        "Sistema duplicado vendedores (aponnt_staff vs vendors.json) - migración pendiente",
        "Comisiones USD se calculan en frontend pero no se persisten en BD aún",
        "Falta implementar sistema de presupuestos completo",
        "Falta implementar flujo de contratos con firma digital"
      ],

      lastUpdated: "2025-01-19"
    },

    panelEmpresa: {
      name: "Panel Empresa (Clientes)",
      type: "WEB_APP",
      platform: "Web (Desktop + Mobile responsive)",
      url: "http://localhost:9998/panel-empresa.html",
      purpose: "Gestión interna de cada empresa cliente",
      users: ["Administradores de empresa", "RRHH", "Supervisores", "Operadores"],
      status: "PRODUCTION",
      progress: 85,
      phase: "PRODUCTION",

      features: {
        usuarios: {
          name: "Gestión de Usuarios (Empleados)",
          status: "COMPLETE",
          progress: 100,
          subfeatures: {
            crud: { done: true, tested: true },
            bulkImport: { done: true, tested: true },
            photoUpload: { done: true, tested: true },
            biometricEnrollment: { done: true, tested: true }
          }
        },
        asistencias: {
          name: "Módulo de Asistencias",
          status: "COMPLETE",
          progress: 100,
          subfeatures: {
            realtimeView: { done: true, tested: true },
            lateArrivalAuth: { done: true, tested: true },
            gpsValidation: { done: true, tested: true },
            reports: { done: true, tested: true }
          }
        },
        turnos: {
          name: "Gestión de Turnos",
          status: "COMPLETE",
          progress: 100
        },
        departamentos: {
          name: "Departamentos",
          status: "COMPLETE",
          progress: 100
        },
        medico: {
          name: "Módulo Médico",
          status: "COMPLETE",
          progress: 100,
          subfeatures: {
            examenes: { done: true, tested: true },
            certificados: { done: true, tested: true },
            expirations: { done: true, tested: true }
          }
        },
        vacaciones: {
          name: "Módulo Vacaciones",
          status: "COMPLETE",
          progress: 100
        },
        legal: {
          name: "Módulo Legal",
          status: "COMPLETE",
          progress: 100
        },
        documentos: {
          name: "Gestión de Documentos",
          status: "COMPLETE",
          progress: 90
        },
        notificaciones: {
          name: "Sistema de Notificaciones Enterprise",
          status: "COMPLETE",
          progress: 95,
          subfeatures: {
            workflows: { done: true, tested: true },
            multiChannel: { done: true, tested: false },
            escalation: { done: true, tested: true }
          }
        },
        aiAssistant: {
          name: "Asistente IA (Ollama + Llama 3.1)",
          status: "COMPLETE",
          progress: 100,
          description: "Chat flotante con RAG y auto-diagnóstico",
          technology: "Ollama + Llama 3.1 (8B) local"
        },
        auditor: {
          name: "Sistema de Auditoría y Auto-Diagnóstico",
          status: "COMPLETE",
          progress: 100,
          subfeatures: {
            autoTesting: { done: true, tested: true },
            autoHealing: { done: true, tested: true },
            dataSeeding: { done: true, tested: true }
          }
        }
      },

      files: [
        "backend/public/panel-empresa.html",
        "backend/public/js/modules/*.js"
      ],

      knownIssues: [],

      lastUpdated: "2025-01-19"
    },

    indexPage: {
      name: "Página de Inicio (Landing + Login)",
      type: "WEB_APP",
      platform: "Web",
      url: "http://localhost:9998/index.html",
      purpose: "Landing page y selector de login (Staff vs Empresa)",
      status: "COMPLETE",
      progress: 100,
      phase: "PRODUCTION",
      lastUpdated: "2025-01-19"
    },

    // ============ MOBILE APPLICATIONS ============
    apkKiosk: {
      name: "APK Kiosk Biométrico",
      type: "MOBILE_APP",
      platform: "Android",
      purpose: "Lectura biométrica, NFC, GPS para registro de asistencias",
      users: ["Sistema (auto-operado)", "Operadores de kiosko"],
      status: "PRODUCTION",
      progress: 100,
      phase: "PRODUCTION",

      features: {
        biometricScan: {
          name: "Escaneo Biométrico (Rostro)",
          status: "COMPLETE",
          progress: 100
        },
        nfcScan: {
          name: "Lectura NFC",
          status: "COMPLETE",
          progress: 100
        },
        gpsTracking: {
          name: "Validación GPS",
          status: "COMPLETE",
          progress: 100
        },
        offlineMode: {
          name: "Modo Offline",
          status: "COMPLETE",
          progress: 100,
          description: "Cola de sincronización cuando no hay internet"
        },
        photoCapture: {
          name: "Captura de Foto en Check-in",
          status: "COMPLETE",
          progress: 100
        }
      },

      techStack: {
        language: "Java/Kotlin",
        minSDK: "21",
        targetSDK: "33",
        libraries: ["CameraX", "ML Kit (Face Detection)", "Room (offline DB)", "Retrofit (HTTP)"]
      },

      files: [
        "EXTERNAL_REPO (kiosk-android-app/)"
      ],

      apiEndpoints: [
        "POST /api/v1/biometric/attendance",
        "POST /api/v1/kiosks/register",
        "GET /api/v1/kiosks/:id/config"
      ],

      knownIssues: [],

      lastUpdated: "2025-01-10"
    },

    apkEmpleados: {
      name: "APK Empleados",
      type: "MOBILE_APP",
      platform: "Android + iOS",
      purpose: "App para empleados: ver asistencias, solicitar vacaciones, subir certificados",
      users: ["Empleados de empresas clientes"],
      status: "PLANNED",
      progress: 0,
      phase: "DESIGN",

      plannedFeatures: {
        myAttendance: {
          name: "Mis Asistencias",
          description: "Ver historial de check-in/out, horas trabajadas, tardanzas"
        },
        vacationRequest: {
          name: "Solicitud de Vacaciones",
          description: "Pedir vacaciones y ver estado de aprobación"
        },
        certificateUpload: {
          name: "Subir Certificados Médicos",
          description: "Foto + justificación de ausencia"
        },
        notifications: {
          name: "Notificaciones Push",
          description: "Avisos de aprobaciones, recordatorios, alertas"
        },
        myProfile: {
          name: "Mi Perfil",
          description: "Ver datos personales, turno asignado, departamento"
        },
        documents: {
          name: "Mis Documentos",
          description: "Ver recibos, contratos, documentos legales"
        }
      },

      techStackProposal: {
        framework: "React Native OR Flutter",
        language: "JavaScript/TypeScript OR Dart",
        stateManagement: "Redux/Context OR Provider",
        networking: "Axios OR Dio"
      },

      estimatedEffort: "120-160 horas",
      priority: "HIGH",
      designDoc: "PENDING",
      lastUpdated: "2025-01-19"
    },

    apkVendedores: {
      name: "APK Vendedores/Soporte/Líderes",
      type: "MOBILE_APP",
      platform: "Android + iOS",
      purpose: "App para staff de Aponnt: ver comisiones, empresas asignadas, stats",
      users: ["Vendedores", "Líderes", "Supervisores", "Gerentes Regionales", "Soporte"],
      status: "PLANNED",
      progress: 0,
      phase: "DESIGN",

      plannedFeatures: {
        myCommissions: {
          name: "Mis Comisiones",
          description: "Ver comisiones directas + piramidales, histórico, proyecciones"
        },
        myCompanies: {
          name: "Mis Empresas",
          description: "Lista de empresas asignadas (venta + soporte)"
        },
        myTeam: {
          name: "Mi Equipo",
          description: "Ver subordinados, su performance, comisiones generadas"
        },
        notifications: {
          name: "Notificaciones",
          description: "Nuevas ventas, cambios en contratos, liquidaciones, confirmaciones de pago"
        },
        walletConfig: {
          name: "Configuración de Billetera",
          description: "Actualizar CBU/alias, solicitar cambio (con workflow de confirmación)"
        },
        budgetApproval: {
          name: "Aprobación de Presupuestos",
          description: "Aprobar/rechazar presupuestos enviados a clientes"
        },
        contractTracking: {
          name: "Seguimiento de Contratos",
          description: "Ver estado de contratos pendientes de firma"
        },
        liquidationHistory: {
          name: "Historial de Liquidaciones",
          description: "Ver todas las liquidaciones con trazabilidad completa"
        }
      },

      techStackProposal: {
        framework: "React Native OR Flutter",
        language: "JavaScript/TypeScript OR Dart"
      },

      estimatedEffort: "150-200 horas",
      priority: "HIGH",
      designDoc: "PENDING",
      lastUpdated: "2025-01-19"
    },

    apkAsociados: {
      name: "APK Asociados (Partners)",
      type: "MOBILE_APP",
      platform: "Android + iOS",
      purpose: "App para médicos, abogados, ingenieros, etc. asociados a Aponnt",
      users: ["Médicos", "Abogados", "Ingenieros", "Otros profesionales"],
      status: "PLANNED",
      progress: 0,
      phase: "DESIGN",

      plannedFeatures: {
        myServices: {
          name: "Mis Servicios Contratados",
          description: "Ver empresas que contrataron sus servicios"
        },
        appointments: {
          name: "Agenda de Citas",
          description: "Gestionar citas con empleados de empresas"
        },
        reports: {
          name: "Cargar Informes",
          description: "Subir certificados médicos, informes legales, etc."
        },
        invoicing: {
          name: "Facturación",
          description: "Ver facturas, pagos pendientes, historial"
        },
        notifications: {
          name: "Notificaciones",
          description: "Nuevas citas, recordatorios, pagos"
        }
      },

      techStackProposal: {
        framework: "React Native OR Flutter"
      },

      estimatedEffort: "80-120 horas",
      priority: "MEDIUM",
      designDoc: "PENDING",
      lastUpdated: "2025-01-19"
    }
  },

  // ==================== MÓDULOS DEL SISTEMA (BACKEND) ====================
  modules: {
    // ============ MÓDULOS CORE (PRODUCCIÓN) ============
    authentication: {
      name: "Autenticación y Autorización",
      category: "CORE",
      status: "PRODUCTION",
      progress: 100,
      phase: "PRODUCTION",

      features: {
        jwtAuth: { done: true, tested: true },
        roleBasedAccess: { done: true, tested: true },
        multiTenantIsolation: { done: true, tested: true },
        staffLogin: { done: true, tested: true },
        companyLogin: { done: true, tested: true },
        partnerLogin: { done: true, tested: true }
      },

      files: [
        "src/middleware/auth.js",
        "src/routes/auth.js",
        "public/js/modules/aponnt-login.js"
      ],

      tables: ["aponnt_staff", "users (company employees)", "partners"],

      apiEndpoints: [
        "POST /api/v1/auth/aponnt/staff/login",
        "POST /api/v1/auth/aponnt/partner/login",
        "POST /api/v1/auth/login (company employees)",
        "POST /api/v1/auth/refresh",
        "POST /api/v1/auth/logout"
      ],

      knownIssues: [],
      lastUpdated: "2025-01-15"
    },

    companies: {
      name: "Gestión de Empresas (Multi-Tenant Core)",
      category: "CORE",
      status: "IN_MIGRATION",
      progress: 80,
      phase: "DEVELOPMENT",

      features: {
        crud: { done: true, tested: true },
        modulesConfiguration: { done: true, tested: true },
        pricingCalculation: { done: true, tested: true },
        licenseTypes: { done: true, tested: true },
        vendorAssignment: { done: true, tested: false }, // ← NUEVO
        commissionCalculation: { done: false, inProgress: true } // ← NUEVO
      },

      pendingMigrations: [
        "ADD assigned_vendor_id UUID → aponnt_staff(id)",
        "ADD support_vendor_id UUID → aponnt_staff(id)",
        "ADD sales_commission_usd DECIMAL(12,2)",
        "ADD support_commission_usd DECIMAL(12,2)",
        "ADD created_by_staff_id UUID → aponnt_staff(id)"
      ],

      files: [
        "src/models/Company.js",
        "src/routes/aponntDashboard.js"
      ],

      tables: ["companies"],

      apiEndpoints: [
        "GET /api/aponnt/dashboard/companies",
        "POST /api/aponnt/dashboard/companies",
        "PUT /api/aponnt/dashboard/companies/:id",
        "DELETE /api/aponnt/dashboard/companies/:id"
      ],

      dependencies: ["aponnt_staff", "vendor_statistics"],

      knownIssues: [
        "Campos de comisión USD calculados en frontend pero no persistidos aún",
        "Falta filtrado por rol jerárquico en GET /companies"
      ],

      currentTask: "Migrar campos de comisiones y vendedores (ver PARA-BACKEND-IMPLEMENTACION-COMPLETA.md)",
      lastUpdated: "2025-01-19"
    },

    users: {
      name: "Gestión de Usuarios (Empleados de Empresas)",
      category: "CORE",
      status: "PRODUCTION",
      progress: 100,
      phase: "PRODUCTION",

      features: {
        crud: { done: true, tested: true },
        bulkImport: { done: true, tested: true },
        photoManagement: { done: true, tested: true },
        biometricEnrollment: { done: true, tested: true },
        departmentAssignment: { done: true, tested: true },
        shiftAssignment: { done: true, tested: true }
      },

      files: [
        "src/models/User-postgresql.js",
        "src/routes/userRoutes.js",
        "public/js/modules/users.js"
      ],

      tables: ["users"],

      apiEndpoints: [
        "GET /api/users",
        "POST /api/users",
        "PUT /api/users/:id",
        "DELETE /api/users/:id",
        "POST /api/users/bulk-import"
      ],

      knownIssues: [],
      lastUpdated: "2025-01-15"
    },

    attendance: {
      name: "Módulo de Asistencias",
      category: "CORE",
      status: "PRODUCTION",
      progress: 100,
      phase: "PRODUCTION",

      features: {
        biometricCheckin: { done: true, tested: true },
        gpsValidation: { done: true, tested: true },
        lateArrivalAuthorization: { done: true, tested: true },
        realtimeView: { done: true, tested: true },
        reports: { done: true, tested: true }
      },

      files: [
        "src/models/Attendance.js",
        "src/routes/attendanceRoutes.js",
        "public/js/modules/attendance.js"
      ],

      tables: ["attendance", "late_arrival_authorizations"],

      apiEndpoints: [
        "POST /api/v1/biometric/attendance",
        "GET /api/attendance",
        "POST /api/attendance/authorize-late"
      ],

      knownIssues: [],
      lastUpdated: "2025-01-10"
    },

    kiosks: {
      name: "Gestión de Kioscos",
      category: "CORE",
      status: "PRODUCTION",
      progress: 100,
      phase: "PRODUCTION",

      features: {
        crud: { done: true, tested: true },
        gpsConfiguration: { done: true, tested: true },
        offlineSync: { done: true, tested: true }
      },

      files: [
        "src/models/Kiosk.js",
        "src/routes/kioskRoutes.js"
      ],

      tables: ["kiosks"],

      knownIssues: [],
      lastUpdated: "2025-01-10"
    },

    // ============ MÓDULOS ENTERPRISE (PRODUCCIÓN/COMPLETO) ============
    notifications: {
      name: "Sistema de Notificaciones Enterprise",
      category: "ENTERPRISE",
      status: "PRODUCTION",
      progress: 95,
      phase: "PRODUCTION",

      features: {
        workflows: { done: true, tested: true },
        multiChannel: { done: true, tested: false },
        escalation: { done: true, tested: true },
        deadlines: { done: true, tested: true },
        reminders: { done: true, tested: true }
      },

      files: [
        "src/models/Notification.js",
        "src/models/NotificationWorkflow.js",
        "src/services/NotificationEnterpriseService.js",
        "src/services/AponntNotificationService.js",
        "public/js/modules/notifications-enterprise.js"
      ],

      tables: ["notifications", "notification_workflows", "notification_templates"],

      apiEndpoints: [
        "GET /api/notifications",
        "POST /api/notifications",
        "PUT /api/notifications/:id/mark-read",
        "POST /api/notifications/:id/action"
      ],

      knownIssues: [
        "Multi-canal (WhatsApp, SMS) implementado pero no testeado end-to-end"
      ],

      lastUpdated: "2025-01-15"
    },

    medical: {
      name: "Módulo Médico",
      category: "ENTERPRISE",
      status: "PRODUCTION",
      progress: 100,
      phase: "PRODUCTION",

      features: {
        exams: { done: true, tested: true },
        certificates: { done: true, tested: true },
        expirations: { done: true, tested: true },
        partnerIntegration: { done: true, tested: true }
      },

      files: [
        "src/models/MedicalExam.js",
        "src/routes/medicalRoutes.js",
        "public/js/modules/medical-dashboard.js"
      ],

      tables: ["medical_exams", "medical_certificates"],

      knownIssues: [],
      lastUpdated: "2025-01-10"
    },

    legal: {
      name: "Módulo Legal",
      category: "ENTERPRISE",
      status: "PRODUCTION",
      progress: 100,
      phase: "PRODUCTION",

      files: [
        "src/models/LegalIssue.js",
        "src/routes/legalRoutes.js",
        "public/js/modules/legal-dashboard.js"
      ],

      tables: ["legal_issues", "union_affiliations"],

      knownIssues: [],
      lastUpdated: "2025-01-10"
    },

    vacation: {
      name: "Módulo de Vacaciones",
      category: "ENTERPRISE",
      status: "PRODUCTION",
      progress: 100,
      phase: "PRODUCTION",

      files: [
        "src/models/Vacation.js",
        "src/routes/vacationRoutes.js",
        "public/js/modules/vacation-management.js"
      ],

      tables: ["vacations"],

      knownIssues: [],
      lastUpdated: "2025-01-10"
    },

    partners: {
      name: "Sistema de Asociados (Partners)",
      category: "ENTERPRISE",
      status: "PRODUCTION",
      progress: 100,
      phase: "PRODUCTION",

      description: "Médicos, abogados, ingenieros, etc. que proveen servicios a empresas",

      features: {
        crud: { done: true, tested: true },
        scoring: { done: true, tested: true },
        invoicing: { done: true, tested: true },
        notifications: { done: true, tested: true }
      },

      files: [
        "src/models/Partner.js",
        "src/routes/partnerRoutes.js",
        "public/js/modules/partners-admin.js"
      ],

      tables: ["partners", "partner_notifications", "partner_invoices"],

      knownIssues: [],
      lastUpdated: "2025-01-10"
    },

    aiAssistant: {
      name: "Asistente IA con Ollama + Llama 3.1",
      category: "ENTERPRISE",
      status: "PRODUCTION",
      progress: 100,
      phase: "PRODUCTION",

      description: "Chat flotante con RAG, auto-diagnóstico y knowledge base global",

      features: {
        ragSearch: { done: true, tested: true },
        contextAware: { done: true, tested: true },
        autoDiagnosis: { done: true, tested: true },
        feedbackLoop: { done: true, tested: true },
        globalKnowledgeBase: { done: true, tested: true },
        multiTenantHistory: { done: true, tested: true }
      },

      files: [
        "src/services/AssistantService.js",
        "src/routes/assistantRoutes.js",
        "public/js/modules/ai-assistant-chat.js"
      ],

      tables: ["assistant_knowledge_base", "assistant_conversations"],

      technology: "Ollama + Llama 3.1 (8B) - Local LLM",

      knownIssues: [
        "Ollama debe estar instalado y corriendo (localhost:11434)"
      ],

      lastUpdated: "2025-01-19"
    },

    auditor: {
      name: "Sistema de Auditoría y Auto-Diagnóstico",
      category: "ENTERPRISE",
      status: "PRODUCTION",
      progress: 100,
      phase: "PRODUCTION",

      description: "Testing automático, auto-healing, data seeding",

      features: {
        autoTesting: { done: true, tested: true },
        autoHealing: { done: true, tested: true },
        dataSeeding: { done: true, tested: true },
        dependencyAnalysis: { done: true, tested: true },
        moduleRegistry: { done: true, tested: true }
      },

      files: [
        "src/auditor/core/AuditorEngine.js",
        "src/auditor/healers/HybridHealer.js",
        "src/auditor/seeders/UniversalSeeder.js",
        "public/js/modules/auditor-dashboard.js"
      ],

      tables: ["audit_logs"],

      knownIssues: [],
      lastUpdated: "2025-01-19"
    },

    // ============ MÓDULOS COMERCIALES (EN DESARROLLO) ============
    vendorsCommissions: {
      name: "Vendedores y Sistema de Comisiones",
      category: "COMMERCIAL",
      status: "IN_PROGRESS",
      progress: 40,
      phase: "DEVELOPMENT",

      description: "Jerarquía de staff, comisiones piramidales, stats",

      features: {
        hierarchySetup: {
          name: "Configuración de Jerarquía",
          done: false,
          inProgress: true,
          tasks: [
            { id: "VH-1", name: "Migración DB (11 roles)", done: false },
            { id: "VH-2", name: "Modelo Sequelize actualizado", done: false },
            { id: "VH-3", name: "Formulario de alta con rol", done: false }
          ]
        },
        pyramidalCommissions: {
          name: "Comisiones Piramidales",
          done: false,
          inProgress: false,
          tasks: [
            { id: "PC-1", name: "Función PostgreSQL calculate_pyramid_commission", done: false },
            { id: "PC-2", name: "Triggers automáticos", done: false },
            { id: "PC-3", name: "API endpoint /staff/:id/commission", done: false }
          ]
        },
        statsTracking: {
          name: "Tracking de Estadísticas",
          done: false,
          inProgress: false,
          tasks: [
            { id: "ST-1", name: "Tabla vendor_statistics", done: false },
            { id: "ST-2", name: "Trigger auto-update", done: false },
            { id: "ST-3", name: "API /vendors/:id/statistics", done: false }
          ]
        },
        multiTenantFilters: {
          name: "Filtros Multi-Tenant por Rol",
          done: false,
          inProgress: false,
          tasks: [
            { id: "MTF-1", name: "Filtros SQL por rol", done: false },
            { id: "MTF-2", name: "Actualizar GET /companies", done: false },
            { id: "MTF-3", name: "Testing con diferentes roles", done: false }
          ]
        },
        vendorStates: {
          name: "Estados Complejos de Vendedor",
          done: false,
          inProgress: false,
          description: "active, inactive_earning, suspended, terminated",
          tasks: [
            { id: "VS-1", name: "ENUM vendor_status", done: false },
            { id: "VS-2", name: "Lógica de permisos por estado", done: false },
            { id: "VS-3", name: "Vista read-only para inactive_earning", done: false }
          ]
        }
      },

      pendingMigrations: [
        "ALTER TABLE aponnt_staff - Add hierarchical fields",
        "ALTER TABLE aponnt_staff - Update role ENUM",
        "ALTER TABLE companies - Add vendor FKs and commission fields",
        "CREATE TABLE vendor_statistics",
        "CREATE FUNCTION calculate_pyramid_commission",
        "CREATE FUNCTION refresh_vendor_statistics"
      ],

      files: [
        "src/models/AponntStaff.js",
        "src/models/VendorStatistics.js (NUEVO)",
        "src/routes/aponntDashboard.js",
        "src/routes/staffRoutes.js (NUEVO)",
        "PARA-BACKEND-IMPLEMENTACION-COMPLETA.md"
      ],

      tables: ["aponnt_staff", "vendor_statistics (NEW)", "companies"],

      dependencies: ["companies", "notifications"],

      knownIssues: [
        "Sistema duplicado: aponnt_staff (PostgreSQL) vs vendors.json (memory) - Migración pendiente",
        "Comisiones USD calculadas en frontend pero no persistidas en BD",
        "Falta implementar workflow de cambio de billetera con confirmación"
      ],

      currentTask: "Fase 1: Migraciones de BD y jerarquía (ver PARA-BACKEND-IMPLEMENTACION-COMPLETA.md)",

      designDoc: "PARA-BACKEND-IMPLEMENTACION-COMPLETA.md",
      lastUpdated: "2025-01-19"
    },

    budgets: {
      name: "Sistema de Presupuestos",
      category: "COMMERCIAL",
      status: "PLANNED",
      progress: 0,
      phase: "DESIGN",

      description: "Presupuestos versionados con workflow de aprobación",

      plannedFeatures: {
        budgetCreation: {
          name: "Creación de Presupuestos",
          description: "Generar presupuesto desde modificación de contrato"
        },
        versioning: {
          name: "Versionado",
          description: "Solo un presupuesto vigente, historial completo"
        },
        approvalWorkflow: {
          name: "Workflow de Aprobación",
          description: "Cliente aprueba/rechaza, notificaciones automáticas"
        },
        traceability: {
          name: "Trazabilidad",
          description: "Trace_id único conecta budget → contract → invoice → commissions"
        }
      },

      plannedTables: ["budgets", "budget_versions", "budget_approvals"],

      dependencies: ["companies", "contracts", "notifications", "vendorsCommissions"],

      estimatedEffort: "40-60 horas",
      priority: "HIGH",
      designDoc: "ARQUITECTURA-COMPLETA-ERP-COMISIONES.md (PENDING)",
      lastUpdated: "2025-01-19"
    },

    contracts: {
      name: "Sistema de Contratos",
      category: "COMMERCIAL",
      status: "PLANNED",
      progress: 0,
      phase: "DESIGN",

      description: "Contratos con firma digital tipo EULA",

      plannedFeatures: {
        contractGeneration: {
          name: "Generación de Contrato",
          description: "Desde presupuesto aprobado"
        },
        digitalSignature: {
          name: "Firma Digital (EULA-style)",
          description: "Checkbox + timestamp, sin certificado digital"
        },
        versioning: {
          name: "Versionado",
          description: "Solo un contrato vigente, historial completo"
        },
        deactivation: {
          name: "Baja de Contrato Vigente",
          description: "Al generar nuevo contrato, el viejo se marca como inactive"
        },
        traceability: {
          name: "Trazabilidad Completa",
          description: "Budget → Contract → Invoice → Commissions → Transfers"
        }
      },

      plannedTables: ["contracts", "contract_versions", "contract_signatures"],

      dependencies: ["budgets", "companies", "notifications"],

      estimatedEffort: "50-70 horas",
      priority: "HIGH",
      designDoc: "ARQUITECTURA-COMPLETA-ERP-COMISIONES.md (PENDING)",
      lastUpdated: "2025-01-19"
    },

    invoicing: {
      name: "Facturación Automática",
      category: "COMMERCIAL",
      status: "PLANNED",
      progress: 0,
      phase: "DESIGN",

      description: "Facturación mensual automática (día 1 de cada mes)",

      plannedFeatures: {
        autoGeneration: {
          name: "Generación Automática",
          description: "Cron job día 1 del mes, busca contratos vigentes"
        },
        clientNotification: {
          name: "Notificación al Cliente",
          description: "Email + notificación interna con factura"
        },
        paymentProofUpload: {
          name: "Carga de Comprobante",
          description: "Cliente sube comprobante de transferencia/pago"
        },
        collectionWorkflow: {
          name: "Workflow de Cobranzas",
          description: "Área de cobranzas confirma pago"
        },
        traceability: {
          name: "Trazabilidad",
          description: "Invoice_id conecta a todo el flujo"
        }
      },

      plannedTables: ["invoices", "payment_confirmations"],

      dependencies: ["contracts", "cobranzas", "notifications"],

      estimatedEffort: "60-80 horas",
      priority: "HIGH",
      designDoc: "ARQUITECTURA-COMPLETA-ERP-COMISIONES.md (PENDING)",
      lastUpdated: "2025-01-19"
    },

    commissionLiquidation: {
      name: "Liquidación de Comisiones",
      category: "COMMERCIAL",
      status: "PLANNED",
      progress: 0,
      phase: "DESIGN",

      description: "Liquidación mensual de comisiones con trazabilidad completa",

      plannedFeatures: {
        autoCalculation: {
          name: "Cálculo Automático",
          description: "Al confirmar pago de factura, calcular todas las comisiones"
        },
        pyramidalChain: {
          name: "Cadena Piramidal",
          description: "Vendedor → Líder → Supervisor → Gerente Regional → CEO"
        },
        digestGeneration: {
          name: "Digest de Liquidación",
          description: "ID único, timestamp, deadline para cobranzas"
        },
        transferManagement: {
          name: "Gestión de Transferencias",
          description: "Registro de transferencias a billeteras"
        },
        confirmationWorkflow: {
          name: "Workflow de Confirmación",
          description: "Destinatario confirma recepción de transferencia"
        },
        traceability: {
          name: "Trazabilidad End-to-End",
          description: "Invoice → Liquidation → Individual Payments → Transfers → Confirmations"
        }
      },

      plannedTables: [
        "commission_liquidations",
        "commission_payments",
        "transfers",
        "transfer_confirmations",
        "traceability_chain"
      ],

      dependencies: ["invoicing", "vendorsCommissions", "notifications"],

      estimatedEffort: "80-120 horas",
      priority: "HIGH",
      designDoc: "ARQUITECTURA-COMPLETA-ERP-COMISIONES.md (PENDING)",
      lastUpdated: "2025-01-19"
    },

    cobranzas: {
      name: "Gestión de Cobranzas",
      category: "COMMERCIAL",
      status: "PLANNED",
      progress: 0,
      phase: "DESIGN",

      description: "Área de cobranzas confirma pagos y ejecuta transferencias",

      plannedFeatures: {
        paymentConfirmation: {
          name: "Confirmación de Pagos",
          description: "Área de cobranzas confirma que cliente pagó"
        },
        transferExecution: {
          name: "Ejecución de Transferencias",
          description: "Registro de transferencias a vendedores"
        },
        deadlineTracking: {
          name: "Seguimiento de Deadlines",
          description: "Alertas si no se cumplen plazos"
        },
        notificationManagement: {
          name: "Gestión de Notificaciones",
          description: "Enviar comprobantes a destinatarios"
        }
      },

      plannedTables: ["collection_confirmations"],

      dependencies: ["invoicing", "commissionLiquidation", "notifications"],

      estimatedEffort: "40-60 horas",
      priority: "MEDIUM",
      designDoc: "ARQUITECTURA-COMPLETA-ERP-COMISIONES.md (PENDING)",
      lastUpdated: "2025-01-19"
    }
  },

  // ==================== WORKFLOWS CRÍTICOS ====================
  workflows: {
    contractModification: {
      name: "Modificación de Contrato (Cliente Agrega/Quita Módulos)",
      status: "DESIGNED",
      implemented: false,

      trigger: "Cliente modifica módulos desde panel-empresa",

      steps: [
        {
          step: 1,
          name: "Dar de baja contrato vigente",
          status: "NOT_IMPLEMENTED",
          action: "UPDATE contracts SET is_active = false WHERE company_id = X AND is_active = true"
        },
        {
          step: 2,
          name: "Crear nuevo presupuesto",
          status: "NOT_IMPLEMENTED",
          action: "INSERT INTO budgets (company_id, modules, total_usd, status = 'pending_approval')"
        },
        {
          step: 3,
          name: "Enviar notificación al cliente",
          status: "NOT_IMPLEMENTED",
          action: "Notification.create({ requires_action: true, action_type: 'approve_reject' })",
          channels: ["email", "app"]
        },
        {
          step: 4,
          name: "Cliente aprueba/rechaza",
          status: "NOT_IMPLEMENTED",
          timeout: "7 días",
          onApprove: "→ Step 5",
          onReject: "→ Workflow ends, revertir a contrato anterior"
        },
        {
          step: 5,
          name: "Generar nuevo contrato",
          status: "NOT_IMPLEMENTED",
          action: "INSERT INTO contracts (budget_id, company_id, status = 'pending_signature')"
        },
        {
          step: 6,
          name: "Enviar para firma digital (EULA)",
          status: "NOT_IMPLEMENTED",
          action: "Notification.create + Email with contract terms"
        },
        {
          step: 7,
          name: "Cliente firma (checkbox + timestamp)",
          status: "NOT_IMPLEMENTED",
          timeout: "7 días",
          onSign: "→ Step 8",
          onTimeout: "→ Escalate to sales rep"
        },
        {
          step: 8,
          name: "Activar nuevo contrato",
          status: "NOT_IMPLEMENTED",
          action: "UPDATE contracts SET is_active = true, signed_at = NOW()"
        },
        {
          step: 9,
          name: "Actualizar empresa acorde a nuevo contrato",
          status: "NOT_IMPLEMENTED",
          action: "UPDATE companies SET modules = NEW, monthly_total = NEW"
        },
        {
          step: 10,
          name: "Recalcular comisiones de toda la jerarquía",
          status: "NOT_IMPLEMENTED",
          action: "CALL refresh_vendor_statistics(vendor_id) for all affected vendors"
        }
      ],

      affectedModules: ["companies", "budgets", "contracts", "vendorsCommissions", "notifications"],
      estimatedEffort: "50-70 horas",
      priority: "HIGH",
      designDoc: "ARQUITECTURA-COMPLETA-ERP-COMISIONES.md",
      designStatus: "COMPLETE",
      notificationSystem: "aponnt_external_notifications (NUEVO - separado de NotificationEnterpriseService)",
      lastUpdated: "2025-01-19T18:30:00Z",

      help: {
        quickStart: `1. Cliente modifica módulos desde panel-empresa → Configuración → Módulos Activos
2. Sistema da de baja contrato vigente y genera presupuesto automáticamente
3. Cliente recibe notificación por email y app con presupuesto detallado
4. Cliente tiene 7 días para aprobar o rechazar el presupuesto
5. Si aprueba: sistema genera nuevo contrato y envía para firma digital
6. Cliente firma digitalmente (checkbox + timestamp + IP)
7. Sistema activa nuevo contrato y actualiza módulos de la empresa
8. Recalcula comisiones de toda la jerarquía de vendedores
9. Si no es día 1 del mes: genera factura pro-rata
10. Configura notificación mensual recurrente (día 1 de cada mes)`,
        commonIssues: [
                  {
                            "problem": "Presupuesto no llega al email del cliente",
                            "cause": "Email de contacto de la empresa desactualizado o servidor SMTP caído",
                            "solution": "1. Verificar email: SELECT contact_email FROM companies WHERE id = X\n2. Verificar estado SMTP: GET /api/health/smtp\n3. Reenviar presupuesto: POST /api/budgets/:id/resend\n4. Verificar logs: SELECT * FROM email_logs WHERE budget_id = X ORDER BY created_at DESC"
                  },
                  {
                            "problem": "Contrato queda en 'pending_signature' sin avanzar",
                            "cause": "Cliente no firmó dentro del plazo de 7 días",
                            "solution": "1. Verificar deadline: SELECT signed_deadline FROM contracts WHERE id = X\n2. Escalar a vendedor: POST /api/contracts/:id/escalate\n3. Extender deadline (admin): PUT /api/contracts/:id/extend-deadline {\"days\": 7}\n4. Si no responde: sistema revierte a contrato anterior automáticamente"
                  },
                  {
                            "problem": "Comisiones no se recalculan después de modificar contrato",
                            "cause": "Función refresh_vendor_statistics() no se ejecutó en Step 10",
                            "solution": "1. Ejecutar manualmente: SELECT refresh_vendor_statistics(vendor_id) FROM companies WHERE id = X\n2. Verificar logs: SELECT * FROM audit_logs WHERE module_name = 'vendorsCommissions'\n3. Ejecutar auditoría: POST /api/audit/run/vendorsCommissions"
                  },
                  {
                            "problem": "Módulos no se activaron después de firmar contrato",
                            "cause": "Step 9 falló - companies.active_modules no se actualizó",
                            "solution": "1. Verificar contrato: SELECT status, signed_at FROM contracts WHERE id = X\n2. Verificar módulos: SELECT active_modules FROM companies WHERE id = X\n3. Actualizar manualmente (admin): UPDATE companies SET active_modules = [nuevos] WHERE id = X\n4. Registrar en audit_logs para trazabilidad"
                  }
        ],
        requiredRoles: ["admin","empresa"],
        requiredModules: ["companies","budgets","contracts","notifications"],
        relatedEndpoints: ["GET /api/budgets/:id","POST /api/budgets/:id/approve","POST /api/budgets/:id/reject","POST /api/budgets/:id/resend","GET /api/contracts/:id","POST /api/contracts/:id/sign","POST /api/contracts/:id/escalate","PUT /api/contracts/:id/extend-deadline"],
        codeFiles: ["src/routes/budgetRoutes.js","src/routes/contractRoutes.js","src/services/ContractService.js","src/services/BudgetService.js","public/js/modules/company-settings.js"]
      },

    },

    monthlyInvoicing: {
      name: "Facturación Mensual Automática",
      status: "DESIGNED",
      implemented: false,

      trigger: "Cron job - Día 1 de cada mes a las 00:00",
      cronExpression: "0 0 1 * *",

      steps: [
        {
          step: 1,
          name: "Buscar contratos vigentes",
          status: "NOT_IMPLEMENTED",
          action: "SELECT * FROM contracts WHERE is_active = true"
        },
        {
          step: 2,
          name: "Generar factura para cada contrato",
          status: "NOT_IMPLEMENTED",
          action: "INSERT INTO invoices (contract_id, company_id, amount, period, status = 'pending')"
        },
        {
          step: 3,
          name: "Enviar factura a cada cliente",
          status: "NOT_IMPLEMENTED",
          action: "Email + Notification with invoice PDF and payment link"
        },
        {
          step: 4,
          name: "Cliente carga comprobante de pago",
          status: "NOT_IMPLEMENTED",
          timeout: "15 días",
          action: "Upload payment proof via notification action"
        },
        {
          step: 5,
          name: "Notificar a área de cobranzas",
          status: "NOT_IMPLEMENTED",
          action: "Notification to collection staff"
        },
        {
          step: 6,
          name: "Cobranzas confirma pago",
          status: "NOT_IMPLEMENTED",
          action: "UPDATE invoices SET status = 'paid', confirmed_by = staff_id"
        },
        {
          step: 7,
          name: "Disparar liquidación de comisiones",
          status: "NOT_IMPLEMENTED",
          action: "→ Trigger monthlyCommissionLiquidation workflow"
        }
      ],

      affectedModules: ["contracts", "invoicing", "notifications", "cobranzas"],
      estimatedEffort: "60-80 horas",
      priority: "HIGH",
      designDoc: "ARQUITECTURA-COMPLETA-ERP-COMISIONES.md",
      designStatus: "COMPLETE",
      notificationSystem: "aponnt_external_notifications (NUEVO - separado de NotificationEnterpriseService)",
      lastUpdated: "2025-01-19T18:30:00Z",

      help: {
        quickStart: `1. Cron job se ejecuta automáticamente el día 1 de cada mes a las 00:00 hs
2. Busca todos los contratos activos en la base de datos
3. Genera una factura por cada contrato activo
4. Envía factura por email + notificación app a cada cliente
5. Cliente tiene 15 días para cargar comprobante de pago
6. Área de Cobranzas confirma pago (deadline: día 7 del mes)
7. Al confirmar pago: dispara workflow de liquidación de comisiones`,
        commonIssues: [
                  {
                            "problem": "Factura generada con monto incorrecto",
                            "cause": "Contrato modificado pero companies.monthly_total no actualizado",
                            "solution": "1. Verificar: SELECT monthly_total FROM companies WHERE id = X\n2. Calcular correcto: SELECT SUM(price) FROM active_modules WHERE company_id = X\n3. Si difiere: UPDATE companies SET monthly_total = [correcto] WHERE id = X\n4. Regenerar factura: POST /api/invoices/:id/regenerate"
                  },
                  {
                            "problem": "Cliente no recibe email de factura",
                            "cause": "Email incorrecto o límite de envíos SMTP excedido",
                            "solution": "1. Verificar email: SELECT contact_email FROM companies WHERE id = X\n2. Verificar logs SMTP: SELECT * FROM email_logs WHERE invoice_id = X\n3. Reenviar manualmente: POST /api/invoices/:id/resend\n4. Si persiste: verificar estado del servidor SMTP"
                  },
                  {
                            "problem": "Factura no se generó para un contrato activo",
                            "cause": "Contrato activado después del día 1 o cron job falló",
                            "solution": "1. Verificar estado del cron: SELECT * FROM cron_logs WHERE job_name = 'monthly_invoicing'\n2. Generar factura manual: POST /api/invoices/generate {\"contract_id\": \"X\"}\n3. Verificar contratos activos: SELECT * FROM contracts WHERE is_active = true AND company_id = X"
                  },
                  {
                            "problem": "Liquidación de comisiones no se disparó después de confirmar pago",
                            "cause": "Trigger del Step 7 falló",
                            "solution": "1. Verificar status de factura: SELECT status FROM invoices WHERE id = X\n2. Disparar manualmente: POST /api/commissions/liquidate {\"invoice_id\": \"X\"}\n3. Verificar logs: SELECT * FROM audit_logs WHERE module_name = 'invoicing'"
                  }
        ],
        requiredRoles: ["admin","cobranzas"],
        requiredModules: ["contracts","invoicing","notifications"],
        relatedEndpoints: ["GET /api/invoices","GET /api/invoices/:id","POST /api/invoices/:id/upload-payment","POST /api/invoices/:id/confirm-payment","POST /api/invoices/:id/resend","POST /api/invoices/generate"],
        codeFiles: ["src/services/InvoicingService.js","src/routes/invoiceRoutes.js","src/cron/monthly-invoicing.js"]
      },

    },

    monthlyCommissionLiquidation: {
      name: "Liquidación Mensual de Comisiones",
      status: "DESIGNED",
      implemented: false,

      trigger: "Al confirmarse pago de factura (invoice.status = 'paid')",

      steps: [
        {
          step: 1,
          name: "Obtener cadena jerárquica del vendedor",
          status: "NOT_IMPLEMENTED",
          action: "SELECT * FROM aponnt_staff WHERE ... (recursive CTE)"
        },
        {
          step: 2,
          name: "Calcular comisión directa del vendedor",
          status: "NOT_IMPLEMENTED",
          action: "vendor_commission = invoice.amount * vendor.sales_commission_percentage / 100"
        },
        {
          step: 3,
          name: "Calcular comisiones piramidales",
          status: "NOT_IMPLEMENTED",
          action: "FOR EACH level IN hierarchy: commission = invoice.amount * level.pyramid_percentage / 100"
        },
        {
          step: 4,
          name: "Generar digest de liquidación",
          status: "NOT_IMPLEMENTED",
          action: "INSERT INTO commission_liquidations (trace_id, invoice_id, total_commissions, deadline)"
        },
        {
          step: 5,
          name: "Crear pagos individuales",
          status: "NOT_IMPLEMENTED",
          action: "INSERT INTO commission_payments (liquidation_id, staff_id, amount, type)"
        },
        {
          step: 6,
          name: "Notificar a cobranzas con digest",
          status: "NOT_IMPLEMENTED",
          action: "Notification to collection staff with deadline"
        },
        {
          step: 7,
          name: "Cobranzas ejecuta transferencias",
          status: "NOT_IMPLEMENTED",
          action: "INSERT INTO transfers (payment_id, bank_account, amount, status = 'executed')"
        },
        {
          step: 8,
          name: "Enviar comprobante a destinatarios",
          status: "NOT_IMPLEMENTED",
          action: "Notification + Email con comprobante de transferencia"
        },
        {
          step: 9,
          name: "Destinatarios confirman recepción",
          status: "NOT_IMPLEMENTED",
          timeout: "5 días",
          action: "Notification.action = 'confirm_received'"
        },
        {
          step: 10,
          name: "Marcar como pagado con trazabilidad completa",
          status: "NOT_IMPLEMENTED",
          action: "UPDATE commission_payments SET status = 'confirmed', confirmed_at = NOW()"
        }
      ],

      trazabilidad: {
        trace_id: "UUID único",
        connects: [
          "invoice (origen)",
          "commission_liquidation",
          "commission_payments (n payments)",
          "transfers (n transfers)",
          "transfer_confirmations (n confirmations)"
        ],
        metadata: {
          invoice_id: "UUID",
          contract_id: "UUID",
          budget_id: "UUID",
          company_id: "UUID",
          period: "YYYY-MM",
          vendor_chain: ["vendor_id", "leader_id", "supervisor_id", "regional_manager_id", "ceo_id"],
          total_amount: "DECIMAL",
          total_commissions: "DECIMAL",
          aponnt_margin: "DECIMAL"
        }
      },

      affectedModules: ["invoicing", "vendorsCommissions", "notifications", "cobranzas"],
      estimatedEffort: "80-120 horas",
      priority: "HIGH",
      designDoc: "ARQUITECTURA-COMPLETA-ERP-COMISIONES.md",
      designStatus: "COMPLETE",
      notificationSystem: "aponnt_external_notifications (NUEVO - separado de NotificationEnterpriseService)",
      lastUpdated: "2025-01-19T18:30:00Z",

      help: {
        quickStart: `1. Se dispara automáticamente al confirmarse pago de factura
2. Obtiene cadena jerárquica del vendedor (CEO → Regional → Supervisor → Leader → Rep)
3. Calcula comisión directa del vendedor (% del total de factura)
4. Calcula comisiones piramidales de todos los niveles superiores
5. Genera digest de liquidación con trazabilidad completa
6. Crea pagos individuales para cada miembro de la jerarquía
7. Notifica a Cobranzas con digest y deadline (día 10 del mes)
8. Cobranzas ejecuta transferencias bancarias en USD
9. Envía comprobantes a cada destinatario
10. Destinatarios confirman recepción (deadline: 5 días)`,
        commonIssues: [
                  {
                            "problem": "Vendedor no aparece en liquidación de comisiones",
                            "cause": "Vendedor no está asignado a la empresa o jerarquía rota",
                            "solution": "1. Verificar asignación: SELECT assigned_vendor_id FROM companies WHERE id = X\n2. Verificar jerarquía: SELECT * FROM aponnt_staff WHERE id = vendor_id\n3. Verificar leader_id: debe apuntar a un Sales Leader válido\n4. Si es NULL: asignar leader con UPDATE aponnt_staff SET leader_id = Y WHERE id = X"
                  },
                  {
                            "problem": "Comisión calculada incorrectamente",
                            "cause": "Porcentajes piramidales mal configurados o función SQL con bug",
                            "solution": "1. Verificar %: SELECT sales_commission_percentage, pyramid_percentages FROM aponnt_staff WHERE id = X\n2. Ejecutar función manual: SELECT calculate_pyramid_commission(invoice_id, vendor_id)\n3. Comparar resultado con liquidación generada\n4. Si difiere: reportar a ingeniería con datos del caso"
                  },
                  {
                            "problem": "Transferencia no se ejecutó",
                            "cause": "Datos de billetera incorrectos o no en USD",
                            "solution": "1. Verificar CBU: SELECT wallet_cbu, wallet_usd_enabled FROM aponnt_staff WHERE id = X\n2. Verificar validación: wallet_usd_enabled DEBE ser true\n3. Si CBU incorrecto: solicitar cambio de billetera (workflow walletChangeConfirmation)\n4. Si USD no habilitado: contactar al vendedor para habilitar USD en su billetera"
                  },
                  {
                            "problem": "Vendedor no confirma recepción de pago",
                            "cause": "No recibió notificación o no usó la app",
                            "solution": "1. Reenviar notificación: POST /api/commissions/payments/:id/resend-confirmation\n2. Verificar email/SMS: SELECT * FROM email_logs WHERE payment_id = X\n3. Si no responde en 5 días: auto-confirmar y escalar a líder\n4. Registrar en audit_logs para auditoría"
                  }
        ],
        requiredRoles: ["admin","cobranzas"],
        requiredModules: ["invoicing","vendorsCommissions","notifications"],
        relatedEndpoints: ["GET /api/commissions/liquidations","GET /api/commissions/liquidations/:id","POST /api/commissions/liquidate","POST /api/commissions/payments/:id/transfer","POST /api/commissions/payments/:id/confirm","GET /api/vendors/:id/hierarchy"],
        codeFiles: ["src/services/CommissionService.js","src/services/VendorHierarchyService.js","src/routes/vendorCommissionsRoutes.js","migrations/20250119_create_pyramid_commission_functions.sql"]
      },

    },

    walletChangeConfirmation: {
      name: "Cambio de Billetera Virtual (Vendedor)",
      status: "DESIGNED",
      implemented: false,

      trigger: "Vendedor solicita cambio de CBU/alias desde app móvil o panel",

      steps: [
        {
          step: 1,
          name: "Vendedor ingresa nuevos datos",
          status: "NOT_IMPLEMENTED",
          action: "Input: CBU, alias, bank_name, account_type (USD)"
        },
        {
          step: 2,
          name: "Crear solicitud con estado pendiente",
          status: "NOT_IMPLEMENTED",
          action: "INSERT INTO wallet_change_requests (staff_id, new_cbu, status = 'pending', deadline)"
        },
        {
          step: 3,
          name: "Enviar notificación de confirmación",
          status: "NOT_IMPLEMENTED",
          action: "Email + Notification: 'Confirma que estos datos son correctos y de tu autoría'",
          requires_action: true
        },
        {
          step: 4,
          name: "Vendedor confirma",
          status: "NOT_IMPLEMENTED",
          timeout: "48 horas",
          onConfirm: "→ Step 5",
          onReject: "→ Revert changes",
          onTimeout: "→ Auto-revert"
        },
        {
          step: 5,
          name: "Aplicar cambios",
          status: "NOT_IMPLEMENTED",
          action: "UPDATE aponnt_staff SET cbu = NEW WHERE id = staff_id"
        },
        {
          step: 6,
          name: "Notificar éxito",
          status: "NOT_IMPLEMENTED",
          action: "Notification: 'Datos de billetera actualizados correctamente'"
        }
      ],

      plannedTables: ["wallet_change_requests"],

      affectedModules: ["vendorsCommissions", "notifications"],
      estimatedEffort: "20-30 horas",
      priority: "MEDIUM",
      designDoc: "ARQUITECTURA-COMPLETA-ERP-COMISIONES.md",
      designStatus: "COMPLETE",
      notificationSystem: "aponnt_external_notifications (NUEVO - separado de NotificationEnterpriseService)",
      lastUpdated: "2025-01-19T18:30:00Z",

      help: {
        quickStart: `1. Vendedor ingresa nuevos datos de billetera (CBU, alias, banco)
2. Sistema crea solicitud con estado 'pending' y deadline de 48 horas
3. Envía notificación de confirmación por email y app
4. Vendedor debe confirmar que los datos son correctos y de su autoría
5. Si confirma: se aplican los cambios
6. Si rechaza o no responde en 48 hs: cambios se revierten automáticamente`,
        commonIssues: [
                  {
                            "problem": "Cambio de billetera no se aplicó después de confirmar",
                            "cause": "Step 5 falló - UPDATE en aponnt_staff no se ejecutó",
                            "solution": "1. Verificar solicitud: SELECT * FROM wallet_change_requests WHERE staff_id = X AND status = 'confirmed'\n2. Verificar CBU actual: SELECT wallet_cbu FROM aponnt_staff WHERE id = X\n3. Aplicar manualmente: UPDATE aponnt_staff SET wallet_cbu = [nuevo] WHERE id = X\n4. Marcar solicitud como aplicada: UPDATE wallet_change_requests SET status = 'applied'"
                  },
                  {
                            "problem": "Vendedor no recibe notificación de confirmación",
                            "cause": "Email incorrecto en perfil del vendedor",
                            "solution": "1. Verificar email: SELECT email FROM aponnt_staff WHERE id = X\n2. Reenviar notificación: POST /api/wallet-changes/:id/resend\n3. Si email incorrecto: actualizar con UPDATE aponnt_staff SET email = [correcto]\n4. Extender deadline si es necesario: UPDATE wallet_change_requests SET deadline = NOW() + INTERVAL '48 hours'"
                  },
                  {
                            "problem": "Sistema acepta CBU inválido",
                            "cause": "Validación de formato CBU no funcionó",
                            "solution": "1. CBU argentino debe tener exactamente 22 dígitos numéricos\n2. Verificar regex de validación en código\n3. Rechazar solicitud: UPDATE wallet_change_requests SET status = 'rejected'\n4. Notificar al vendedor del error y solicitar CBU correcto"
                  }
        ],
        requiredRoles: ["vendor","sales_leader","admin"],
        requiredModules: ["vendorsCommissions","notifications"],
        relatedEndpoints: ["POST /api/vendors/:id/wallet/change","POST /api/wallet-changes/:id/confirm","POST /api/wallet-changes/:id/reject","POST /api/wallet-changes/:id/resend","GET /api/vendors/:id/wallet-history"],
        codeFiles: ["src/services/VendorWalletService.js","src/routes/vendorRoutes.js","migrations/wallet_change_requests.sql"]
      },

    },

    vendorOnboarding: {
      name: "Alta/Modificación de Vendedor",
      status: "DESIGNED",
      implemented: false,

      trigger: "Admin da de alta nuevo vendedor o modifica datos existentes",

      steps: [
        {
          step: 1,
          name: "Admin ingresa datos del vendedor",
          status: "NOT_IMPLEMENTED",
          action: "INSERT INTO aponnt_staff (first_name, last_name, email, role, leader_id, wallet_cbu, etc.)"
        },
        {
          step: 2,
          name: "Validar datos de billetera",
          status: "NOT_IMPLEMENTED",
          action: "Verificar CBU (22 dígitos), alias válido, USD habilitado = true"
        },
        {
          step: 3,
          name: "Generar credenciales",
          status: "NOT_IMPLEMENTED",
          action: "Username + password temporal"
        },
        {
          step: 4,
          name: "Enviar notificación de bienvenida",
          status: "NOT_IMPLEMENTED",
          action: "Email + credenciales + manual de vendedor + datos de liquidación",
          channels: ["email", "sms"]
        },
        {
          step: 5,
          name: "Vendedor completa perfil",
          status: "NOT_IMPLEMENTED",
          action: "Cambiar password, subir foto, completar datos biométricos"
        },
        {
          step: 6,
          name: "Modificación de datos (si aplica)",
          status: "NOT_IMPLEMENTED",
          action: "Registrar cambios en staff_change_history, notificar según tipo de cambio"
        }
      ],

      modificationEvents: [
        { event: "Cambio de líder", requiresNotification: true },
        { event: "Cambio de rol", requiresNotification: true },
        { event: "Cambio de status", requiresNotification: true },
        { event: "Cambio de billetera", requiresNotification: true, workflow: "walletChangeConfirmation" }
      ],

      plannedTables: ["staff_change_history"],

      affectedModules: ["aponnt_staff", "notifications", "vendorsCommissions"],
      estimatedEffort: "15-25 horas",
      priority: "MEDIUM",
      designDoc: "ARQUITECTURA-COMPLETA-ERP-COMISIONES.md",
      designStatus: "COMPLETE",
      notificationSystem: "aponnt_external_notifications (NUEVO)",
      lastUpdated: "2025-01-19T18:30:00Z",

      help: {
        quickStart: `1. Admin ingresa datos del vendedor en panel-administrativo
2. Sistema valida datos de billetera (CBU 22 dígitos, USD habilitado)
3. Genera credenciales de acceso (username + password temporal)
4. Envía notificación de bienvenida con credenciales y manual
5. Vendedor completa perfil (cambio de password, foto, datos biométricos)
6. Si hay modificaciones posteriores: registra en historial y notifica`,
        commonIssues: [
                  {
                            "problem": "Vendedor no recibe credenciales de acceso",
                            "cause": "Email incorrecto al momento del alta",
                            "solution": "1. Verificar email: SELECT email FROM aponnt_staff WHERE id = X\n2. Reenviar credenciales: POST /api/vendors/:id/resend-credentials\n3. Si email incorrecto: UPDATE aponnt_staff SET email = [correcto] WHERE id = X\n4. Regenerar password temporal: POST /api/vendors/:id/reset-password"
                  },
                  {
                            "problem": "Sistema no acepta CBU del vendedor",
                            "cause": "CBU no tiene 22 dígitos o contiene caracteres no numéricos",
                            "solution": "1. Validar formato: CBU debe tener exactamente 22 dígitos\n2. Ejemplo válido: 0170099520000001234567\n3. Verificar que USD esté habilitado en la billetera\n4. Si banco no soporta USD: solicitar CBU de otro banco"
                  },
                  {
                            "problem": "Vendedor no puede cambiar password temporal",
                            "cause": "Token de reseteo expiró o ruta de cambio de password rota",
                            "solution": "1. Generar nuevo token: POST /api/vendors/:id/reset-password\n2. Verificar ruta: GET /api/vendors/reset-password/:token\n3. Si ruta falla: revisar logs del servidor\n4. Alternativamente: admin puede establecer password directamente"
                  },
                  {
                            "problem": "Modificación de líder no notifica al vendedor",
                            "cause": "Event handler de 'Cambio de líder' falló",
                            "solution": "1. Verificar historial: SELECT * FROM staff_change_history WHERE staff_id = X\n2. Verificar notifications: SELECT * FROM aponnt_external_notifications WHERE recipient_id = X\n3. Reenviar notificación: POST /api/staff-changes/:id/notify\n4. Revisar logs del servicio de notificaciones"
                  }
        ],
        requiredRoles: ["admin"],
        requiredModules: ["aponnt_staff","notifications","vendorsCommissions"],
        relatedEndpoints: ["POST /api/vendors","PUT /api/vendors/:id","POST /api/vendors/:id/resend-credentials","POST /api/vendors/:id/reset-password","GET /api/vendors/:id/change-history","POST /api/vendors/:id/change-leader"],
        codeFiles: ["src/routes/vendorRoutes.js","src/services/VendorOnboardingService.js","src/models/AponntStaff.js","migrations/staff_change_history.sql"]
      },

    },

    companyModulesChange: {
      name: "Cambios en Empresas (Módulos/Pricing)",
      status: "DESIGNED",
      implemented: false,

      trigger: "Empresa cambia cantidad de empleados, agrega/quita módulos, modifica pricing",

      scenarios: {
        scenario1: {
          name: "Agregar/Quitar módulos",
          action: "→ Trigger contractModification workflow (10 pasos completos)"
        },
        scenario2: {
          name: "Cambio de cantidad (empleados/licencias)",
          action: "→ Proceso simplificado (sin nuevo contrato)"
        }
      },

      steps: [
        {
          step: 1,
          name: "Detectar cambio en cantidad",
          status: "NOT_IMPLEMENTED",
          action: "Empresa actualiza contracted_employees en panel"
        },
        {
          step: 2,
          name: "Recalcular pricing automáticamente",
          status: "NOT_IMPLEMENTED",
          action: "pricing = active_modules.map(m => m.price * quantity)"
        },
        {
          step: 3,
          name: "Registrar en historial",
          status: "NOT_IMPLEMENTED",
          action: "INSERT INTO pricing_change_history (company_id, field, old_value, new_value, monthly_impact)"
        },
        {
          step: 4,
          name: "Notificar a empresa",
          status: "NOT_IMPLEMENTED",
          action: "Email: 'Tu facturación mensual cambió de $X a $Y (+$Z/mes)'",
          channels: ["email"]
        },
        {
          step: 5,
          name: "Notificar a vendedor",
          status: "NOT_IMPLEMENTED",
          action: "Email: 'Cliente aumentó empleados - Tu comisión mensual aumentó de $X a $Y'",
          channels: ["email"]
        },
        {
          step: 6,
          name: "Recalcular comisiones futuras",
          status: "NOT_IMPLEMENTED",
          action: "UPDATE commission estimations para próximas facturas"
        }
      ],

      plannedTables: ["pricing_change_history"],

      affectedModules: ["companies", "invoicing", "vendorsCommissions", "notifications"],
      estimatedEffort: "10-20 horas",
      priority: "MEDIUM",
      designDoc: "ARQUITECTURA-COMPLETA-ERP-COMISIONES.md",
      designStatus: "COMPLETE",
      notificationSystem: "aponnt_external_notifications (NUEVO)",
      lastUpdated: "2025-01-19T18:30:00Z",

      help: {
        quickStart: `ESCENARIO 1 - Agregar/Quitar Módulos:
→ Dispara workflow completo de Modificación de Contrato (10 pasos)

ESCENARIO 2 - Cambio de Cantidad (empleados/licencias):
1. Empresa actualiza cantidad de empleados desde panel
2. Sistema recalcula pricing automáticamente (precio × cantidad)
3. Registra cambio en historial de pricing
4. Notifica a empresa: "Tu factura mensual cambió de $X a $Y"
5. Notifica a vendedor: "Comisión mensual aumentó/disminuyó"
6. Recalcula comisiones futuras en estimaciones`,
        commonIssues: [
                  {
                            "problem": "Precio no se recalculó después de cambiar cantidad de empleados",
                            "cause": "Trigger de recalcular pricing falló en Step 2",
                            "solution": "1. Calcular manual: precio_total = precio_unitario × cantidad_empleados\n2. Actualizar: UPDATE companies SET monthly_total = [nuevo] WHERE id = X\n3. Verificar módulos activos: SELECT * FROM active_modules WHERE company_id = X\n4. Regenerar próxima factura si es necesario"
                  },
                  {
                            "problem": "Empresa cambió módulos pero dispara proceso simplificado en vez de contractModification",
                            "cause": "Lógica de detección de escenario falló",
                            "solution": "1. Verificar qué cambió: active_modules vs contracted_employees\n2. Si cambió active_modules: DEBE disparar contractModification workflow\n3. Si solo cambió contracted_employees: proceso simplificado OK\n4. Si ambos cambiaron: priorizar contractModification (más crítico)"
                  },
                  {
                            "problem": "Vendedor no recibió notificación de aumento de comisión",
                            "cause": "Step 5 falló - notificación a vendedor no se envió",
                            "solution": "1. Verificar vendor asignado: SELECT assigned_vendor_id FROM companies WHERE id = X\n2. Verificar historial: SELECT * FROM pricing_change_history WHERE company_id = X\n3. Calcular impacto: nueva_comision - comision_anterior\n4. Enviar notificación manual: POST /api/vendors/:id/notify-commission-change"
                  },
                  {
                            "problem": "Historial de pricing no registra el cambio",
                            "cause": "INSERT en pricing_change_history falló",
                            "solution": "1. Verificar tabla existe: SELECT * FROM pricing_change_history LIMIT 1\n2. Insertar manual: INSERT INTO pricing_change_history (company_id, field, old_value, new_value, monthly_impact)\n3. Verificar permisos de escritura en la tabla\n4. Revisar logs del servidor para error específico"
                  }
        ],
        requiredRoles: ["admin","empresa"],
        requiredModules: ["companies","invoicing","vendorsCommissions","notifications"],
        relatedEndpoints: ["PUT /api/companies/:id/employees","PUT /api/companies/:id/modules","GET /api/companies/:id/pricing-history","POST /api/companies/:id/recalculate-pricing"],
        codeFiles: ["src/routes/companyRoutes.js","src/services/CompanyPricingService.js","migrations/pricing_change_history.sql","public/js/modules/company-settings.js"]
      },

    }
  },

  // ==================== BASE DE DATOS ====================
  database: {
    engine: "PostgreSQL 14+",
    schema: "public",
    totalTables: 50, // Aproximado (existentes + planificadas)

    tables: {
      // ============ TABLAS CORE (PRODUCCIÓN) ============
      companies: {
        status: "IN_MIGRATION",
        purpose: "Empresas clientes (multi-tenant core)",
        rowCountEstimate: "100-500",
        indexes: ["company_id (PK)", "slug (UNIQUE)", "is_active"],

        pendingChanges: [
          "ADD assigned_vendor_id UUID → aponnt_staff(id)",
          "ADD support_vendor_id UUID → aponnt_staff(id)",
          "ADD created_by_staff_id UUID → aponnt_staff(id)",
          "ADD sales_commission_usd DECIMAL(12,2) DEFAULT 0.00",
          "ADD support_commission_usd DECIMAL(12,2) DEFAULT 0.00"
        ],

        currentFields: [
          "company_id (PK)",
          "name, slug, legal_name",
          "contact_email, contact_phone",
          "address, city, province, country",
          "tax_id",
          "is_active",
          "license_type (free, trial, standard, premium, enterprise)",
          "max_employees, contracted_employees",
          "modules (JSONB)",
          "modules_data (JSONB)",
          "modules_pricing (JSONB)",
          "monthly_total (DECIMAL)",
          "created_at, updated_at"
        ],

        foreignKeys: [
          "assigned_vendor_id → aponnt_staff(id) (PENDING)",
          "support_vendor_id → aponnt_staff(id) (PENDING)",
          "created_by_staff_id → aponnt_staff(id) (PENDING)"
        ]
      },

      users: {
        status: "PRODUCTION",
        purpose: "Empleados de empresas clientes",
        rowCountEstimate: "5,000-50,000",
        indexes: ["user_id (PK)", "company_id", "email", "dni"],

        foreignKeys: [
          "company_id → companies(company_id)",
          "department_id → departments(id)",
          "shift_id → shifts(id)"
        ]
      },

      aponnt_staff: {
        status: "IN_MIGRATION",
        purpose: "Staff de Aponnt (vendedores, líderes, supervisores, etc.)",
        rowCountEstimate: "50-200",
        indexes: ["id (PK)", "email (UNIQUE)", "username (UNIQUE)", "role"],

        pendingChanges: [
          "UPDATE role ENUM → 11 new roles (ceo, regional_sales_manager, etc.)",
          "ADD regional_manager_id UUID → aponnt_staff(id)",
          "ADD ceo_id UUID → aponnt_staff(id)",
          "ADD sales_commission_percentage DECIMAL(5,2) DEFAULT 10.00",
          "ADD support_commission_percentage DECIMAL(5,2) DEFAULT 0.00",
          "ADD pyramid_commission_percentage DECIMAL(5,2) DEFAULT 0.00",
          "ADD accepts_support_packages BOOLEAN DEFAULT false",
          "ADD participates_in_auctions BOOLEAN DEFAULT false",
          "ADD cbu VARCHAR(22)",
          "ADD rating DECIMAL(3,1) DEFAULT 0.0",
          "ADD total_ratings INTEGER DEFAULT 0",
          "ADD notes TEXT",
          "ADD vendor_status ENUM (active, inactive_earning, suspended, terminated) DEFAULT 'active'"
        ],

        currentFields: [
          "id (UUID PK)",
          "first_name, last_name",
          "email (UNIQUE), username (UNIQUE)",
          "password (hashed)",
          "dni (UNIQUE), phone",
          "role (ENUM)",
          "leader_id → aponnt_staff(id)",
          "supervisor_id → aponnt_staff(id)",
          "is_active, first_login",
          "last_login_at",
          "created_by → aponnt_staff(id)",
          "created_at, updated_at"
        ]
      },

      vendor_statistics: {
        status: "PLANNED",
        purpose: "Estadísticas consolidadas de vendedores (auto-update con triggers)",
        rowCountEstimate: "50-200 (1 row per vendor)",
        indexes: ["vendor_id (UNIQUE)", "grand_total_commission_usd DESC", "rating DESC"],

        plannedFields: [
          "id (UUID PK)",
          "vendor_id → aponnt_staff(id) UNIQUE",
          "total_companies, sales_companies, support_companies",
          "total_users, sales_users, support_users",
          "sales_commission_percentage, total_sales_commission_usd, monthly_sales_commission_usd",
          "support_commission_percentage, total_support_commission_usd, monthly_support_commission_usd",
          "total_referrals, referral_commission_usd",
          "grand_total_commission_usd",
          "total_modules_value_usd",
          "rating, total_ratings",
          "cbu",
          "last_updated_at, created_at"
        ],

        triggers: ["AFTER INSERT/UPDATE ON companies → refresh_vendor_statistics()"],
        designDoc: "PARA-BACKEND-IMPLEMENTACION-COMPLETA.md"
      },

      attendance: {
        status: "PRODUCTION",
        purpose: "Registros de asistencia (check-in/out)",
        rowCountEstimate: "100,000-1,000,000+",
        indexes: ["id (PK)", "company_id", "user_id", "check_in_time", "kiosk_id"]
      },

      kiosks: {
        status: "PRODUCTION",
        purpose: "Kioscos biométricos",
        rowCountEstimate: "100-500",
        indexes: ["id (PK)", "company_id", "is_active"]
      },

      departments: {
        status: "PRODUCTION",
        purpose: "Departamentos de empresas",
        rowCountEstimate: "500-2,000",
        indexes: ["id (PK)", "company_id"]
      },

      shifts: {
        status: "PRODUCTION",
        purpose: "Turnos laborales",
        rowCountEstimate: "200-1,000",
        indexes: ["id (PK)", "company_id"]
      },

      notifications: {
        status: "PRODUCTION",
        purpose: "Notificaciones enterprise (workflows, multi-canal)",
        rowCountEstimate: "50,000-500,000",
        indexes: [
          "id (PK)",
          "company_id + module",
          "recipient_user_id + is_read",
          "priority + action_deadline",
          "action_status + requires_action",
          "metadata (GIN)"
        ]
      },

      notification_workflows: {
        status: "PRODUCTION",
        purpose: "Definición de workflows de aprobación",
        rowCountEstimate: "50-200",
        indexes: ["company_id + workflow_key (UNIQUE)", "company_id + module + is_active"]
      },

      partners: {
        status: "PRODUCTION",
        purpose: "Asociados (médicos, abogados, etc.)",
        rowCountEstimate: "100-500",
        indexes: ["id (PK)", "email (UNIQUE)", "category"]
      },

      // ============ TABLAS PLANIFICADAS (COMERCIALES) ============
      budgets: {
        status: "PLANNED",
        purpose: "Presupuestos versionados",
        rowCountEstimate: "1,000-10,000",

        plannedFields: [
          "id (UUID PK)",
          "company_id → companies(company_id)",
          "created_by_staff_id → aponnt_staff(id)",
          "modules (JSONB)",
          "monthly_total_usd DECIMAL(12,2)",
          "version INTEGER DEFAULT 1",
          "status (pending_approval, approved, rejected, expired)",
          "approved_at, approved_by_user_id",
          "expires_at",
          "trace_id UUID (trazabilidad)",
          "created_at, updated_at"
        ],

        indexes: ["company_id", "status", "trace_id"],
        designDoc: "ARQUITECTURA-COMPLETA-ERP-COMISIONES.md (PENDING)"
      },

      contracts: {
        status: "PLANNED",
        purpose: "Contratos con firma digital",
        rowCountEstimate: "1,000-10,000",

        plannedFields: [
          "id (UUID PK)",
          "budget_id → budgets(id)",
          "company_id → companies(company_id)",
          "modules (JSONB)",
          "monthly_total_usd DECIMAL(12,2)",
          "is_active BOOLEAN DEFAULT false",
          "version INTEGER DEFAULT 1",
          "status (pending_signature, signed, active, inactive)",
          "signature_type (EULA_checkbox)",
          "signed_at, signed_by_user_id",
          "signature_ip, signature_user_agent",
          "deactivated_at",
          "trace_id UUID",
          "created_at, updated_at"
        ],

        indexes: ["company_id + is_active", "budget_id", "trace_id"],
        constraint: "UNIQUE(company_id, is_active) WHERE is_active = true (solo uno vigente)",
        designDoc: "ARQUITECTURA-COMPLETA-ERP-COMISIONES.md (PENDING)"
      },

      invoices: {
        status: "PLANNED",
        purpose: "Facturas mensuales automáticas",
        rowCountEstimate: "5,000-50,000/año",

        plannedFields: [
          "id (UUID PK)",
          "contract_id → contracts(id)",
          "company_id → companies(company_id)",
          "period (YYYY-MM)",
          "amount_usd DECIMAL(12,2)",
          "status (pending, payment_proof_uploaded, paid, overdue)",
          "payment_proof_url VARCHAR(500)",
          "uploaded_at, uploaded_by_user_id",
          "confirmed_at, confirmed_by_staff_id → aponnt_staff(id)",
          "trace_id UUID",
          "created_at, updated_at"
        ],

        indexes: ["contract_id", "company_id", "period", "status", "trace_id"],
        designDoc: "ARQUITECTURA-COMPLETA-ERP-COMISIONES.md (PENDING)"
      },

      commission_liquidations: {
        status: "PLANNED",
        purpose: "Digest mensual de liquidación de comisiones",
        rowCountEstimate: "1,000-10,000/año",

        plannedFields: [
          "id (UUID PK)",
          "invoice_id → invoices(id)",
          "period (YYYY-MM)",
          "total_commissions_usd DECIMAL(12,2)",
          "total_payments INTEGER (cantidad de pagos individuales)",
          "status (pending, in_progress, completed)",
          "deadline TIMESTAMP",
          "completed_at",
          "trace_id UUID",
          "created_at, updated_at"
        ],

        indexes: ["invoice_id", "period", "status", "trace_id"],
        designDoc: "ARQUITECTURA-COMPLETA-ERP-COMISIONES.md (PENDING)"
      },

      commission_payments: {
        status: "PLANNED",
        purpose: "Pagos individuales de comisiones (vendedor, líder, supervisor, etc.)",
        rowCountEstimate: "5,000-50,000/año",

        plannedFields: [
          "id (UUID PK)",
          "liquidation_id → commission_liquidations(id)",
          "staff_id → aponnt_staff(id)",
          "payment_type (direct_sales, direct_support, pyramid_sales, referral)",
          "amount_usd DECIMAL(12,2)",
          "commission_percentage DECIMAL(5,2)",
          "source_company_id → companies(company_id)",
          "status (pending, transferred, confirmed)",
          "transferred_at, confirmed_at",
          "trace_id UUID",
          "created_at, updated_at"
        ],

        indexes: ["liquidation_id", "staff_id", "status", "trace_id"],
        designDoc: "ARQUITECTURA-COMPLETA-ERP-COMISIONES.md (PENDING)"
      },

      transfers: {
        status: "PLANNED",
        purpose: "Registro de transferencias bancarias",
        rowCountEstimate: "5,000-50,000/año",

        plannedFields: [
          "id (UUID PK)",
          "payment_id → commission_payments(id)",
          "bank_account_origin VARCHAR(50)",
          "bank_account_destination VARCHAR(50) (CBU del vendedor)",
          "bank_name_destination VARCHAR(100)",
          "amount_usd DECIMAL(12,2)",
          "transfer_reference VARCHAR(100)",
          "status (pending, executed, confirmed, failed)",
          "executed_at, executed_by_staff_id → aponnt_staff(id)",
          "confirmed_at, confirmed_by_staff_id",
          "proof_url VARCHAR(500)",
          "trace_id UUID",
          "created_at, updated_at"
        ],

        indexes: ["payment_id", "status", "trace_id"],
        designDoc: "ARQUITECTURA-COMPLETA-ERP-COMISIONES.md (PENDING)"
      },

      traceability_chain: {
        status: "PLANNED",
        purpose: "Registro completo de trazabilidad end-to-end",
        rowCountEstimate: "1,000-10,000/año",

        plannedFields: [
          "trace_id (UUID PK)",
          "invoice_id → invoices(id)",
          "contract_id → contracts(id)",
          "budget_id → budgets(id)",
          "liquidation_id → commission_liquidations(id)",
          "company_id → companies(company_id)",
          "period (YYYY-MM)",
          "vendor_chain (JSONB) - Array de staff_ids jerarquía",
          "total_invoice_amount_usd DECIMAL(12,2)",
          "total_commissions_usd DECIMAL(12,2)",
          "aponnt_margin_usd DECIMAL(12,2)",
          "metadata (JSONB) - Toda la info contextual",
          "created_at, updated_at"
        ],

        indexes: ["trace_id (PK)", "invoice_id", "company_id", "period"],
        description: "Con un trace_id puedes obtener toda la cadena: invoice → liquidation → payments → transfers → confirmations",
        designDoc: "ARQUITECTURA-COMPLETA-ERP-COMISIONES.md (PENDING)"
      },

      wallet_change_requests: {
        status: "PLANNED",
        purpose: "Solicitudes de cambio de billetera (workflow de confirmación)",
        rowCountEstimate: "100-500/año",

        plannedFields: [
          "id (UUID PK)",
          "staff_id → aponnt_staff(id)",
          "old_cbu VARCHAR(22)",
          "new_cbu VARCHAR(22)",
          "new_alias VARCHAR(50)",
          "new_bank_name VARCHAR(100)",
          "status (pending, confirmed, rejected, expired)",
          "deadline TIMESTAMP",
          "confirmed_at, rejected_at",
          "created_at, updated_at"
        ],

        indexes: ["staff_id", "status"],
        designDoc: "Workflow walletChangeConfirmation"
      }
    },

    postgresqlFunctions: {
      calculate_pyramid_commission: {
        status: "PLANNED",
        purpose: "Calcular comisión piramidal de un staff según su rol",
        params: ["p_staff_id UUID", "p_month INTEGER", "p_year INTEGER"],
        returns: "DECIMAL(12,2)",
        designDoc: "PARA-BACKEND-IMPLEMENTACION-COMPLETA.md"
      },
      refresh_vendor_statistics: {
        status: "PLANNED",
        purpose: "Recalcular estadísticas de un vendedor",
        params: ["p_vendor_id UUID"],
        returns: "VOID",
        trigger: "AFTER INSERT/UPDATE ON companies",
        designDoc: "PARA-BACKEND-IMPLEMENTACION-COMPLETA.md"
      }
    }
  },

  // ==================== ROADMAP ====================
  roadmap: {
    phase1_vendorHierarchy: {
      name: "Sistema de Jerarquía y Comisiones de Vendedores",
      status: "IN_PROGRESS",
      startDate: "2025-01-19",
      estimatedCompletion: "2025-01-26",
      progress: 40,

      tasks: [
        { id: "VH-1", name: "Migración DB: ALTER TABLE companies", done: false, assignedTo: "Backend session" },
        { id: "VH-2", name: "Migración DB: ALTER TABLE aponnt_staff", done: false, assignedTo: "Backend session" },
        { id: "VH-3", name: "Migración DB: CREATE TABLE vendor_statistics", done: false, assignedTo: "Backend session" },
        { id: "VH-4", name: "Función PostgreSQL: calculate_pyramid_commission", done: false, assignedTo: "Backend session" },
        { id: "VH-5", name: "Función PostgreSQL: refresh_vendor_statistics", done: false, assignedTo: "Backend session" },
        { id: "VH-6", name: "Triggers automáticos", done: false, assignedTo: "Backend session" },
        { id: "VH-7", name: "Modelo Sequelize: VendorStatistics", done: false, assignedTo: "Backend session" },
        { id: "VH-8", name: "Actualizar modelo AponntStaff", done: false, assignedTo: "Backend session" },
        { id: "VH-9", name: "API: GET /vendors/:id/statistics", done: false, assignedTo: "Backend session" },
        { id: "VH-10", name: "API: GET /staff/:id/commission", done: false, assignedTo: "Backend session" },
        { id: "VH-11", name: "API: GET /staff/:id/subordinates", done: false, assignedTo: "Backend session" },
        { id: "VH-12", name: "API: Filtros multi-tenant en GET /companies", done: false, assignedTo: "Backend session" },
        { id: "VH-13", name: "Frontend: Campo ROL en formulario vendedores", done: false, assignedTo: "Frontend session" },
        { id: "VH-14", name: "Frontend: Campos jerárquicos (líder, supervisor, etc.)", done: false, assignedTo: "Frontend session" },
        { id: "VH-15", name: "Frontend: Listado vendedores con stats reales", done: false, assignedTo: "Frontend session" },
        { id: "VH-16", name: "Testing: Login con diferentes roles", done: false },
        { id: "VH-17", name: "Testing: Cálculo de comisiones piramidales", done: false },
        { id: "VH-18", name: "Migración de datos: vendors.json → aponnt_staff", done: false, assignedTo: "Backend session" },
        { id: "VH-19", name: "Eliminar VendorMemory.js y vendors.json", done: false, assignedTo: "Backend session" }
      ],

      documentReference: "PARA-BACKEND-IMPLEMENTACION-COMPLETA.md",
      estimatedEffort: "60-80 horas",
      priority: "HIGH"
    },

    phase2_budgetsContracts: {
      name: "Sistema de Presupuestos y Contratos",
      status: "PLANNED",
      startDate: "2025-01-27",
      estimatedCompletion: "2025-02-10",
      progress: 0,

      tasks: [
        { id: "BC-1", name: "Diseño completo de arquitectura", done: false },
        { id: "BC-2", name: "Migración DB: CREATE TABLE budgets", done: false },
        { id: "BC-3", name: "Migración DB: CREATE TABLE contracts", done: false },
        { id: "BC-4", name: "Migración DB: CREATE TABLE budget_approvals", done: false },
        { id: "BC-5", name: "Migración DB: CREATE TABLE contract_signatures", done: false },
        { id: "BC-6", name: "Modelos Sequelize", done: false },
        { id: "BC-7", name: "Workflow: contractModification", done: false },
        { id: "BC-8", name: "API: Presupuestos CRUD", done: false },
        { id: "BC-9", name: "API: Contratos CRUD", done: false },
        { id: "BC-10", name: "Frontend: Módulo de presupuestos", done: false },
        { id: "BC-11", name: "Frontend: Firma digital EULA", done: false },
        { id: "BC-12", name: "Integración con notificaciones", done: false },
        { id: "BC-13", name: "Testing end-to-end", done: false }
      ],

      documentReference: "ARQUITECTURA-COMPLETA-ERP-COMISIONES.md (PENDING)",
      estimatedEffort: "90-120 horas",
      priority: "HIGH",
      dependencies: ["phase1_vendorHierarchy"]
    },

    phase3_invoicing: {
      name: "Sistema de Facturación Automática",
      status: "PLANNED",
      startDate: "2025-02-11",
      estimatedCompletion: "2025-02-25",
      progress: 0,

      tasks: [
        { id: "INV-1", name: "Migración DB: CREATE TABLE invoices", done: false },
        { id: "INV-2", name: "Migración DB: CREATE TABLE payment_confirmations", done: false },
        { id: "INV-3", name: "Cron job: Facturación día 1", done: false },
        { id: "INV-4", name: "Workflow: monthlyInvoicing", done: false },
        { id: "INV-5", name: "API: Invoices CRUD", done: false },
        { id: "INV-6", name: "Frontend: Módulo de facturación", done: false },
        { id: "INV-7", name: "Frontend: Upload de comprobantes", done: false },
        { id: "INV-8", name: "Módulo de cobranzas (básico)", done: false },
        { id: "INV-9", name: "Testing cron job", done: false }
      ],

      documentReference: "ARQUITECTURA-COMPLETA-ERP-COMISIONES.md (PENDING)",
      estimatedEffort: "60-80 horas",
      priority: "HIGH",
      dependencies: ["phase2_budgetsContracts"]
    },

    phase4_commissionLiquidation: {
      name: "Sistema de Liquidación de Comisiones",
      status: "PLANNED",
      startDate: "2025-02-26",
      estimatedCompletion: "2025-03-15",
      progress: 0,

      tasks: [
        { id: "LIQ-1", name: "Migración DB: CREATE TABLE commission_liquidations", done: false },
        { id: "LIQ-2", name: "Migración DB: CREATE TABLE commission_payments", done: false },
        { id: "LIQ-3", name: "Migración DB: CREATE TABLE transfers", done: false },
        { id: "LIQ-4", name: "Migración DB: CREATE TABLE traceability_chain", done: false },
        { id: "LIQ-5", name: "Workflow: monthlyCommissionLiquidation", done: false },
        { id: "LIQ-6", name: "API: Liquidations CRUD", done: false },
        { id: "LIQ-7", name: "API: Transfers management", done: false },
        { id: "LIQ-8", name: "Frontend: Módulo de liquidaciones", done: false },
        { id: "LIQ-9", name: "Frontend: Trazabilidad visual", done: false },
        { id: "LIQ-10", name: "Sistema de confirmaciones", done: false },
        { id: "LIQ-11", name: "Testing trazabilidad end-to-end", done: false }
      ],

      documentReference: "ARQUITECTURA-COMPLETA-ERP-COMISIONES.md (PENDING)",
      estimatedEffort: "80-120 horas",
      priority: "HIGH",
      dependencies: ["phase3_invoicing"]
    },

    phase5_mobileApps: {
      name: "Aplicaciones Móviles (Empleados, Vendedores, Asociados)",
      status: "PLANNED",
      startDate: "2025-03-16",
      estimatedCompletion: "2025-05-30",
      progress: 0,

      subphases: {
        subphase1_employeeApp: {
          name: "APK Empleados (Android + iOS)",
          estimatedEffort: "120-160 horas",
          priority: "HIGH"
        },
        subphase2_vendorApp: {
          name: "APK Vendedores/Soporte/Líderes (Android + iOS)",
          estimatedEffort: "150-200 horas",
          priority: "HIGH"
        },
        subphase3_partnerApp: {
          name: "APK Asociados (Android + iOS)",
          estimatedEffort: "80-120 horas",
          priority: "MEDIUM"
        }
      },

      tasks: [
        { id: "MOB-1", name: "Decisión de framework (React Native vs Flutter)", done: false },
        { id: "MOB-2", name: "Setup de proyecto base", done: false },
        { id: "MOB-3", name: "Diseño UI/UX", done: false },
        { id: "MOB-4", name: "Implementación APK Empleados", done: false },
        { id: "MOB-5", name: "Implementación APK Vendedores", done: false },
        { id: "MOB-6", name: "Implementación APK Asociados", done: false },
        { id: "MOB-7", name: "Push notifications", done: false },
        { id: "MOB-8", name: "Testing en devices reales", done: false },
        { id: "MOB-9", name: "Publicación en stores", done: false }
      ],

      estimatedEffort: "350-480 horas total",
      priority: "HIGH",
      dependencies: ["phase4_commissionLiquidation"]
    },

    phase6_enhancements: {
      name: "Mejoras y Optimizaciones",
      status: "PLANNED",
      startDate: "2025-06-01",
      estimatedCompletion: "ONGOING",
      progress: 0,

      areas: [
        "Performance optimization",
        "Security hardening",
        "Analytics and reporting",
        "Advanced AI features",
        "Integration with external systems"
      ]
    }
  },

  // ==================== DEPRECATED / PENDIENTE ELIMINACIÓN ====================
  deprecated: {
    vendorsJson: {
      file: "src/models/VendorMemory.js",
      dataFile: "data/vendors.json",
      reason: "Duplicate of aponnt_staff table - data should be in PostgreSQL",
      replacedBy: "aponnt_staff table + Sequelize model",
      removeInPhase: "phase1_vendorHierarchy",
      status: "PENDING_REMOVAL",
      migrationScript: "scripts/migrate-vendors-to-aponnt-staff.js",
      lastUpdated: "2025-01-19"
    }
  },

  // ==================== INSTRUCCIONES PARA CLAUDE CODE ====================
  claudeInstructions: {
    beforeCoding: [
      "ALWAYS read this file first (engineering-metadata.js)",
      "Check module.status before modifying anything",
      "Check deprecated section - NEVER use deprecated code",
      "Check knownIssues for existing problems",
      "Check dependencies before creating new features",
      "Reference designDoc for implementation details",
      "Update this file when completing tasks"
    ],

    whenCreatingNewFeature: [
      "Check if it already exists in modules section",
      "Check if it's in roadmap (maybe already planned)",
      "Check dependencies - does it need other features first?",
      "Add to roadmap with estimates if it's new",
      "Document in designDoc before coding"
    ],

    whenModifyingExisting: [
      "Check module.knownIssues first",
      "Check if there are pendingMigrations",
      "Update progress when done",
      "Update lastUpdated timestamp",
      "Add to knownIssues if you find bugs"
    ],

    whenStuck: [
      "Check workflows section for process flows",
      "Check database.tables for schema info",
      "Check techStack for technology decisions",
      "Check designDoc for detailed specs",
      "Check knownIssues - maybe it's a known problem"
    ],

    updateThisFile: [
      "When completing a task: update progress + status",
      "When finding a bug: add to knownIssues",
      "When creating a table: add to database.tables",
      "When deprecating code: add to deprecated section",
      "When planning new feature: add to roadmap",
      "ALWAYS update lastUpdated timestamp"
    ]
  },

  // ==================== METADATA FINAL ====================
  meta: {
    fileVersion: "1.0.0",
    lastFullUpdate: "2025-01-19T15:30:00Z",
    maintainedBy: "Claude Code + Development Team",
    purpose: "Single source of truth for entire system architecture",
    consumedBy: [
      "Engineering Dashboard (UI)",
      "Claude Code (before coding)",
      "Development Team (planning)",
      "Documentation generators"
    ]
  }
};
