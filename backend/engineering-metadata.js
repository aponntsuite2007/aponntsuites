/**
 * ============================================================================
 * ENGINEERING METADATA - Auto-generado por MetadataWriter
 * ============================================================================
 *
 * Este archivo se auto-actualiza cada 5 minutos con metadata EN VIVO del sistema.
 * NO editar manualmente - los cambios se sobrescribirán.
 *
 * Generado: 2026-01-08T00:26:38.142Z
 * Módulos: 215
 * Última actualización: 1206
 *
 * ============================================================================
 */

const engineeringMetadata = {
  "generatedAt": "2026-01-08T00:22:59.420Z",
  "source": "live-introspection",
  "generator": "EcosystemBrainService",
  "version": "2.0.0-live",
  "modules": {
    "absence": {
      "name": "absence",
      "generatedAt": "2026-01-08T00:22:59.425Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\absenceRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/absence/test",
          "file": "absenceRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 9,
      "lastModified": "2025-09-22T16:11:30.374Z",
      "complexity": "simple"
    },
    "accessControl": {
      "name": "accessControl",
      "generatedAt": "2026-01-08T00:23:00.108Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\accessControlRoutes.js",
          "src\\services\\AccessControlService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "auth",
          "AccessControlService",
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/accessControl/check",
          "file": "accessControlRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/accessControl/my-permissions",
          "file": "accessControlRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/accessControl/can-view-employee/:employeeId",
          "file": "accessControlRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/accessControl/roles",
          "file": "accessControlRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/accessControl/roles",
          "file": "accessControlRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/accessControl/roles/:roleId",
          "file": "accessControlRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/accessControl/roles/:roleId",
          "file": "accessControlRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/accessControl/users/:userId/roles",
          "file": "accessControlRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/accessControl/users/:userId/roles",
          "file": "accessControlRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/accessControl/users/:userId/roles/:roleId",
          "file": "accessControlRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/accessControl/permissions-matrix",
          "file": "accessControlRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/accessControl/modules",
          "file": "accessControlRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/accessControl/check-dependencies/:moduleKey",
          "file": "accessControlRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 993,
      "lastModified": "2025-12-16T13:34:18.868Z",
      "complexity": "complex"
    },
    "admin-migrations": {
      "name": "admin-migrations",
      "generatedAt": "2026-01-08T00:23:00.837Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\admin-migrations.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/admin-migrations/migrate-notifications",
          "file": "admin-migrations.js"
        },
        {
          "method": "GET",
          "path": "/api/admin-migrations/check-tables",
          "file": "admin-migrations.js"
        },
        {
          "method": "POST",
          "path": "/api/admin-migrations/migrate-attendance-justification",
          "file": "admin-migrations.js"
        },
        {
          "method": "POST",
          "path": "/api/admin-migrations/migrate-kiosk-security",
          "file": "admin-migrations.js"
        },
        {
          "method": "POST",
          "path": "/api/admin-migrations/fix-icon-column",
          "file": "admin-migrations.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 295,
      "lastModified": "2025-12-18T15:40:23.274Z",
      "complexity": "moderate"
    },
    "admin": {
      "name": "admin",
      "generatedAt": "2026-01-08T00:23:01.489Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\models\\AdministrativeTask.js",
          "src\\routes\\admin-migrations.js",
          "src\\routes\\adminRoutes.js",
          "src\\routes\\userAdminRoutes.js",
          "src\\services\\admin-panel-websocket.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/admin/statistics/hr-cube",
          "file": "adminRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/admin/questionnaires",
          "file": "adminRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/admin/questionnaires",
          "file": "adminRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/admin/questionnaires/:id",
          "file": "adminRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/admin/questionnaires/:id/toggle",
          "file": "adminRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/admin/questionnaires/:id",
          "file": "adminRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "administrative_tasks",
          "model": "AdministrativeTask",
          "file": "AdministrativeTask.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 1521,
      "lastModified": "2026-01-04T02:13:03.254Z",
      "complexity": "complex"
    },
    "afip": {
      "name": "afip",
      "generatedAt": "2026-01-08T00:23:02.066Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\afipRoutes.js",
          "src\\services\\afip\\AfipAuthService.js",
          "src\\services\\afip\\AfipBillingService.js",
          "src\\services\\afip\\AfipCertificateManager.js",
          "src\\services\\afip\\utils\\afip-constants.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "AfipBillingService",
          "AfipAuthService",
          "AfipCertificateManager",
          "auth"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/afip/certificates/upload",
          "file": "afipRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/afip/certificates/validate",
          "file": "afipRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/afip/certificates",
          "file": "afipRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/afip/auth/token",
          "file": "afipRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/afip/auth/invalidate",
          "file": "afipRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/afip/cae/solicitar/:invoiceId",
          "file": "afipRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/afip/cae/consultar",
          "file": "afipRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/afip/cae/log",
          "file": "afipRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/afip/config",
          "file": "afipRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/afip/config",
          "file": "afipRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/afip/puntos-venta",
          "file": "afipRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/afip/puntos-venta",
          "file": "afipRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 2303,
      "lastModified": "2025-12-16T13:34:18.996Z",
      "complexity": "complex"
    },
    "ai-analysis-api": {
      "name": "ai-analysis-api",
      "generatedAt": "2026-01-08T00:23:02.593Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\ai-analysis-api.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "ai-analysis-engine"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/ai-analysis-api/harvard/emotional",
          "file": "ai-analysis-api.js"
        },
        {
          "method": "POST",
          "path": "/api/ai-analysis-api/mit/behavioral",
          "file": "ai-analysis-api.js"
        },
        {
          "method": "POST",
          "path": "/api/ai-analysis-api/stanford/facial",
          "file": "ai-analysis-api.js"
        },
        {
          "method": "POST",
          "path": "/api/ai-analysis-api/who/health",
          "file": "ai-analysis-api.js"
        },
        {
          "method": "POST",
          "path": "/api/ai-analysis-api/comprehensive",
          "file": "ai-analysis-api.js"
        },
        {
          "method": "POST",
          "path": "/api/ai-analysis-api/test-simulation",
          "file": "ai-analysis-api.js"
        },
        {
          "method": "GET",
          "path": "/api/ai-analysis-api/stats",
          "file": "ai-analysis-api.js"
        },
        {
          "method": "GET",
          "path": "/api/ai-analysis-api/health",
          "file": "ai-analysis-api.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 352,
      "lastModified": "2025-09-26T14:04:56.431Z",
      "complexity": "moderate"
    },
    "aMiMePaso": {
      "name": "aMiMePaso",
      "generatedAt": "2026-01-08T00:23:03.165Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\aMiMePasoRoutes.js",
          "src\\services\\AMiMePasoService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "AMiMePasoService",
          "auth"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/aMiMePaso/search",
          "file": "aMiMePasoRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/aMiMePaso/popular-searches",
          "file": "aMiMePasoRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/aMiMePaso/knowledge-gaps",
          "file": "aMiMePasoRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/aMiMePaso/feedback",
          "file": "aMiMePasoRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/aMiMePaso/autocomplete",
          "file": "aMiMePasoRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 754,
      "lastModified": "2026-01-04T02:13:03.265Z",
      "complexity": "complex"
    },
    "apk": {
      "name": "apk",
      "generatedAt": "2026-01-08T00:23:03.850Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\apkRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/apk/download/:companyId?",
          "file": "apkRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/apk/info",
          "file": "apkRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/apk/send-whatsapp",
          "file": "apkRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/apk/whatsapp-config",
          "file": "apkRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/apk/config/:companyId",
          "file": "apkRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/apk/log-action",
          "file": "apkRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/apk/generate-qrs/:companyId",
          "file": "apkRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/apk/setup/:setupCode",
          "file": "apkRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 569,
      "lastModified": "2025-09-25T22:50:55.927Z",
      "complexity": "complex"
    },
    "aponntAuth": {
      "name": "aponntAuth",
      "generatedAt": "2026-01-08T00:23:04.541Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\aponntAuthRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/aponntAuth/staff/login",
          "file": "aponntAuthRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/aponntAuth/partner/login",
          "file": "aponntAuthRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/aponntAuth/staff/change-password",
          "file": "aponntAuthRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/aponntAuth/partner/change-password",
          "file": "aponntAuthRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/aponntAuth/staff/me",
          "file": "aponntAuthRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/aponntAuth/partner/me",
          "file": "aponntAuthRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 633,
      "lastModified": "2025-12-16T13:34:18.707Z",
      "complexity": "complex"
    },
    "aponntBilling": {
      "name": "aponntBilling",
      "generatedAt": "2026-01-08T00:23:05.717Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\aponntBillingRoutes.js",
          "src\\services\\AponntBillingService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "AponntBillingService"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/aponntBilling/dashboard/stats",
          "file": "aponntBillingRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/aponntBilling/pre-invoices",
          "file": "aponntBillingRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/aponntBilling/pre-invoices/:id",
          "file": "aponntBillingRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/aponntBilling/pre-invoices/from-contract/:contractId",
          "file": "aponntBillingRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/aponntBilling/pre-invoices/:id/approve",
          "file": "aponntBillingRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/aponntBilling/pre-invoices/:id/reject",
          "file": "aponntBillingRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/aponntBilling/pre-invoices/:id/invoice",
          "file": "aponntBillingRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/aponntBilling/admin-tasks",
          "file": "aponntBillingRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/aponntBilling/email-config",
          "file": "aponntBillingRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/aponntBilling/email-config/:type",
          "file": "aponntBillingRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/aponntBilling/email-config/:type",
          "file": "aponntBillingRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/aponntBilling/master-id",
          "file": "aponntBillingRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 1033,
      "lastModified": "2026-01-07T11:28:52.816Z",
      "complexity": "complex"
    },
    "aponntDashboard": {
      "name": "aponntDashboard",
      "generatedAt": "2026-01-08T00:23:06.645Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\aponntDashboard.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "database",
          "AponntNotificationService",
          "BranchMemory",
          "UserMemory",
          "PaymentMemory",
          "VendorMemory",
          "engineering-metadata",
          "CompanyMemory"
        ],
        "optional": [
          "CompanyMemory"
        ],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/aponntDashboard/test",
          "file": "aponntDashboard.js"
        },
        {
          "method": "GET",
          "path": "/api/aponntDashboard/payments",
          "file": "aponntDashboard.js"
        },
        {
          "method": "GET",
          "path": "/api/aponntDashboard/pricing",
          "file": "aponntDashboard.js"
        },
        {
          "method": "GET",
          "path": "/api/aponntDashboard/admin/operators",
          "file": "aponntDashboard.js"
        },
        {
          "method": "POST",
          "path": "/api/aponntDashboard/admin/operators",
          "file": "aponntDashboard.js"
        },
        {
          "method": "GET",
          "path": "/api/aponntDashboard/debug/companies-structure",
          "file": "aponntDashboard.js"
        },
        {
          "method": "GET",
          "path": "/api/aponntDashboard/companies/:id/modules",
          "file": "aponntDashboard.js"
        },
        {
          "method": "GET",
          "path": "/api/aponntDashboard/companies",
          "file": "aponntDashboard.js"
        },
        {
          "method": "GET",
          "path": "/api/aponntDashboard/companies/:id",
          "file": "aponntDashboard.js"
        },
        {
          "method": "POST",
          "path": "/api/aponntDashboard/companies",
          "file": "aponntDashboard.js"
        },
        {
          "method": "PUT",
          "path": "/api/aponntDashboard/companies/:id",
          "file": "aponntDashboard.js"
        },
        {
          "method": "DELETE",
          "path": "/api/aponntDashboard/companies/:id",
          "file": "aponntDashboard.js"
        },
        {
          "method": "GET",
          "path": "/api/aponntDashboard/pricing",
          "file": "aponntDashboard.js"
        },
        {
          "method": "PUT",
          "path": "/api/aponntDashboard/pricing",
          "file": "aponntDashboard.js"
        },
        {
          "method": "POST",
          "path": "/api/aponntDashboard/companies",
          "file": "aponntDashboard.js"
        },
        {
          "method": "PUT",
          "path": "/api/aponntDashboard/companies/:id",
          "file": "aponntDashboard.js"
        },
        {
          "method": "PUT",
          "path": "/api/aponntDashboard/companies/:id/status",
          "file": "aponntDashboard.js"
        },
        {
          "method": "GET",
          "path": "/api/aponntDashboard/billing",
          "file": "aponntDashboard.js"
        },
        {
          "method": "POST",
          "path": "/api/aponntDashboard/billing/generate",
          "file": "aponntDashboard.js"
        },
        {
          "method": "GET",
          "path": "/api/aponntDashboard/payments",
          "file": "aponntDashboard.js"
        },
        {
          "method": "POST",
          "path": "/api/aponntDashboard/payments/process",
          "file": "aponntDashboard.js"
        },
        {
          "method": "GET",
          "path": "/api/aponntDashboard/pricing",
          "file": "aponntDashboard.js"
        },
        {
          "method": "PUT",
          "path": "/api/aponntDashboard/pricing",
          "file": "aponntDashboard.js"
        },
        {
          "method": "GET",
          "path": "/api/aponntDashboard/dashboard/stats",
          "file": "aponntDashboard.js"
        },
        {
          "method": "GET",
          "path": "/api/aponntDashboard/stats",
          "file": "aponntDashboard.js"
        },
        {
          "method": "GET",
          "path": "/api/aponntDashboard/branches/:companyId",
          "file": "aponntDashboard.js"
        },
        {
          "method": "POST",
          "path": "/api/aponntDashboard/branches",
          "file": "aponntDashboard.js"
        },
        {
          "method": "PUT",
          "path": "/api/aponntDashboard/branches/:id",
          "file": "aponntDashboard.js"
        },
        {
          "method": "DELETE",
          "path": "/api/aponntDashboard/branches/:id",
          "file": "aponntDashboard.js"
        },
        {
          "method": "GET",
          "path": "/api/aponntDashboard/branches/detail/:id",
          "file": "aponntDashboard.js"
        },
        {
          "method": "POST",
          "path": "/api/aponntDashboard/branches/geocode",
          "file": "aponntDashboard.js"
        },
        {
          "method": "POST",
          "path": "/api/aponntDashboard/geocode-company",
          "file": "aponntDashboard.js"
        },
        {
          "method": "GET",
          "path": "/api/aponntDashboard/branches/nearby",
          "file": "aponntDashboard.js"
        },
        {
          "method": "GET",
          "path": "/api/aponntDashboard/users/:companyId",
          "file": "aponntDashboard.js"
        },
        {
          "method": "POST",
          "path": "/api/aponntDashboard/users/reset-password/:userId",
          "file": "aponntDashboard.js"
        },
        {
          "method": "POST",
          "path": "/api/aponntDashboard/users/change-password/:userId",
          "file": "aponntDashboard.js"
        },
        {
          "method": "POST",
          "path": "/api/aponntDashboard/users/authenticate",
          "file": "aponntDashboard.js"
        },
        {
          "method": "POST",
          "path": "/api/aponntDashboard/users/create-admin/:companyId",
          "file": "aponntDashboard.js"
        },
        {
          "method": "POST",
          "path": "/api/aponntDashboard/users",
          "file": "aponntDashboard.js"
        },
        {
          "method": "PUT",
          "path": "/api/aponntDashboard/users/:id",
          "file": "aponntDashboard.js"
        },
        {
          "method": "DELETE",
          "path": "/api/aponntDashboard/users/:id",
          "file": "aponntDashboard.js"
        },
        {
          "method": "POST",
          "path": "/api/aponntDashboard/users/:id/reset-password",
          "file": "aponntDashboard.js"
        },
        {
          "method": "GET",
          "path": "/api/aponntDashboard/payments",
          "file": "aponntDashboard.js"
        },
        {
          "method": "POST",
          "path": "/api/aponntDashboard/payments",
          "file": "aponntDashboard.js"
        },
        {
          "method": "GET",
          "path": "/api/aponntDashboard/payments/:id",
          "file": "aponntDashboard.js"
        },
        {
          "method": "PUT",
          "path": "/api/aponntDashboard/payments/:id",
          "file": "aponntDashboard.js"
        },
        {
          "method": "DELETE",
          "path": "/api/aponntDashboard/payments/:id",
          "file": "aponntDashboard.js"
        },
        {
          "method": "GET",
          "path": "/api/aponntDashboard/payments/company/:companyId",
          "file": "aponntDashboard.js"
        },
        {
          "method": "GET",
          "path": "/api/aponntDashboard/payments/vendor/:vendorName",
          "file": "aponntDashboard.js"
        },
        {
          "method": "POST",
          "path": "/api/aponntDashboard/generate-monthly-invoices",
          "file": "aponntDashboard.js"
        },
        {
          "method": "PUT",
          "path": "/api/aponntDashboard/companies/:id/status",
          "file": "aponntDashboard.js"
        },
        {
          "method": "GET",
          "path": "/api/aponntDashboard/vendors",
          "file": "aponntDashboard.js"
        },
        {
          "method": "GET",
          "path": "/api/aponntDashboard/vendors/active",
          "file": "aponntDashboard.js"
        },
        {
          "method": "GET",
          "path": "/api/aponntDashboard/vendors/:id",
          "file": "aponntDashboard.js"
        },
        {
          "method": "POST",
          "path": "/api/aponntDashboard/vendors",
          "file": "aponntDashboard.js"
        },
        {
          "method": "PUT",
          "path": "/api/aponntDashboard/vendors/:id",
          "file": "aponntDashboard.js"
        },
        {
          "method": "DELETE",
          "path": "/api/aponntDashboard/vendors/:id",
          "file": "aponntDashboard.js"
        },
        {
          "method": "GET",
          "path": "/api/aponntDashboard/vendors/:id/stats",
          "file": "aponntDashboard.js"
        },
        {
          "method": "POST",
          "path": "/api/aponntDashboard/vendors/:id/preliquidation",
          "file": "aponntDashboard.js"
        },
        {
          "method": "POST",
          "path": "/api/aponntDashboard/vendors/preliquidation/all",
          "file": "aponntDashboard.js"
        },
        {
          "method": "GET",
          "path": "/api/aponntDashboard/dashboard/vendors",
          "file": "aponntDashboard.js"
        },
        {
          "method": "POST",
          "path": "/api/aponntDashboard/companies/:companyId/support-tools/assign",
          "file": "aponntDashboard.js"
        },
        {
          "method": "DELETE",
          "path": "/api/aponntDashboard/companies/:companyId/support-tools/unassign",
          "file": "aponntDashboard.js"
        },
        {
          "method": "GET",
          "path": "/api/aponntDashboard/companies/:companyId/support-tools/status",
          "file": "aponntDashboard.js"
        },
        {
          "method": "GET",
          "path": "/api/aponntDashboard/contracts",
          "file": "aponntDashboard.js"
        },
        {
          "method": "GET",
          "path": "/api/aponntDashboard/budgets",
          "file": "aponntDashboard.js"
        },
        {
          "method": "GET",
          "path": "/api/aponntDashboard/commercial-notifications",
          "file": "aponntDashboard.js"
        },
        {
          "method": "PUT",
          "path": "/api/aponntDashboard/commercial-notifications/:id/read",
          "file": "aponntDashboard.js"
        },
        {
          "method": "GET",
          "path": "/api/aponntDashboard/vendor-metrics",
          "file": "aponntDashboard.js"
        },
        {
          "method": "GET",
          "path": "/api/aponntDashboard/modules-pricing",
          "file": "aponntDashboard.js"
        },
        {
          "method": "GET",
          "path": "/api/aponntDashboard/vendor-commissions",
          "file": "aponntDashboard.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 4274,
      "lastModified": "2026-01-04T02:13:03.212Z",
      "complexity": "complex"
    },
    "aponntStaffAuth": {
      "name": "aponntStaffAuth",
      "generatedAt": "2026-01-08T00:23:07.536Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\aponntStaffAuthRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/aponntStaffAuth/login",
          "file": "aponntStaffAuthRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/aponntStaffAuth/verify",
          "file": "aponntStaffAuthRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/aponntStaffAuth/logout",
          "file": "aponntStaffAuthRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "aponnt_staff",
          "model": "AponntStaff",
          "file": "AponntStaff.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 302,
      "lastModified": "2025-12-16T13:34:18.709Z",
      "complexity": "moderate"
    },
    "aponntStaff": {
      "name": "aponntStaff",
      "generatedAt": "2026-01-08T00:23:08.222Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\models\\AponntStaff.js",
          "src\\models\\AponntStaffCompany.js",
          "src\\models\\AponntStaffRole.js",
          "src\\routes\\aponntStaffAuthRoutes.js",
          "src\\routes\\aponntStaffRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/aponntStaff/",
          "file": "aponntStaffRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/aponntStaff/roles",
          "file": "aponntStaffRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/aponntStaff/vendors",
          "file": "aponntStaffRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/aponntStaff/:id",
          "file": "aponntStaffRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/aponntStaff/",
          "file": "aponntStaffRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/aponntStaff/:id",
          "file": "aponntStaffRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/aponntStaff/:id",
          "file": "aponntStaffRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/aponntStaff/organigrama/data",
          "file": "aponntStaffRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "aponnt_staff",
          "model": "AponntStaff",
          "file": "AponntStaff.js"
        },
        {
          "table": "aponnt_staff_companies",
          "model": "AponntStaffCompany",
          "file": "AponntStaffCompany.js"
        },
        {
          "table": "aponnt_staff_roles",
          "model": "AponntStaffRole",
          "file": "AponntStaffRole.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 1553,
      "lastModified": "2026-01-04T02:13:03.213Z",
      "complexity": "complex"
    },
    "assistant": {
      "name": "assistant",
      "generatedAt": "2026-01-08T00:23:09.149Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\models\\AssistantConversation.js",
          "src\\models\\AssistantKnowledgeBase.js",
          "src\\models\\SupportAssistantAttempt.js",
          "src\\routes\\assistantRoutes.js",
          "src\\services\\AssistantService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/assistant/chat",
          "file": "assistantRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/assistant/feedback",
          "file": "assistantRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/assistant/history",
          "file": "assistantRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/assistant/stats",
          "file": "assistantRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/assistant/health",
          "file": "assistantRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/assistant/:id",
          "file": "assistantRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/assistant/marketing/paper",
          "file": "assistantRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/assistant/marketing/summary",
          "file": "assistantRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/assistant/escalate-to-ticket",
          "file": "assistantRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "assistant_conversations",
          "model": "AssistantConversation",
          "file": "AssistantConversation.js"
        },
        {
          "table": "assistant_knowledge_base",
          "model": "AssistantKnowledgeBase",
          "file": "AssistantKnowledgeBase.js"
        },
        {
          "table": "support_assistant_attempts",
          "model": "SupportAssistantAttempt",
          "file": "SupportAssistantAttempt.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 2399,
      "lastModified": "2026-01-04T02:13:03.267Z",
      "complexity": "complex"
    },
    "associate": {
      "name": "associate",
      "generatedAt": "2026-01-08T00:23:10.021Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\associateRoutes.js",
          "src\\routes\\associateWorkflowRoutes.js",
          "src\\services\\AssociateService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "auth",
          "AssociateService",
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/associate/auth/login",
          "file": "associateRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/associate/auth/verify-token",
          "file": "associateRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/associate/dashboard/stats",
          "file": "associateRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/associate/my-companies",
          "file": "associateRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/associate/my-cases",
          "file": "associateRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/associate/billing",
          "file": "associateRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/associate/profile",
          "file": "associateRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/associate/categories",
          "file": "associateRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/associate/search",
          "file": "associateRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/associate/:associateId",
          "file": "associateRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/associate/contracts/my-company",
          "file": "associateRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/associate/contracts",
          "file": "associateRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/associate/contracts/:contractId/pause",
          "file": "associateRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/associate/contracts/:contractId/activate",
          "file": "associateRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/associate/contracts/:contractId",
          "file": "associateRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/associate/contracts/:contractId/employees",
          "file": "associateRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/associate/contracts/:contractId/available-employees",
          "file": "associateRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/associate/contracts/:contractId/employees",
          "file": "associateRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/associate/contracts/:contractId/employees",
          "file": "associateRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/associate/my-companies",
          "file": "associateRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 1743,
      "lastModified": "2025-12-16T13:34:18.874Z",
      "complexity": "complex"
    },
    "associateWorkflow": {
      "name": "associateWorkflow",
      "generatedAt": "2026-01-08T00:23:10.895Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\associateWorkflowRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/associateWorkflow/overview",
          "file": "associateWorkflowRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/associateWorkflow/billing-summary",
          "file": "associateWorkflowRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/associateWorkflow/associate/:associateId",
          "file": "associateWorkflowRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/associateWorkflow/companies",
          "file": "associateWorkflowRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/associateWorkflow/stats",
          "file": "associateWorkflowRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 287,
      "lastModified": "2025-12-16T13:34:18.713Z",
      "complexity": "moderate"
    },
    "attendanceAdvancedStats": {
      "name": "attendanceAdvancedStats",
      "generatedAt": "2026-01-08T00:23:11.697Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\attendanceAdvancedStatsRoutes.js",
          "src\\services\\AttendanceAdvancedStatsService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "AttendanceAdvancedStatsService",
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/attendanceAdvancedStats/advanced/:companyId",
          "file": "attendanceAdvancedStatsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/attendanceAdvancedStats/branch-comparison/:companyId",
          "file": "attendanceAdvancedStatsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/attendanceAdvancedStats/climate-zones",
          "file": "attendanceAdvancedStatsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/attendanceAdvancedStats/distribution/:companyId",
          "file": "attendanceAdvancedStatsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/attendanceAdvancedStats/temporal/:companyId",
          "file": "attendanceAdvancedStatsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/attendanceAdvancedStats/department-rankings/:companyId",
          "file": "attendanceAdvancedStatsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/attendanceAdvancedStats/calculate-trimmed-mean",
          "file": "attendanceAdvancedStatsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/attendanceAdvancedStats/absences/:companyId/:date",
          "file": "attendanceAdvancedStatsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/attendanceAdvancedStats/absenteeism-report/:companyId",
          "file": "attendanceAdvancedStatsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/attendanceAdvancedStats/absences-today/:companyId",
          "file": "attendanceAdvancedStatsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/attendanceAdvancedStats/health",
          "file": "attendanceAdvancedStatsRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 1959,
      "lastModified": "2025-12-16T13:34:18.876Z",
      "complexity": "complex"
    },
    "attendanceAnalytics": {
      "name": "attendanceAnalytics",
      "generatedAt": "2026-01-08T00:23:12.619Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\models\\AttendanceAnalyticsCache.js",
          "src\\routes\\attendanceAnalyticsRoutes.js",
          "src\\services\\AttendanceAnalyticsService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/attendanceAnalytics/employee/:userId",
          "file": "attendanceAnalyticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/attendanceAnalytics/employee/:userId/profile",
          "file": "attendanceAnalyticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/attendanceAnalytics/employee/:userId/patterns",
          "file": "attendanceAnalyticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/attendanceAnalytics/employee/:userId/history",
          "file": "attendanceAnalyticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/attendanceAnalytics/company/:companyId",
          "file": "attendanceAnalyticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/attendanceAnalytics/company/:companyId/stats",
          "file": "attendanceAnalyticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/attendanceAnalytics/company/:companyId/rankings",
          "file": "attendanceAnalyticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/attendanceAnalytics/company/:companyId/critical-patterns",
          "file": "attendanceAnalyticsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/attendanceAnalytics/recalculate/:companyId",
          "file": "attendanceAnalyticsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/attendanceAnalytics/recalculate/employee/:userId",
          "file": "attendanceAnalyticsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/attendanceAnalytics/patterns/detect/:userId",
          "file": "attendanceAnalyticsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/attendanceAnalytics/patterns/:patternId/resolve",
          "file": "attendanceAnalyticsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/attendanceAnalytics/patterns/:patternId/ignore",
          "file": "attendanceAnalyticsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/attendanceAnalytics/olap/generate",
          "file": "attendanceAnalyticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/attendanceAnalytics/olap/:cubeId",
          "file": "attendanceAnalyticsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/attendanceAnalytics/snapshot/:companyId",
          "file": "attendanceAnalyticsRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/attendanceAnalytics/cache/:companyId",
          "file": "attendanceAnalyticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/attendanceAnalytics/health",
          "file": "attendanceAnalyticsRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "attendance_analytics_cache",
          "model": "AttendanceAnalyticsCache",
          "file": "AttendanceAnalyticsCache.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 1349,
      "lastModified": "2026-01-04T02:13:03.214Z",
      "complexity": "complex"
    },
    "attendance": {
      "name": "attendance",
      "generatedAt": "2026-01-08T00:23:13.589Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\auditor\\collectors\\AttendanceModuleCollector.js",
          "src\\models\\Attendance-postgresql.js",
          "src\\models\\AttendanceAnalyticsCache.js",
          "src\\models\\AttendanceBatch-postgresql.js",
          "src\\models\\AttendancePattern.js",
          "src\\models\\AttendanceProfile.js",
          "src\\routes\\attendanceAdvancedStatsRoutes.js",
          "src\\routes\\attendanceAnalyticsRoutes.js",
          "src\\routes\\attendanceRoutes.js",
          "src\\routes\\attendance_stats_advanced.js",
          "src\\routes\\biometric-attendance-api.js",
          "src\\routes\\fastAttendanceRoutes.js",
          "src\\services\\AttendanceAdvancedStatsService.js",
          "src\\services\\AttendanceAnalyticsService.js",
          "src\\services\\AttendanceQueueService.js",
          "src\\services\\AttendanceScoringEngine.js",
          "src\\services\\AttendanceWorkflowService.js",
          "src\\workflows\\generated\\AttendanceWorkflowService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "BaseModuleCollector"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/attendance/",
          "file": "attendanceRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/attendance/checkin",
          "file": "attendanceRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/attendance/checkout",
          "file": "attendanceRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/attendance/",
          "file": "attendanceRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/attendance/stats",
          "file": "attendanceRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/attendance/:id",
          "file": "attendanceRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/attendance/today/status",
          "file": "attendanceRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/attendance/:id",
          "file": "attendanceRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/attendance/stats",
          "file": "attendanceRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/attendance/stats/summary",
          "file": "attendanceRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/attendance/stats/chart",
          "file": "attendanceRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/attendance/mobile",
          "file": "attendanceRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/attendance/:id/justify",
          "file": "attendanceRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/attendance/unjustified",
          "file": "attendanceRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/attendance/stats/detailed",
          "file": "attendanceRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/attendance/stats/overtime-summary",
          "file": "attendanceRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/attendance/stats/weather-patterns",
          "file": "attendanceRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/attendance/stats/year-comparison",
          "file": "attendanceRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "attendances",
          "model": "Attendance-postgresql",
          "file": "Attendance-postgresql.js"
        },
        {
          "table": "attendance_analytics_cache",
          "model": "AttendanceAnalyticsCache",
          "file": "AttendanceAnalyticsCache.js"
        },
        {
          "table": "attendance_batches",
          "model": "AttendanceBatch-postgresql",
          "file": "AttendanceBatch-postgresql.js"
        },
        {
          "table": "attendance_patterns",
          "model": "AttendancePattern",
          "file": "AttendancePattern.js"
        },
        {
          "table": "attendance_profiles",
          "model": "AttendanceProfile",
          "file": "AttendanceProfile.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 14102,
      "lastModified": "2026-01-08T00:04:57.744Z",
      "complexity": "complex"
    },
    "attendance_stats_advanced": {
      "name": "attendance_stats_advanced",
      "generatedAt": "2026-01-08T00:23:14.514Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\attendance_stats_advanced.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "database",
          "auth",
          "ShiftCalculatorService"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/attendance_stats_advanced/advanced",
          "file": "attendance_stats_advanced.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 452,
      "lastModified": "2025-12-16T13:34:18.718Z",
      "complexity": "moderate"
    },
    "auditorPhase4": {
      "name": "auditorPhase4",
      "generatedAt": "2026-01-08T00:23:15.410Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\auditorPhase4Routes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "auth",
          "SystemRegistry",
          "IntelligentTestingOrchestrator",
          "AutonomousRepairAgent",
          "TechnicalReportGenerator",
          "AITestingEngine",
          "UIElementDiscoveryEngine"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/auditorPhase4/test/deep-with-report",
          "file": "auditorPhase4Routes.js"
        },
        {
          "method": "POST",
          "path": "/api/auditorPhase4/auto-repair/:execution_id",
          "file": "auditorPhase4Routes.js"
        },
        {
          "method": "GET",
          "path": "/api/auditorPhase4/reports/:execution_id",
          "file": "auditorPhase4Routes.js"
        },
        {
          "method": "GET",
          "path": "/api/auditorPhase4/reports",
          "file": "auditorPhase4Routes.js"
        },
        {
          "method": "POST",
          "path": "/api/auditorPhase4/ai-test",
          "file": "auditorPhase4Routes.js"
        },
        {
          "method": "GET",
          "path": "/api/auditorPhase4/ai-test/patterns",
          "file": "auditorPhase4Routes.js"
        },
        {
          "method": "GET",
          "path": "/api/auditorPhase4/ai-test/history",
          "file": "auditorPhase4Routes.js"
        },
        {
          "method": "POST",
          "path": "/api/auditorPhase4/ai-test/batch",
          "file": "auditorPhase4Routes.js"
        },
        {
          "method": "POST",
          "path": "/api/auditorPhase4/ui-discovery",
          "file": "auditorPhase4Routes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 743,
      "lastModified": "2026-01-04T02:13:03.215Z",
      "complexity": "complex"
    },
    "auditor": {
      "name": "auditor",
      "generatedAt": "2026-01-08T00:23:16.509Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\auditor\\core\\AuditorEngine.js",
          "src\\auditor\\core\\AuditorKnowledgeBase.js",
          "src\\auditor\\core\\IterativeAuditor.js",
          "src\\auditor\\enrichment\\AuditorEnricher.js",
          "src\\routes\\auditorPhase4Routes.js",
          "src\\routes\\auditorRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "websocket",
          "OllamaAnalyzer",
          "TechnicalArchitectureReporter",
          "MarketingDynamicReporter"
        ],
        "optional": [
          "TechnicalArchitectureReporter",
          "MarketingDynamicReporter"
        ],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/auditor/test/global",
          "file": "auditorRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/auditor/test/apk-kiosk",
          "file": "auditorRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/auditor/test/module",
          "file": "auditorRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/auditor/test/modules",
          "file": "auditorRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/auditor/run",
          "file": "auditorRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/auditor/run/:module",
          "file": "auditorRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/auditor/run/active",
          "file": "auditorRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/auditor/run/simulation",
          "file": "auditorRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/auditor/status",
          "file": "auditorRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/auditor/executions",
          "file": "auditorRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/auditor/executions/:id",
          "file": "auditorRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/auditor/heal/:logId",
          "file": "auditorRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/auditor/seed/:module",
          "file": "auditorRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/auditor/cleanup",
          "file": "auditorRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/auditor/registry",
          "file": "auditorRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/auditor/registry/:module",
          "file": "auditorRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/auditor/dependencies/:module",
          "file": "auditorRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/auditor/bundles",
          "file": "auditorRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/auditor/monitor/start",
          "file": "auditorRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/auditor/monitor/stop",
          "file": "auditorRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/auditor/monitor/status",
          "file": "auditorRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/auditor/iterative/start",
          "file": "auditorRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/auditor/iterative/stop",
          "file": "auditorRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/auditor/iterative/status",
          "file": "auditorRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/auditor/iterative/metrics",
          "file": "auditorRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/auditor/scan",
          "file": "auditorRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/auditor/scan/sync",
          "file": "auditorRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/auditor/knowledge",
          "file": "auditorRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/auditor/knowledge/refresh",
          "file": "auditorRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/auditor/marketing/paper",
          "file": "auditorRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/auditor/marketing/regenerate",
          "file": "auditorRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/auditor/metrics/precision",
          "file": "auditorRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/auditor/metrics/by-source",
          "file": "auditorRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/auditor/metrics/by-module",
          "file": "auditorRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/auditor/metrics/timeline",
          "file": "auditorRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/auditor/metrics/errors-with-diagnosis",
          "file": "auditorRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/auditor/metrics/dashboard-summary",
          "file": "auditorRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/auditor/repairs/:execution_id",
          "file": "auditorRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/auditor/repairs/stats",
          "file": "auditorRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 4626,
      "lastModified": "2026-01-05T13:11:07.524Z",
      "complexity": "complex"
    },
    "auditReports": {
      "name": "auditReports",
      "generatedAt": "2026-01-08T00:23:17.625Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\auditReports.js",
          "src\\services\\auditReportService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "auditReportService"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/auditReports/generate",
          "file": "auditReports.js"
        },
        {
          "method": "GET",
          "path": "/api/auditReports/verify/:verification_code",
          "file": "auditReports.js"
        },
        {
          "method": "GET",
          "path": "/api/auditReports/history",
          "file": "auditReports.js"
        },
        {
          "method": "GET",
          "path": "/api/auditReports/download/:report_id",
          "file": "auditReports.js"
        },
        {
          "method": "GET",
          "path": "/api/auditReports/statistics",
          "file": "auditReports.js"
        },
        {
          "method": "GET",
          "path": "/api/auditReports/types",
          "file": "auditReports.js"
        },
        {
          "method": "POST",
          "path": "/api/auditReports/batch-generate",
          "file": "auditReports.js"
        },
        {
          "method": "GET",
          "path": "/api/auditReports/:report_id/info",
          "file": "auditReports.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 1469,
      "lastModified": "2025-12-16T13:34:18.996Z",
      "complexity": "complex"
    },
    "authorization": {
      "name": "authorization",
      "generatedAt": "2026-01-08T00:23:18.522Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\models\\FinanceAuthorizationLog.js",
          "src\\models\\LegalEditAuthorization.js",
          "src\\models\\MedicalEditAuthorization.js",
          "src\\routes\\authorizationRoutes.js",
          "src\\routes\\medicalAuthorizationsRoutes.js",
          "src\\services\\CashAuthorizationService.js",
          "src\\services\\LateArrivalAuthorizationService.js",
          "src\\services\\WMSAuthorizationService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/authorization/status/:token",
          "file": "authorizationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/authorization/approve/:token",
          "file": "authorizationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/authorization/reject/:token",
          "file": "authorizationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/authorization/approve/:token",
          "file": "authorizationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/authorization/approve/:token",
          "file": "authorizationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/authorization/reject/:token",
          "file": "authorizationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/authorization/reject/:token",
          "file": "authorizationRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "finance_authorization_logs",
          "model": "FinanceAuthorizationLog",
          "file": "FinanceAuthorizationLog.js"
        },
        {
          "table": "legal_edit_authorizations",
          "model": "LegalEditAuthorization",
          "file": "LegalEditAuthorization.js"
        },
        {
          "table": "medical_edit_authorizations",
          "model": "MedicalEditAuthorization",
          "file": "MedicalEditAuthorization.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 6050,
      "lastModified": "2026-01-07T12:03:09.760Z",
      "complexity": "complex"
    },
    "auth": {
      "name": "auth",
      "generatedAt": "2026-01-08T00:23:19.565Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\microservices\\auth-service.js",
          "src\\middleware\\auth.js",
          "src\\middleware\\multiTenantAuth.js",
          "src\\models\\FinanceAuthorizationLog.js",
          "src\\models\\LegalEditAuthorization.js",
          "src\\models\\MedicalEditAuthorization.js",
          "src\\routes\\aponntAuthRoutes.js",
          "src\\routes\\aponntStaffAuthRoutes.js",
          "src\\routes\\authorizationRoutes.js",
          "src\\routes\\authRoutes.js",
          "src\\routes\\faceAuthRoutes.js",
          "src\\routes\\medicalAuthorizationsRoutes.js",
          "src\\services\\afip\\AfipAuthService.js",
          "src\\services\\CashAuthorizationService.js",
          "src\\services\\LateArrivalAuthorizationService.js",
          "src\\services\\SupplierAuthTokenService.js",
          "src\\services\\WMSAuthorizationService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "database-next-gen"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/auth/companies",
          "file": "authRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/auth/login",
          "file": "authRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/auth/biometric-login",
          "file": "authRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/auth/refresh",
          "file": "authRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/auth/logout",
          "file": "authRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/auth/me",
          "file": "authRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/auth/change-password",
          "file": "authRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/auth/companies/:companyId/users",
          "file": "authRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "finance_authorization_logs",
          "model": "FinanceAuthorizationLog",
          "file": "FinanceAuthorizationLog.js"
        },
        {
          "table": "legal_edit_authorizations",
          "model": "LegalEditAuthorization",
          "file": "LegalEditAuthorization.js"
        },
        {
          "table": "medical_edit_authorizations",
          "model": "MedicalEditAuthorization",
          "file": "MedicalEditAuthorization.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 9879,
      "lastModified": "2026-01-07T12:03:09.760Z",
      "complexity": "complex"
    },
    "autoHealing": {
      "name": "autoHealing",
      "generatedAt": "2026-01-08T00:23:20.357Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\autoHealingRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "Phase4TestOrchestrator",
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/autoHealing/run",
          "file": "autoHealingRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/autoHealing/status",
          "file": "autoHealingRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/autoHealing/stop",
          "file": "autoHealingRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/autoHealing/reports",
          "file": "autoHealingRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/autoHealing/metrics",
          "file": "autoHealingRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 459,
      "lastModified": "2026-01-02T13:05:15.449Z",
      "complexity": "moderate"
    },
    "autoRepair": {
      "name": "autoRepair",
      "generatedAt": "2026-01-08T00:23:21.226Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\autoRepairRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "ClaudeCodeAutoRepairService"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/autoRepair/status",
          "file": "autoRepairRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/autoRepair/start",
          "file": "autoRepairRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/autoRepair/stop",
          "file": "autoRepairRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/autoRepair/restart",
          "file": "autoRepairRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/autoRepair/mode",
          "file": "autoRepairRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/autoRepair/config",
          "file": "autoRepairRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/autoRepair/queue",
          "file": "autoRepairRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/autoRepair/history",
          "file": "autoRepairRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/autoRepair/process-ticket",
          "file": "autoRepairRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/autoRepair/next-ticket",
          "file": "autoRepairRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 319,
      "lastModified": "2025-12-16T13:34:18.723Z",
      "complexity": "moderate"
    },
    "benefits": {
      "name": "benefits",
      "generatedAt": "2026-01-08T00:23:22.174Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\benefitsRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "database",
          "auth"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/benefits/types",
          "file": "benefitsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/benefits/types/:id",
          "file": "benefitsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/benefits/policies/:companyId",
          "file": "benefitsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/benefits/policies",
          "file": "benefitsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/benefits/employee/:userId",
          "file": "benefitsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/benefits/assign",
          "file": "benefitsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/benefits/approve/:benefitId",
          "file": "benefitsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/benefits/assets/:userId",
          "file": "benefitsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/benefits/assets",
          "file": "benefitsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/benefits/contract/generate",
          "file": "benefitsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/benefits/contract/templates",
          "file": "benefitsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/benefits/expiring/:days?",
          "file": "benefitsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/benefits/renew/:benefitId",
          "file": "benefitsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/benefits/stats/:companyId",
          "file": "benefitsRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 949,
      "lastModified": "2025-12-18T15:40:23.289Z",
      "complexity": "complex"
    },
    "billing": {
      "name": "billing",
      "generatedAt": "2026-01-08T00:23:23.085Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\cron\\billingCronJobs.js",
          "src\\routes\\aponntBillingRoutes.js",
          "src\\routes\\billingRoutes.js",
          "src\\services\\afip\\AfipBillingService.js",
          "src\\services\\AponntBillingService.js",
          "src\\services\\billing\\BillingRulesService.js",
          "src\\services\\billing\\ContractBillingService.js",
          "src\\services\\billing\\RecurringQuoteBillingService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "RecurringQuoteBillingService",
          "ContractBillingService"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/billing/presupuestos",
          "file": "billingRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/billing/presupuestos",
          "file": "billingRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/billing/presupuestos/:id",
          "file": "billingRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/billing/presupuestos/:id/aprobar",
          "file": "billingRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/billing/presupuestos/:id/activar",
          "file": "billingRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/billing/invoices/manual",
          "file": "billingRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/billing/invoices/from-quote/:presupuesto_id",
          "file": "billingRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/billing/invoices/recurring/process-all",
          "file": "billingRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/billing/invoices/recurring/:presupuesto_id",
          "file": "billingRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/billing/invoices/from-contract/:contract_id",
          "file": "billingRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/billing/invoices/contracts/process-monthly",
          "file": "billingRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/billing/invoices/:id/status",
          "file": "billingRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/billing/invoices/:id",
          "file": "billingRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 3828,
      "lastModified": "2026-01-07T11:28:52.816Z",
      "complexity": "complex"
    },
    "biometric-attendance-api": {
      "name": "biometric-attendance-api",
      "generatedAt": "2026-01-08T00:23:23.937Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\biometric-attendance-api.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "biometric-matching-service",
          "company-isolation",
          "auth",
          "SuspensionBlockingService",
          "database-postgresql",
          "database",
          "LateArrivalAuthorizationService"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/biometric-attendance-api/clock-in",
          "file": "biometric-attendance-api.js"
        },
        {
          "method": "POST",
          "path": "/api/biometric-attendance-api/clock-out",
          "file": "biometric-attendance-api.js"
        },
        {
          "method": "POST",
          "path": "/api/biometric-attendance-api/verify",
          "file": "biometric-attendance-api.js"
        },
        {
          "method": "GET",
          "path": "/api/biometric-attendance-api/statistics",
          "file": "biometric-attendance-api.js"
        },
        {
          "method": "GET",
          "path": "/api/biometric-attendance-api/health",
          "file": "biometric-attendance-api.js"
        },
        {
          "method": "POST",
          "path": "/api/biometric-attendance-api/verify-real",
          "file": "biometric-attendance-api.js"
        },
        {
          "method": "GET",
          "path": "/api/biometric-attendance-api/detection-logs",
          "file": "biometric-attendance-api.js"
        },
        {
          "method": "POST",
          "path": "/api/biometric-attendance-api/verify-test",
          "file": "biometric-attendance-api.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 1868,
      "lastModified": "2025-12-16T13:34:18.727Z",
      "complexity": "complex"
    },
    "biometric-enterprise-": {
      "name": "biometric-enterprise-",
      "generatedAt": "2026-01-08T00:23:24.925Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\biometric-enterprise-routes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "auth",
          "company-isolation",
          "azure-face-service",
          "face-duplicate-detector",
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/biometric-enterprise-/enroll-face",
          "file": "biometric-enterprise-Routes.js"
        },
        {
          "method": "GET",
          "path": "/api/biometric-enterprise-/employee/:employeeId/templates",
          "file": "biometric-enterprise-Routes.js"
        },
        {
          "method": "GET",
          "path": "/api/biometric-enterprise-/health",
          "file": "biometric-enterprise-Routes.js"
        },
        {
          "method": "POST",
          "path": "/api/biometric-enterprise-/analyze-face",
          "file": "biometric-enterprise-Routes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 788,
      "lastModified": "2025-12-16T13:34:18.727Z",
      "complexity": "complex"
    },
    "biometricConsent": {
      "name": "biometricConsent",
      "generatedAt": "2026-01-08T00:23:25.958Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\auditor\\collectors\\BiometricConsentModuleCollector.js",
          "src\\models\\BiometricConsent.js",
          "src\\routes\\biometricConsentRoutes.js",
          "src\\services\\biometricConsentService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "BaseModuleCollector"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/biometricConsent/consents",
          "file": "biometricConsentRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/biometricConsent/consents/grant",
          "file": "biometricConsentRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/biometricConsent/consents/revoke",
          "file": "biometricConsentRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/biometricConsent/consents/audit-log",
          "file": "biometricConsentRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/biometricConsent/consents/compliance-report",
          "file": "biometricConsentRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/biometricConsent/consents/validate-token/:token",
          "file": "biometricConsentRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/biometricConsent/consents/accept",
          "file": "biometricConsentRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/biometricConsent/consents/reject",
          "file": "biometricConsentRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/biometricConsent/consents/request-individual",
          "file": "biometricConsentRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/biometricConsent/consents/request-bulk",
          "file": "biometricConsentRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/biometricConsent/consents/roles",
          "file": "biometricConsentRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/biometricConsent/consents/legal-document",
          "file": "biometricConsentRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/biometricConsent/consents/:userId",
          "file": "biometricConsentRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "biometric_consents",
          "model": "BiometricConsent",
          "file": "BiometricConsent.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 3205,
      "lastModified": "2026-01-07T01:52:31.239Z",
      "complexity": "complex"
    },
    "biometric": {
      "name": "biometric",
      "generatedAt": "2026-01-08T00:23:26.789Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\auditor\\biometric\\BiometricConsistencyValidator.js",
          "src\\auditor\\biometric\\BiometricMockFactory.js",
          "src\\auditor\\biometric\\BiometricScenarioEngine.js",
          "src\\auditor\\biometric\\BiometricStressTestOrchestrator.js",
          "src\\auditor\\collectors\\BiometricConsentModuleCollector.js",
          "src\\auditor\\collectors\\BiometricDevicesCollector.js",
          "src\\models\\BiometricConsent.js",
          "src\\models\\BiometricData.js",
          "src\\models\\biometricModels.js",
          "src\\models\\BiometricTemplate.js",
          "src\\models\\biometric_template.js",
          "src\\models\\FacialBiometricData.js",
          "src\\routes\\biometric-attendance-api.js",
          "src\\routes\\biometric-enterprise-routes.js",
          "src\\routes\\biometricConsentRoutes.js",
          "src\\routes\\biometricRoutes.js",
          "src\\routes\\facialBiometricRoutes.js",
          "src\\services\\ai-biometric-engine.js",
          "src\\services\\biometric-matching-service.js",
          "src\\services\\biometric-processing-pipeline.js",
          "src\\services\\biometricConsentService.js",
          "src\\services\\BiometricPhotoExpirationScheduler.js",
          "src\\services\\real-biometric-analysis-engine.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/biometric/health",
          "file": "biometricRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "biometric_consents",
          "model": "BiometricConsent",
          "file": "BiometricConsent.js"
        },
        {
          "table": "biometric_data",
          "model": "BiometricData",
          "file": "BiometricData.js"
        },
        {
          "table": "biometric_templates",
          "model": "biometricModels",
          "file": "biometricModels.js"
        },
        {
          "table": "biometric_templates",
          "model": "BiometricTemplate",
          "file": "BiometricTemplate.js"
        },
        {
          "table": "biometric_templates",
          "model": "biometric_template",
          "file": "biometric_template.js"
        },
        {
          "table": "facial_biometric_data",
          "model": "FacialBiometricData",
          "file": "FacialBiometricData.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 12894,
      "lastModified": "2026-01-07T01:52:31.239Z",
      "complexity": "complex"
    },
    "brainAnalyzer": {
      "name": "brainAnalyzer",
      "generatedAt": "2026-01-08T00:23:27.719Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\brainAnalyzerRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "BrainAdvancedAnalyzer"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/brainAnalyzer/status",
          "file": "brainAnalyzerRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brainAnalyzer/dependencies",
          "file": "brainAnalyzerRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brainAnalyzer/dependencies/:module",
          "file": "brainAnalyzerRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brainAnalyzer/dead-code",
          "file": "brainAnalyzerRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brainAnalyzer/git/changes",
          "file": "brainAnalyzerRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brainAnalyzer/git/risk-priority",
          "file": "brainAnalyzerRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brainAnalyzer/complexity",
          "file": "brainAnalyzerRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brainAnalyzer/complexity/:filePath(*)",
          "file": "brainAnalyzerRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/brainAnalyzer/generate-tests/:module",
          "file": "brainAnalyzerRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/brainAnalyzer/contract/snapshot",
          "file": "brainAnalyzerRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/brainAnalyzer/contract/compare",
          "file": "brainAnalyzerRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brainAnalyzer/contracts",
          "file": "brainAnalyzerRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brainAnalyzer/security",
          "file": "brainAnalyzerRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brainAnalyzer/health",
          "file": "brainAnalyzerRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brainAnalyzer/health/quick",
          "file": "brainAnalyzerRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brainAnalyzer/full-analysis",
          "file": "brainAnalyzerRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 578,
      "lastModified": "2025-12-16T13:34:18.731Z",
      "complexity": "complex"
    },
    "brainEcosystem": {
      "name": "brainEcosystem",
      "generatedAt": "2026-01-08T00:23:28.606Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\brainEcosystemRoutes.js",
          "src\\services\\BrainEcosystemInitializer.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/brainEcosystem/status",
          "file": "brainEcosystemRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brainEcosystem/health",
          "file": "brainEcosystemRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brainEcosystem/workflows",
          "file": "brainEcosystemRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/brainEcosystem/workflows/regenerate",
          "file": "brainEcosystemRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/brainEcosystem/workflows/regenerate/:moduleKey",
          "file": "brainEcosystemRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/brainEcosystem/test/:moduleKey",
          "file": "brainEcosystemRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/brainEcosystem/test-all",
          "file": "brainEcosystemRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brainEcosystem/tutorials",
          "file": "brainEcosystemRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brainEcosystem/tutorials/:moduleKey",
          "file": "brainEcosystemRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brainEcosystem/learning",
          "file": "brainEcosystemRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brainEcosystem/learning/:moduleKey",
          "file": "brainEcosystemRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brainEcosystem/scores",
          "file": "brainEcosystemRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brainEcosystem/watcher/status",
          "file": "brainEcosystemRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/brainEcosystem/watcher/start",
          "file": "brainEcosystemRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/brainEcosystem/watcher/stop",
          "file": "brainEcosystemRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/brainEcosystem/watcher/rescan",
          "file": "brainEcosystemRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 950,
      "lastModified": "2025-12-16T13:34:18.883Z",
      "complexity": "complex"
    },
    "brainNervous": {
      "name": "brainNervous",
      "generatedAt": "2026-01-08T00:23:29.579Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\brain\\services\\BrainNervousSystem.js",
          "src\\routes\\brainNervousRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "BrainEscalationService",
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/brainNervous/status",
          "file": "brainNervousRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/brainNervous/start",
          "file": "brainNervousRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/brainNervous/stop",
          "file": "brainNervousRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brainNervous/stats",
          "file": "brainNervousRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brainNervous/incidents",
          "file": "brainNervousRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/brainNervous/report",
          "file": "brainNervousRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/brainNervous/cleanup",
          "file": "brainNervousRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/brainNervous/health-check",
          "file": "brainNervousRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/brainNervous/ssot-test",
          "file": "brainNervousRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/brainNervous/simulate-error",
          "file": "brainNervousRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/brainNervous/test-escalation",
          "file": "brainNervousRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 996,
      "lastModified": "2026-01-04T02:13:03.217Z",
      "complexity": "complex"
    },
    "brainReactive": {
      "name": "brainReactive",
      "generatedAt": "2026-01-08T00:23:30.626Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\brainReactiveRoutes.js",
          "src\\services\\BrainReactiveService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "BrainReactiveService"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/brainReactive/status",
          "file": "brainReactiveRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/brainReactive/start",
          "file": "brainReactiveRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/brainReactive/stop",
          "file": "brainReactiveRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brainReactive/changes",
          "file": "brainReactiveRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brainReactive/tasks",
          "file": "brainReactiveRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brainReactive/workflows",
          "file": "brainReactiveRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/brainReactive/clear-log",
          "file": "brainReactiveRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brainReactive/health",
          "file": "brainReactiveRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 690,
      "lastModified": "2025-12-16T13:34:18.885Z",
      "complexity": "complex"
    },
    "brain": {
      "name": "brain",
      "generatedAt": "2026-01-08T00:23:31.414Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\brain\\BrainOrchestrator.js",
          "src\\brain\\BrainUpgradeController.js",
          "src\\brain\\core\\IntrospectiveBrain.js",
          "src\\brain\\integrations\\BrainKnowledgeProvider.js",
          "src\\brain\\routes\\brainAgentsRoutes.js",
          "src\\brain\\services\\BrainEscalationService.js",
          "src\\brain\\services\\BrainIntegrationHub.js",
          "src\\brain\\services\\BrainNervousSystem.js",
          "src\\brain\\services\\BrainTourService.js",
          "src\\routes\\brainAnalyzerRoutes.js",
          "src\\routes\\brainEcosystemRoutes.js",
          "src\\routes\\brainNervousRoutes.js",
          "src\\routes\\brainReactiveRoutes.js",
          "src\\routes\\brainRoutes.js",
          "src\\routes\\brainTicketsRoutes.js",
          "src\\routes\\brainTourRoutes.js",
          "src\\routes\\brainV2Routes.js",
          "src\\services\\BrainAdvancedAnalyzer.js",
          "src\\services\\BrainEcosystemInitializer.js",
          "src\\services\\BrainIntelligentTestService.js",
          "src\\services\\BrainLLMContextGenerator.js",
          "src\\services\\BrainPhase4Integration.js",
          "src\\services\\BrainReactiveService.js",
          "src\\services\\EcosystemBrainService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "KnowledgeDatabase",
          "SupportAIAgent",
          "TrainerAIAgent",
          "TesterAIAgent",
          "EvaluatorAIAgent",
          "SalesAIAgent",
          "TourService",
          "NLUService",
          "FlowRecorder",
          "StaticHTMLAnalyzer",
          "BrainNervousSystem",
          "EcosystemBrainService",
          "MetadataWriter",
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/brain/health",
          "file": "brainRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brain/overview",
          "file": "brainRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brain/backend-files",
          "file": "brainRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brain/frontend-files",
          "file": "brainRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brain/commercial-modules",
          "file": "brainRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brain/technical-modules",
          "file": "brainRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brain/roadmap",
          "file": "brainRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brain/critical-path",
          "file": "brainRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brain/workflows",
          "file": "brainRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brain/database",
          "file": "brainRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brain/applications",
          "file": "brainRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brain/organigrama",
          "file": "brainRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brain/orgchart/aponnt",
          "file": "brainRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brain/orgchart/company/:company_id",
          "file": "brainRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/brain/clear-cache",
          "file": "brainRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brain/metadata",
          "file": "brainRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brain/stats",
          "file": "brainRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/brain/update-llm-context",
          "file": "brainRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brain/actions",
          "file": "brainRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brain/prerequisites/:actionKey",
          "file": "brainRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brain/check-readiness",
          "file": "brainRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/brain/check-multiple",
          "file": "brainRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brain/workflows/notifications",
          "file": "brainRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 19892,
      "lastModified": "2026-01-08T00:04:27.438Z",
      "complexity": "complex"
    },
    "brainTickets": {
      "name": "brainTickets",
      "generatedAt": "2026-01-08T00:23:32.286Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\brainTicketsRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "auth"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/brainTickets/tickets",
          "file": "brainTicketsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brainTickets/tickets/:id",
          "file": "brainTicketsRoutes.js"
        },
        {
          "method": "PATCH",
          "path": "/api/brainTickets/tickets/:id",
          "file": "brainTicketsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/brainTickets/tickets/:id/retry-repair",
          "file": "brainTicketsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brainTickets/stats/summary",
          "file": "brainTicketsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/brainTickets/tickets/:id/export-claude-code",
          "file": "brainTicketsRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 622,
      "lastModified": "2026-01-08T00:04:27.438Z",
      "complexity": "complex"
    },
    "brainTour": {
      "name": "brainTour",
      "generatedAt": "2026-01-08T00:23:33.177Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\brain\\services\\BrainTourService.js",
          "src\\routes\\brainTourRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "database",
          "BrainIntegrationHub"
        ],
        "optional": [
          "BrainIntegrationHub"
        ],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/brainTour/",
          "file": "brainTourRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brainTour/stats",
          "file": "brainTourRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brainTour/module/:module",
          "file": "brainTourRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brainTour/onboarding/:role",
          "file": "brainTourRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brainTour/progress/:userId",
          "file": "brainTourRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brainTour/:tourId",
          "file": "brainTourRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brainTour/module-legacy/:module",
          "file": "brainTourRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/brainTour/start",
          "file": "brainTourRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/brainTour/advance",
          "file": "brainTourRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/brainTour/back",
          "file": "brainTourRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/brainTour/pause",
          "file": "brainTourRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/brainTour/resume",
          "file": "brainTourRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brainTour/progress/:userId",
          "file": "brainTourRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/brainTour/question",
          "file": "brainTourRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/brainTour/detect-intent",
          "file": "brainTourRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brainTour/onboarding/:role",
          "file": "brainTourRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/brainTour/progress",
          "file": "brainTourRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/brainTour/stats",
          "file": "brainTourRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 1360,
      "lastModified": "2026-01-04T02:13:03.219Z",
      "complexity": "complex"
    },
    "brainV2": {
      "name": "brainV2",
      "generatedAt": "2026-01-08T00:23:34.002Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\brainV2Routes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "IntrospectiveBrain",
          "ModuleMigrator",
          "BrainUpgradeController",
          "CapabilitiesVocabulary"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/brainV2/status",
          "file": "brainV2Routes.js"
        },
        {
          "method": "GET",
          "path": "/api/brainV2/nodes",
          "file": "brainV2Routes.js"
        },
        {
          "method": "GET",
          "path": "/api/brainV2/nodes/:key",
          "file": "brainV2Routes.js"
        },
        {
          "method": "GET",
          "path": "/api/brainV2/relations",
          "file": "brainV2Routes.js"
        },
        {
          "method": "GET",
          "path": "/api/brainV2/graph",
          "file": "brainV2Routes.js"
        },
        {
          "method": "POST",
          "path": "/api/brainV2/query",
          "file": "brainV2Routes.js"
        },
        {
          "method": "GET",
          "path": "/api/brainV2/who-provides/:capability",
          "file": "brainV2Routes.js"
        },
        {
          "method": "GET",
          "path": "/api/brainV2/who-consumes/:capability",
          "file": "brainV2Routes.js"
        },
        {
          "method": "GET",
          "path": "/api/brainV2/impact/:nodeKey",
          "file": "brainV2Routes.js"
        },
        {
          "method": "GET",
          "path": "/api/brainV2/health",
          "file": "brainV2Routes.js"
        },
        {
          "method": "GET",
          "path": "/api/brainV2/capabilities",
          "file": "brainV2Routes.js"
        },
        {
          "method": "POST",
          "path": "/api/brainV2/rebuild",
          "file": "brainV2Routes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 546,
      "lastModified": "2025-12-18T15:40:23.291Z",
      "complexity": "complex"
    },
    "branch": {
      "name": "branch",
      "generatedAt": "2026-01-08T00:23:34.954Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\models\\Branch-postgresql.js",
          "src\\models\\BranchMemory.js",
          "src\\models\\CompanyBranch.js",
          "src\\routes\\branchRoutes.js",
          "src\\services\\ConsentBranchSyncService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/branch/",
          "file": "branchRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/branch/:id",
          "file": "branchRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/branch/",
          "file": "branchRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/branch/:id",
          "file": "branchRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/branch/:id",
          "file": "branchRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/branch/:id/users",
          "file": "branchRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/branch/:id/stats",
          "file": "branchRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "branches",
          "model": "Branch-postgresql",
          "file": "Branch-postgresql.js"
        },
        {
          "table": "branchmemorys",
          "model": "BranchMemory",
          "file": "BranchMemory.js",
          "inferred": true
        },
        {
          "table": "company_branches",
          "model": "CompanyBranch",
          "file": "CompanyBranch.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 1285,
      "lastModified": "2025-12-16T13:34:18.894Z",
      "complexity": "complex"
    },
    "budgetOnboarding": {
      "name": "budgetOnboarding",
      "generatedAt": "2026-01-08T00:23:35.924Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\budgetOnboardingRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "auth",
          "AltaEmpresaNotificationService"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/budgetOnboarding/onboarding/create",
          "file": "budgetOnboardingRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/budgetOnboarding/onboarding/:id/accept",
          "file": "budgetOnboardingRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/budgetOnboarding/onboarding/:id/resend",
          "file": "budgetOnboardingRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/budgetOnboarding/onboarding/:id",
          "file": "budgetOnboardingRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/budgetOnboarding/onboarding/company/:companyId",
          "file": "budgetOnboardingRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "budgets",
          "model": "Budget",
          "file": "Budget.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 353,
      "lastModified": "2025-12-16T13:34:18.738Z",
      "complexity": "moderate"
    },
    "budget": {
      "name": "budget",
      "generatedAt": "2026-01-08T00:23:36.937Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\models\\Budget.js",
          "src\\models\\FinanceBudget.js",
          "src\\models\\FinanceBudgetExecution.js",
          "src\\models\\FinanceBudgetInvestment.js",
          "src\\models\\FinanceBudgetLine.js",
          "src\\routes\\budgetOnboardingRoutes.js",
          "src\\routes\\budgetRoutes.js",
          "src\\routes\\financeBudgetRoutes.js",
          "src\\services\\BudgetService.js",
          "src\\services\\FinanceBudgetService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/budget/",
          "file": "budgetRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/budget/:id",
          "file": "budgetRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/budget/trace/:trace_id",
          "file": "budgetRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/budget/company/:company_id",
          "file": "budgetRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/budget/",
          "file": "budgetRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/budget/:id/send",
          "file": "budgetRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/budget/:id/view",
          "file": "budgetRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/budget/:id/accept",
          "file": "budgetRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/budget/:id/reject",
          "file": "budgetRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/budget/:id/request-modification",
          "file": "budgetRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/budget/stats/overview",
          "file": "budgetRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/budget/:id/pdf",
          "file": "budgetRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/budget/expire-old",
          "file": "budgetRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "budgets",
          "model": "Budget",
          "file": "Budget.js"
        },
        {
          "table": "finance_budgets",
          "model": "FinanceBudget",
          "file": "FinanceBudget.js"
        },
        {
          "table": "finance_budget_execution",
          "model": "FinanceBudgetExecution",
          "file": "FinanceBudgetExecution.js"
        },
        {
          "table": "finance_budget_investments",
          "model": "FinanceBudgetInvestment",
          "file": "FinanceBudgetInvestment.js"
        },
        {
          "table": "finance_budget_lines",
          "model": "FinanceBudgetLine",
          "file": "FinanceBudgetLine.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 3924,
      "lastModified": "2026-01-04T02:13:03.272Z",
      "complexity": "complex"
    },
    "calendarioLaboral": {
      "name": "calendarioLaboral",
      "generatedAt": "2026-01-08T00:23:37.975Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\calendarioLaboralRoutes.js",
          "src\\services\\CalendarioLaboralService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "CalendarioLaboralService",
          "auth",
          "HolidayApiService"
        ],
        "optional": [
          "HolidayApiService"
        ],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/calendarioLaboral/is-working/:userId/:date",
          "file": "calendarioLaboralRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/calendarioLaboral/user/:userId/calendar",
          "file": "calendarioLaboralRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/calendarioLaboral/employees/:date",
          "file": "calendarioLaboralRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/calendarioLaboral/holidays/:countryCode",
          "file": "calendarioLaboralRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/calendarioLaboral/non-working",
          "file": "calendarioLaboralRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/calendarioLaboral/month-stats",
          "file": "calendarioLaboralRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/calendarioLaboral/sync-holidays",
          "file": "calendarioLaboralRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/calendarioLaboral/today",
          "file": "calendarioLaboralRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/calendarioLaboral/countries",
          "file": "calendarioLaboralRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 1002,
      "lastModified": "2025-12-16T13:34:18.888Z",
      "complexity": "complex"
    },
    "cashManagement": {
      "name": "cashManagement",
      "generatedAt": "2026-01-08T00:23:38.777Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\cashManagementRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "auth",
          "database",
          "CashRegisterService",
          "PettyCashService",
          "CashAuthorizationService"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/cashManagement/payment-methods",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/cashManagement/payment-methods",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/cashManagement/payment-methods/:id",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/cashManagement/cash-registers",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/cashManagement/cash-registers/my-register",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/cashManagement/cash-registers",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/cashManagement/cash-registers/:id",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/cashManagement/cash-registers/:id/assign-user",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/cashManagement/cash-registers/:id/summary",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/cashManagement/cash-sessions/open",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/cashManagement/cash-sessions/:id/can-close",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/cashManagement/cash-sessions/:id/close",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/cashManagement/cash-sessions/:id/movements",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/cashManagement/cash-movements",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/cashManagement/cash-transfers/pending",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/cashManagement/cash-transfers",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/cashManagement/cash-transfers/:id/confirm",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/cashManagement/cash-transfers/:id/reject",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/cashManagement/cash-transfers/:id/cancel",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/cashManagement/cash-counts",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/cashManagement/petty-cash/funds",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/cashManagement/petty-cash/funds/:id",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/cashManagement/petty-cash/funds/:id/summary",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/cashManagement/petty-cash/funds",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/cashManagement/petty-cash/funds/:id",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/cashManagement/petty-cash/funds/:id/expenses",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/cashManagement/petty-cash/funds/:id/expenses",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/cashManagement/petty-cash/expenses/:id/approve",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/cashManagement/petty-cash/expenses/:id/reject",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/cashManagement/petty-cash/funds/:id/replenishments",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/cashManagement/petty-cash/funds/:id/replenishments",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/cashManagement/petty-cash/replenishments/:id/approve",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/cashManagement/petty-cash/replenishments/:id/pay",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/cashManagement/integration-config/:module",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/cashManagement/integration-config",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/cashManagement/currencies",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/cashManagement/currencies",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/cashManagement/currencies/:id/exchange-rate",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/cashManagement/egress-requests",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/cashManagement/egress-requests/pending-approval",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/cashManagement/egress-requests",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/cashManagement/egress-requests/:id/supervisor-approve",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/cashManagement/egress-requests/:id/finance-approve",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/cashManagement/egress-requests/:id/execute",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/cashManagement/egress-requests/:id/reject",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/cashManagement/adjustments",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/cashManagement/adjustments/pending",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/cashManagement/adjustments",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/cashManagement/adjustments/:id/approve",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/cashManagement/adjustments/:id/reject",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/cashManagement/responsible-config",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/cashManagement/responsible-config",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/cashManagement/authorization-logs",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/cashManagement/executive-dashboard",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/cashManagement/executive-dashboard/registers-status",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/cashManagement/executive-dashboard/financial-summary",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/cashManagement/exchange-rates",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/cashManagement/exchange-rates",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/cashManagement/exchange-rates/current",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/cashManagement/currency-exchanges",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/cashManagement/currency-exchanges",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/cashManagement/balance-carryovers",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/cashManagement/balance-carryovers/pending/:registerId",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/cashManagement/balance-carryovers/create-from-close",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/cashManagement/balance-carryovers/apply-to-session",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/cashManagement/session-balances/:sessionId",
          "file": "cashManagementRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/cashManagement/session-balances/:id/reconcile",
          "file": "cashManagementRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 2123,
      "lastModified": "2026-01-04T02:13:03.221Z",
      "complexity": "complex"
    },
    "circuit": {
      "name": "circuit",
      "generatedAt": "2026-01-08T00:23:39.755Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\brain\\circuits\\BusinessCircuitsRegistry.js",
          "src\\brain\\integrations\\CircuitTourEngine.js",
          "src\\brain\\schemas\\BusinessCircuit.js",
          "src\\routes\\circuitRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "BusinessCircuit"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/circuit/",
          "file": "circuitRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/circuit/:key",
          "file": "circuitRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/circuit/:key/tour",
          "file": "circuitRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/circuit/:key/narrative",
          "file": "circuitRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/circuit/by-type/:type",
          "file": "circuitRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/circuit/using-module/:moduleName",
          "file": "circuitRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/circuit/analysis/dependencies",
          "file": "circuitRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/circuit/tour/start",
          "file": "circuitRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/circuit/tour/next",
          "file": "circuitRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/circuit/tour/previous",
          "file": "circuitRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/circuit/tour/end",
          "file": "circuitRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/circuit/tour/status",
          "file": "circuitRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/circuit/apps/list",
          "file": "circuitRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/circuit/apps/:key",
          "file": "circuitRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/circuit/apps/analysis/endpoints-matrix",
          "file": "circuitRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/circuit/apps/recommend",
          "file": "circuitRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/circuit/ask",
          "file": "circuitRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/circuit/find-circuit",
          "file": "circuitRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/circuit/end-to-end-flow",
          "file": "circuitRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/circuit/ai-context",
          "file": "circuitRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 3448,
      "lastModified": "2026-01-04T02:13:03.221Z",
      "complexity": "complex"
    },
    "commissionOnboarding": {
      "name": "commissionOnboarding",
      "generatedAt": "2026-01-08T00:23:40.667Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\commissionOnboardingRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "auth"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/commissionOnboarding/onboarding/liquidate",
          "file": "commissionOnboardingRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/commissionOnboarding/onboarding/liquidation/:id",
          "file": "commissionOnboardingRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/commissionOnboarding/onboarding/payments/vendor/:vendorId",
          "file": "commissionOnboardingRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/commissionOnboarding/onboarding/payment/:id/complete",
          "file": "commissionOnboardingRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "commissions",
          "model": "Commission",
          "file": "Commission.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 334,
      "lastModified": "2025-12-16T13:34:18.742Z",
      "complexity": "moderate"
    },
    "commission": {
      "name": "commission",
      "generatedAt": "2026-01-08T00:23:41.564Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\models\\Commission.js",
          "src\\models\\CommissionLiquidation.js",
          "src\\models\\CommissionPayment.js",
          "src\\models\\PartnerCommissionLog.js",
          "src\\models\\VendorCommission.js",
          "src\\routes\\commissionOnboardingRoutes.js",
          "src\\routes\\commissionRoutes.js",
          "src\\routes\\partnerCommissionRoutes.js",
          "src\\routes\\staffCommissionsRoutes.js",
          "src\\routes\\vendorCommissionsRoutes.js",
          "src\\services\\CommissionCalculationService.js",
          "src\\services\\CommissionService.js",
          "src\\services\\StaffCommissionService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/commission/liquidations",
          "file": "commissionRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/commission/liquidations/:id/approve",
          "file": "commissionRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/commission/liquidations/:id/reject",
          "file": "commissionRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/commission/liquidations/:id/create-payments",
          "file": "commissionRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/commission/liquidations",
          "file": "commissionRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/commission/liquidations/stats",
          "file": "commissionRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/commission/payments/:id/execute",
          "file": "commissionRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/commission/payments/:id/reconcile",
          "file": "commissionRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/commission/payments/vendor/:vendor_id/stats",
          "file": "commissionRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "commissions",
          "model": "Commission",
          "file": "Commission.js"
        },
        {
          "table": "commission_liquidations",
          "model": "CommissionLiquidation",
          "file": "CommissionLiquidation.js"
        },
        {
          "table": "commission_payments",
          "model": "CommissionPayment",
          "file": "CommissionPayment.js"
        },
        {
          "table": "partner_commissions_log",
          "model": "PartnerCommissionLog",
          "file": "PartnerCommissionLog.js"
        },
        {
          "table": "vendor_commissions",
          "model": "VendorCommission",
          "file": "VendorCommission.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 4420,
      "lastModified": "2025-12-16T13:34:18.972Z",
      "complexity": "complex"
    },
    "companyAccount": {
      "name": "companyAccount",
      "generatedAt": "2026-01-08T00:23:42.687Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\auditor\\collectors\\CompanyAccountModuleCollector.js",
          "src\\routes\\companyAccountRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "BaseModuleCollector",
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/companyAccount/quotes",
          "file": "companyAccountRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/companyAccount/quotes/:id",
          "file": "companyAccountRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/companyAccount/contracts",
          "file": "companyAccountRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/companyAccount/contracts/:id",
          "file": "companyAccountRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/companyAccount/invoices",
          "file": "companyAccountRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/companyAccount/invoices/:id",
          "file": "companyAccountRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/companyAccount/communications",
          "file": "companyAccountRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/companyAccount/communications",
          "file": "companyAccountRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/companyAccount/communications/:id/read",
          "file": "companyAccountRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/companyAccount/communications/:id",
          "file": "companyAccountRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/companyAccount/notifications",
          "file": "companyAccountRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/companyAccount/notifications/:id/read",
          "file": "companyAccountRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/companyAccount/notifications/read-all",
          "file": "companyAccountRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/companyAccount/notifications/:id",
          "file": "companyAccountRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/companyAccount/summary",
          "file": "companyAccountRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/companyAccount/:type/:id/download",
          "file": "companyAccountRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "companies",
          "model": "Company",
          "file": "Company.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 2165,
      "lastModified": "2026-01-02T13:05:15.353Z",
      "complexity": "complex"
    },
    "companyEmailProcess": {
      "name": "companyEmailProcess",
      "generatedAt": "2026-01-08T00:23:43.788Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\companyEmailProcessRoutes.js",
          "src\\services\\CompanyEmailProcessService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "auth",
          "CompanyEmailProcessService"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/companyEmailProcess/assign",
          "file": "companyEmailProcessRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/companyEmailProcess/auto-assign",
          "file": "companyEmailProcessRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/companyEmailProcess/mappings",
          "file": "companyEmailProcessRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/companyEmailProcess/unassigned",
          "file": "companyEmailProcessRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/companyEmailProcess/stats",
          "file": "companyEmailProcessRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/companyEmailProcess/unassign",
          "file": "companyEmailProcessRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/companyEmailProcess/check-first-email",
          "file": "companyEmailProcessRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "companies",
          "model": "Company",
          "file": "Company.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 559,
      "lastModified": "2026-01-04T02:13:03.272Z",
      "complexity": "complex"
    },
    "companyEmail": {
      "name": "companyEmail",
      "generatedAt": "2026-01-08T00:23:44.717Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\cron\\companyEmailPollerCron.js",
          "src\\routes\\companyEmailProcessRoutes.js",
          "src\\routes\\companyEmailRoutes.js",
          "src\\services\\CompanyEmailPollerService.js",
          "src\\services\\CompanyEmailProcessService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "CompanyEmailPollerService"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/companyEmail/imap/configure",
          "file": "companyEmailRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/companyEmail/imap/test",
          "file": "companyEmailRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/companyEmail/imap/config/:companyId",
          "file": "companyEmailRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/companyEmail/imap/toggle/:companyId",
          "file": "companyEmailRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/companyEmail/poll/:companyId",
          "file": "companyEmailRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/companyEmail/poll-all",
          "file": "companyEmailRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/companyEmail/stats",
          "file": "companyEmailRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/companyEmail/inbox-history/:companyId",
          "file": "companyEmailRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/companyEmail/threads/:companyId",
          "file": "companyEmailRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/companyEmail/global/companies-with-imap",
          "file": "companyEmailRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/companyEmail/global/stats",
          "file": "companyEmailRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "companies",
          "model": "Company",
          "file": "Company.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 1698,
      "lastModified": "2026-01-04T02:13:03.272Z",
      "complexity": "complex"
    },
    "companyModule": {
      "name": "companyModule",
      "generatedAt": "2026-01-08T00:23:45.675Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\models\\CompanyModule.js",
          "src\\routes\\companyModuleRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/companyModule/test-token",
          "file": "companyModuleRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/companyModule/my-company",
          "file": "companyModuleRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/companyModule/active",
          "file": "companyModuleRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/companyModule/my-modules",
          "file": "companyModuleRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/companyModule/:companyId",
          "file": "companyModuleRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/companyModule/debug-isi",
          "file": "companyModuleRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "companies",
          "model": "Company",
          "file": "Company.js"
        },
        {
          "table": "company_modules",
          "model": "CompanyModule",
          "file": "CompanyModule.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 756,
      "lastModified": "2026-01-04T21:59:54.928Z",
      "complexity": "complex"
    },
    "companyPanel": {
      "name": "companyPanel",
      "generatedAt": "2026-01-08T00:23:46.621Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\companyPanel.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/companyPanel/company-info",
          "file": "companyPanel.js"
        },
        {
          "method": "GET",
          "path": "/api/companyPanel/employees",
          "file": "companyPanel.js"
        },
        {
          "method": "GET",
          "path": "/api/companyPanel/departments",
          "file": "companyPanel.js"
        },
        {
          "method": "GET",
          "path": "/api/companyPanel/attendance/recent",
          "file": "companyPanel.js"
        },
        {
          "method": "GET",
          "path": "/api/companyPanel/medical/certificates",
          "file": "companyPanel.js"
        },
        {
          "method": "GET",
          "path": "/api/companyPanel/medical/prescriptions",
          "file": "companyPanel.js"
        },
        {
          "method": "GET",
          "path": "/api/companyPanel/dashboard/stats",
          "file": "companyPanel.js"
        },
        {
          "method": "GET",
          "path": "/api/companyPanel/documents",
          "file": "companyPanel.js"
        },
        {
          "method": "GET",
          "path": "/api/companyPanel/vacations",
          "file": "companyPanel.js"
        }
      ],
      "databaseTables": [
        {
          "table": "companies",
          "model": "Company",
          "file": "Company.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 599,
      "lastModified": "2025-12-16T13:34:18.748Z",
      "complexity": "complex"
    },
    "companyPricing": {
      "name": "companyPricing",
      "generatedAt": "2026-01-08T00:23:47.435Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\companyPricingRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/companyPricing/modules",
          "file": "companyPricingRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/companyPricing/calculate",
          "file": "companyPricingRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/companyPricing/companies",
          "file": "companyPricingRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/companyPricing/companies",
          "file": "companyPricingRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/companyPricing/companies/:id/modules",
          "file": "companyPricingRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "companies",
          "model": "Company",
          "file": "Company.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 428,
      "lastModified": "2025-09-12T00:32:02.357Z",
      "complexity": "moderate"
    },
    "company": {
      "name": "company",
      "generatedAt": "2026-01-08T00:23:48.367Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\auditor\\collectors\\CompanyAccountModuleCollector.js",
          "src\\cron\\companyEmailPollerCron.js",
          "src\\middleware\\company-isolation.js",
          "src\\models\\AponntStaffCompany.js",
          "src\\models\\Company.js",
          "src\\models\\CompanyBranch.js",
          "src\\models\\CompanyDependency.js",
          "src\\models\\CompanyModule.js",
          "src\\models\\CompanyRiskConfig.js",
          "src\\models\\CompanySupportAssignment.js",
          "src\\models\\CompanyTask.js",
          "src\\models\\HseCompanyConfig.js",
          "src\\models\\RfqCompanyAttachment.js",
          "src\\routes\\companyAccountRoutes.js",
          "src\\routes\\companyEmailProcessRoutes.js",
          "src\\routes\\companyEmailRoutes.js",
          "src\\routes\\companyModuleRoutes.js",
          "src\\routes\\companyPanel.js",
          "src\\routes\\companyPricingRoutes.js",
          "src\\routes\\companyRoutes.js",
          "src\\routes\\companyTaskRoutes.js",
          "src\\routes\\debug-company-modules.js",
          "src\\services\\CompanyEmailPollerService.js",
          "src\\services\\CompanyEmailProcessService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "BaseModuleCollector",
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/company/public-list",
          "file": "companyRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/company/",
          "file": "companyRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/company/:slug",
          "file": "companyRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/company/",
          "file": "companyRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/company/:id",
          "file": "companyRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/company/:id",
          "file": "companyRoutes.js"
        },
        {
          "method": "PATCH",
          "path": "/api/company/:id/toggle-status",
          "file": "companyRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/company/:slug/stats",
          "file": "companyRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/company/:id/onboarding/activate",
          "file": "companyRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "aponnt_staff_companies",
          "model": "AponntStaffCompany",
          "file": "AponntStaffCompany.js"
        },
        {
          "table": "companies",
          "model": "Company",
          "file": "Company.js"
        },
        {
          "table": "company_branches",
          "model": "CompanyBranch",
          "file": "CompanyBranch.js"
        },
        {
          "table": "company_dependencies",
          "model": "CompanyDependency",
          "file": "CompanyDependency.js"
        },
        {
          "table": "company_modules",
          "model": "CompanyModule",
          "file": "CompanyModule.js"
        },
        {
          "table": "company_risk_config",
          "model": "CompanyRiskConfig",
          "file": "CompanyRiskConfig.js"
        },
        {
          "table": "company_support_assignments",
          "model": "CompanySupportAssignment",
          "file": "CompanySupportAssignment.js"
        },
        {
          "table": "company_tasks",
          "model": "CompanyTask",
          "file": "CompanyTask.js"
        },
        {
          "table": "hse_company_config",
          "model": "HseCompanyConfig",
          "file": "HseCompanyConfig.js"
        },
        {
          "table": "rfq_company_attachments",
          "model": "RfqCompanyAttachment",
          "file": "RfqCompanyAttachment.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 8565,
      "lastModified": "2026-01-05T23:22:10.281Z",
      "complexity": "complex"
    },
    "companyTask": {
      "name": "companyTask",
      "generatedAt": "2026-01-08T00:23:49.487Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\models\\CompanyTask.js",
          "src\\routes\\companyTaskRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/companyTask/:companyId/tasks",
          "file": "companyTaskRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/companyTask/:companyId/tasks/:taskId",
          "file": "companyTaskRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/companyTask/:companyId/tasks",
          "file": "companyTaskRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/companyTask/:companyId/tasks/:taskId",
          "file": "companyTaskRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/companyTask/:companyId/tasks/:taskId",
          "file": "companyTaskRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "companies",
          "model": "Company",
          "file": "Company.js"
        },
        {
          "table": "company_tasks",
          "model": "CompanyTask",
          "file": "CompanyTask.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 454,
      "lastModified": "2025-12-16T13:34:18.750Z",
      "complexity": "moderate"
    },
    "compliance": {
      "name": "compliance",
      "generatedAt": "2026-01-08T00:23:50.524Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\compliance.js",
          "src\\services\\complianceService.js",
          "src\\services\\complianceServiceSimple.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "complianceService",
          "RiskIntelligenceService",
          "auth",
          "RiskReportService"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/compliance/dashboard",
          "file": "compliance.js"
        },
        {
          "method": "POST",
          "path": "/api/compliance/validate",
          "file": "compliance.js"
        },
        {
          "method": "GET",
          "path": "/api/compliance/violations",
          "file": "compliance.js"
        },
        {
          "method": "POST",
          "path": "/api/compliance/violations/:id/resolve",
          "file": "compliance.js"
        },
        {
          "method": "POST",
          "path": "/api/compliance/alerts",
          "file": "compliance.js"
        },
        {
          "method": "GET",
          "path": "/api/compliance/rules",
          "file": "compliance.js"
        },
        {
          "method": "GET",
          "path": "/api/compliance/summary",
          "file": "compliance.js"
        },
        {
          "method": "GET",
          "path": "/api/compliance/metrics/:type",
          "file": "compliance.js"
        },
        {
          "method": "GET",
          "path": "/api/compliance/risk-dashboard",
          "file": "compliance.js"
        },
        {
          "method": "GET",
          "path": "/api/compliance/employee/:id/risk-analysis",
          "file": "compliance.js"
        },
        {
          "method": "GET",
          "path": "/api/compliance/indices-config",
          "file": "compliance.js"
        },
        {
          "method": "PUT",
          "path": "/api/compliance/indices-config/:id",
          "file": "compliance.js"
        },
        {
          "method": "GET",
          "path": "/api/compliance/departments",
          "file": "compliance.js"
        },
        {
          "method": "POST",
          "path": "/api/compliance/analyze/:id",
          "file": "compliance.js"
        },
        {
          "method": "POST",
          "path": "/api/compliance/analyze-all",
          "file": "compliance.js"
        },
        {
          "method": "GET",
          "path": "/api/compliance/trends",
          "file": "compliance.js"
        },
        {
          "method": "GET",
          "path": "/api/compliance/export/dashboard/pdf",
          "file": "compliance.js"
        },
        {
          "method": "GET",
          "path": "/api/compliance/export/dashboard/excel",
          "file": "compliance.js"
        },
        {
          "method": "GET",
          "path": "/api/compliance/risk-config",
          "file": "compliance.js"
        },
        {
          "method": "PUT",
          "path": "/api/compliance/risk-config",
          "file": "compliance.js"
        },
        {
          "method": "POST",
          "path": "/api/compliance/risk-config/method",
          "file": "compliance.js"
        },
        {
          "method": "POST",
          "path": "/api/compliance/risk-config/segmentation",
          "file": "compliance.js"
        },
        {
          "method": "POST",
          "path": "/api/compliance/risk-config/recalculate",
          "file": "compliance.js"
        },
        {
          "method": "GET",
          "path": "/api/compliance/segmented-analysis",
          "file": "compliance.js"
        },
        {
          "method": "GET",
          "path": "/api/compliance/benchmark-comparison",
          "file": "compliance.js"
        },
        {
          "method": "GET",
          "path": "/api/compliance/employee/:id/thresholds",
          "file": "compliance.js"
        },
        {
          "method": "GET",
          "path": "/api/compliance/rbac-stats",
          "file": "compliance.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 917,
      "lastModified": "2026-01-06T11:12:34.048Z",
      "complexity": "complex"
    },
    "conceptDependencies": {
      "name": "conceptDependencies",
      "generatedAt": "2026-01-08T00:23:51.267Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\conceptDependenciesRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "ConceptDependencyService"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/conceptDependencies/types",
          "file": "conceptDependenciesRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/conceptDependencies/company",
          "file": "conceptDependenciesRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/conceptDependencies/company/:id",
          "file": "conceptDependenciesRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/conceptDependencies/company",
          "file": "conceptDependenciesRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/conceptDependencies/company/:id",
          "file": "conceptDependenciesRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/conceptDependencies/company/:id",
          "file": "conceptDependenciesRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/conceptDependencies/link",
          "file": "conceptDependenciesRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/conceptDependencies/link/:conceptId/:dependencyId",
          "file": "conceptDependenciesRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/conceptDependencies/concept/:conceptId",
          "file": "conceptDependenciesRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/conceptDependencies/documents/:userId",
          "file": "conceptDependenciesRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/conceptDependencies/my-documents",
          "file": "conceptDependenciesRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/conceptDependencies/documents/:userId",
          "file": "conceptDependenciesRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/conceptDependencies/documents/:documentId",
          "file": "conceptDependenciesRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/conceptDependencies/documents/:documentId",
          "file": "conceptDependenciesRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/conceptDependencies/evaluate",
          "file": "conceptDependenciesRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/conceptDependencies/expiring",
          "file": "conceptDependenciesRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/conceptDependencies/stats",
          "file": "conceptDependenciesRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 482,
      "lastModified": "2025-12-16T13:34:18.752Z",
      "complexity": "moderate"
    },
    "config": {
      "name": "config",
      "generatedAt": "2026-01-08T00:23:52.378Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\auditor\\collectors\\ConfigEnrichmentService.js",
          "src\\models\\ARTConfiguration.js",
          "src\\models\\CompanyRiskConfig.js",
          "src\\models\\FinanceCashIntegrationConfig.js",
          "src\\models\\FinanceResponsibleConfig.js",
          "src\\models\\HseCompanyConfig.js",
          "src\\models\\MultipleARTConfiguration.js",
          "src\\models\\ProcurementAccountingConfig.js",
          "src\\models\\ProcurementApprovalConfig.js",
          "src\\models\\siac\\ConfiguracionEmpresa.js",
          "src\\models\\SystemConfig.js",
          "src\\models\\UserSalaryConfig.js",
          "src\\models\\VacationConfiguration.js",
          "src\\routes\\configRoutes.js",
          "src\\routes\\emailConfigRoutes.js",
          "src\\routes\\siac\\configurador.js",
          "src\\routes\\userSalaryConfigRoutes.js",
          "src\\services\\EmailConfigService.js",
          "src\\synapse\\config-generator.js",
          "src\\utils\\workflowConfigHelper.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/config/",
          "file": "configRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/config/",
          "file": "configRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/config/company",
          "file": "configRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/config/biometric",
          "file": "configRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/config/biometric",
          "file": "configRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/config/notifications",
          "file": "configRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/config/notifications",
          "file": "configRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/config/test-email",
          "file": "configRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/config/network",
          "file": "configRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/config/network",
          "file": "configRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/config/mobile-connection",
          "file": "configRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/config/system-info",
          "file": "configRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/config/system-status",
          "file": "configRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/config/server-info",
          "file": "configRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "art_configurations",
          "model": "ARTConfiguration",
          "file": "ARTConfiguration.js"
        },
        {
          "table": "company_risk_config",
          "model": "CompanyRiskConfig",
          "file": "CompanyRiskConfig.js"
        },
        {
          "table": "finance_cash_integration_config",
          "model": "FinanceCashIntegrationConfig",
          "file": "FinanceCashIntegrationConfig.js"
        },
        {
          "table": "finance_responsible_config",
          "model": "FinanceResponsibleConfig",
          "file": "FinanceResponsibleConfig.js"
        },
        {
          "table": "hse_company_config",
          "model": "HseCompanyConfig",
          "file": "HseCompanyConfig.js"
        },
        {
          "table": "multiple_art_configurations",
          "model": "MultipleARTConfiguration",
          "file": "MultipleARTConfiguration.js"
        },
        {
          "table": "procurement_accounting_config",
          "model": "ProcurementAccountingConfig",
          "file": "ProcurementAccountingConfig.js"
        },
        {
          "table": "procurement_approval_config",
          "model": "ProcurementApprovalConfig",
          "file": "ProcurementApprovalConfig.js"
        },
        {
          "table": "system_config",
          "model": "SystemConfig",
          "file": "SystemConfig.js"
        },
        {
          "table": "user_salary_config",
          "model": "UserSalaryConfig",
          "file": "UserSalaryConfig.js"
        },
        {
          "table": "vacation_configurations",
          "model": "VacationConfiguration",
          "file": "VacationConfiguration.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 6028,
      "lastModified": "2026-01-07T03:48:27.661Z",
      "complexity": "complex"
    },
    "contactForm": {
      "name": "contactForm",
      "generatedAt": "2026-01-08T00:23:53.401Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\contactFormRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "NotificationCentralExchange",
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/contactForm/contact",
          "file": "contactFormRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 282,
      "lastModified": "2026-01-07T03:46:15.590Z",
      "complexity": "moderate"
    },
    "contact": {
      "name": "contact",
      "generatedAt": "2026-01-08T00:23:54.206Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\contactFormRoutes.js",
          "src\\routes\\contactRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "NotificationCentralExchange",
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/contact/",
          "file": "contactRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 428,
      "lastModified": "2026-01-07T03:46:15.590Z",
      "complexity": "moderate"
    },
    "contextualHelp": {
      "name": "contextualHelp",
      "generatedAt": "2026-01-08T00:23:55.515Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\contextualHelpRoutes.js",
          "src\\services\\ContextualHelpService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "auth",
          "ContextualHelpService"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/contextualHelp/module/:moduleKey",
          "file": "contextualHelpRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/contextualHelp/tooltip",
          "file": "contextualHelpRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/contextualHelp/walkthrough/:moduleKey",
          "file": "contextualHelpRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/contextualHelp/feedback/:helpId",
          "file": "contextualHelpRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/contextualHelp/readiness/:moduleKey",
          "file": "contextualHelpRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/contextualHelp/suggestions/:moduleKey",
          "file": "contextualHelpRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/contextualHelp/ask",
          "file": "contextualHelpRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/contextualHelp/ai-status",
          "file": "contextualHelpRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/contextualHelp/full-context/:moduleKey",
          "file": "contextualHelpRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 919,
      "lastModified": "2025-12-16T13:34:18.897Z",
      "complexity": "complex"
    },
    "contractOnboarding": {
      "name": "contractOnboarding",
      "generatedAt": "2026-01-08T00:23:56.553Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\models\\ContractOnboarding.js",
          "src\\routes\\contractOnboardingRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/contractOnboarding/onboarding/generate",
          "file": "contractOnboardingRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/contractOnboarding/onboarding/:id/sign",
          "file": "contractOnboardingRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/contractOnboarding/onboarding/:id",
          "file": "contractOnboardingRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/contractOnboarding/onboarding/company/:companyId",
          "file": "contractOnboardingRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "contracts",
          "model": "Contract",
          "file": "Contract.js"
        },
        {
          "table": "contracts",
          "model": "ContractOnboarding",
          "file": "ContractOnboarding.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 597,
      "lastModified": "2025-12-16T13:34:18.755Z",
      "complexity": "complex"
    },
    "contract": {
      "name": "contract",
      "generatedAt": "2026-01-08T00:23:57.471Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\cron\\contractRenewalCronJobs.js",
          "src\\models\\Contract.js",
          "src\\models\\ContractOnboarding.js",
          "src\\models\\ProcurementContract.js",
          "src\\models\\ProcurementContractItem.js",
          "src\\routes\\contractOnboardingRoutes.js",
          "src\\routes\\contractRoutes.js",
          "src\\routes\\contractsRoutes.js",
          "src\\services\\billing\\ContractBillingService.js",
          "src\\services\\ContractRenewalService.js",
          "src\\services\\ContractService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "ContractRenewalService"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/contract/",
          "file": "contractRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/contract/:id",
          "file": "contractRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/contract/company/:company_id",
          "file": "contractRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/contract/company/:company_id/active",
          "file": "contractRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/contract/:id/sign",
          "file": "contractRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/contract/:id/modules",
          "file": "contractRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/contract/:id/suspend",
          "file": "contractRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/contract/:id/reactivate",
          "file": "contractRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/contract/:id/terminate",
          "file": "contractRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/contract/:id/cancel",
          "file": "contractRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/contract/stats/overview",
          "file": "contractRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/contract/stats/seller/:seller_id",
          "file": "contractRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/contract/check-expiring",
          "file": "contractRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/contract/:id/pdf",
          "file": "contractRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "contracts",
          "model": "Contract",
          "file": "Contract.js"
        },
        {
          "table": "contracts",
          "model": "ContractOnboarding",
          "file": "ContractOnboarding.js"
        },
        {
          "table": "procurement_contracts",
          "model": "ProcurementContract",
          "file": "ProcurementContract.js"
        },
        {
          "table": "procurement_contract_items",
          "model": "ProcurementContractItem",
          "file": "ProcurementContractItem.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 4541,
      "lastModified": "2026-01-07T11:26:46.106Z",
      "complexity": "complex"
    },
    "contracts": {
      "name": "contracts",
      "generatedAt": "2026-01-08T00:23:58.422Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\contractsRoutes.js",
          "src\\services\\ContractService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "database",
          "auth"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/contracts/company/:companyId",
          "file": "contractsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/contracts/company/:companyId/active",
          "file": "contractsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/contracts/:id",
          "file": "contractsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/contracts/:id/suspend",
          "file": "contractsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/contracts/:id/reactivate",
          "file": "contractsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/contracts/:id/terminate",
          "file": "contractsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/contracts/:id/cancel",
          "file": "contractsRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/contracts/:id/modules",
          "file": "contractsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/contracts/stats/mrr",
          "file": "contractsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/contracts/stats/global",
          "file": "contractsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/contracts/seller/:sellerId/stats",
          "file": "contractsRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "contracts",
          "model": "Contract",
          "file": "Contract.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 973,
      "lastModified": "2025-12-18T15:40:23.352Z",
      "complexity": "complex"
    },
    "coordination": {
      "name": "coordination",
      "generatedAt": "2026-01-08T00:23:59.609Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\coordinationRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "SessionCoordinator"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/coordination/register",
          "file": "coordinationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/coordination/heartbeat",
          "file": "coordinationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/coordination/close",
          "file": "coordinationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/coordination/acquire-lock",
          "file": "coordinationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/coordination/release-lock",
          "file": "coordinationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/coordination/status",
          "file": "coordinationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/coordination/my-tasks",
          "file": "coordinationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/coordination/team",
          "file": "coordinationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/coordination/locks",
          "file": "coordinationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/coordination/check-conflicts",
          "file": "coordinationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/coordination/force-release",
          "file": "coordinationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/coordination/force-release-task",
          "file": "coordinationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/coordination/sessions-with-tasks",
          "file": "coordinationRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 540,
      "lastModified": "2025-12-16T13:34:18.758Z",
      "complexity": "complex"
    },
    "criticalPath": {
      "name": "criticalPath",
      "generatedAt": "2026-01-08T00:24:00.384Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\criticalPathRoutes.js",
          "src\\services\\CriticalPathAnalyzer.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "CriticalPathAnalyzer"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/criticalPath/analyze",
          "file": "criticalPathRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/criticalPath/update-priority",
          "file": "criticalPathRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/criticalPath/reorder",
          "file": "criticalPathRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/criticalPath/suggested-order",
          "file": "criticalPathRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/criticalPath/statistics",
          "file": "criticalPathRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 848,
      "lastModified": "2025-12-16T13:34:18.899Z",
      "complexity": "complex"
    },
    "databaseSchema": {
      "name": "databaseSchema",
      "generatedAt": "2026-01-08T00:24:01.181Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\databaseSchemaRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "DatabaseAnalyzer"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/databaseSchema/all",
          "file": "databaseSchemaRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/databaseSchema/table/:tableName",
          "file": "databaseSchemaRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/databaseSchema/field-usage/:tableName/:fieldName",
          "file": "databaseSchemaRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/databaseSchema/dependencies",
          "file": "databaseSchemaRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/databaseSchema/rules",
          "file": "databaseSchemaRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/databaseSchema/run-analysis",
          "file": "databaseSchemaRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 196,
      "lastModified": "2025-12-16T13:34:18.760Z",
      "complexity": "simple"
    },
    "databaseSync": {
      "name": "databaseSync",
      "generatedAt": "2026-01-08T00:24:02.079Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\databaseSyncRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/databaseSync/compare-schema",
          "file": "databaseSyncRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/databaseSync/sync-schema",
          "file": "databaseSyncRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/databaseSync/tables",
          "file": "databaseSyncRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/databaseSync/table/:tableName/columns",
          "file": "databaseSyncRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/databaseSync/execute-sql",
          "file": "databaseSyncRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/databaseSync/debug-compare/:tableName",
          "file": "databaseSyncRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 797,
      "lastModified": "2025-12-16T13:34:18.761Z",
      "complexity": "complex"
    },
    "debug-company-modules": {
      "name": "debug-company-modules",
      "generatedAt": "2026-01-08T00:24:02.881Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\debug-company-modules.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/debug-company-modules/company/:slug/modules",
          "file": "debug-company-modules.js"
        }
      ],
      "databaseTables": [
        {
          "table": "companies",
          "model": "Company",
          "file": "Company.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 65,
      "lastModified": "2025-12-18T15:40:23.297Z",
      "complexity": "simple"
    },
    "debug-db": {
      "name": "debug-db",
      "generatedAt": "2026-01-08T00:24:03.707Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\debug-db.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/debug-db/debug-database-config",
          "file": "debug-db.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 22,
      "lastModified": "2025-12-18T15:40:23.297Z",
      "complexity": "simple"
    },
    "department": {
      "name": "department",
      "generatedAt": "2026-01-08T00:24:04.527Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\auditor\\collectors\\DepartmentsModuleCollector.js",
          "src\\models\\Department-postgresql.js",
          "src\\routes\\departmentRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "BaseModuleCollector"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/department/",
          "file": "departmentRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/department/:id",
          "file": "departmentRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/department/",
          "file": "departmentRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/department/:id",
          "file": "departmentRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/department/:id",
          "file": "departmentRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/department/:id/users",
          "file": "departmentRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "departments",
          "model": "Department-postgresql",
          "file": "Department-postgresql.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 939,
      "lastModified": "2025-12-16T13:34:18.762Z",
      "complexity": "complex"
    },
    "deploymentSync": {
      "name": "deploymentSync",
      "generatedAt": "2026-01-08T00:24:05.237Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\deploymentSyncRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/deploymentSync/status",
          "file": "deploymentSyncRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/deploymentSync/git-diff",
          "file": "deploymentSyncRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/deploymentSync/push",
          "file": "deploymentSyncRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/deploymentSync/apk/versions",
          "file": "deploymentSyncRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/deploymentSync/apk/build",
          "file": "deploymentSyncRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 359,
      "lastModified": "2025-12-16T13:34:18.764Z",
      "complexity": "moderate"
    },
    "deploy": {
      "name": "deploy",
      "generatedAt": "2026-01-08T00:24:06.031Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\deploymentSyncRoutes.js",
          "src\\routes\\deployRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/deploy/pre-deploy-check",
          "file": "deployRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/deploy/pending-migrations",
          "file": "deployRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/deploy/migrate-to-render",
          "file": "deployRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/deploy/test-stats",
          "file": "deployRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/deploy/migrate-to-staging",
          "file": "deployRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/deploy/run-staging-tests",
          "file": "deployRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/deploy/migrate-to-production",
          "file": "deployRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/deploy/maintenance/status",
          "file": "deployRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/deploy/maintenance/enable",
          "file": "deployRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/deploy/maintenance/disable",
          "file": "deployRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 1402,
      "lastModified": "2025-12-16T13:34:18.764Z",
      "complexity": "complex"
    },
    "diagnostic": {
      "name": "diagnostic",
      "generatedAt": "2026-01-08T00:24:06.919Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\diagnostic.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/diagnostic/table-columns/:tableName",
          "file": "diagnostic.js"
        },
        {
          "method": "GET",
          "path": "/api/diagnostic/migrations-status",
          "file": "diagnostic.js"
        },
        {
          "method": "POST",
          "path": "/api/diagnostic/execute-fix-schema",
          "file": "diagnostic.js"
        },
        {
          "method": "POST",
          "path": "/api/diagnostic/create-test-user",
          "file": "diagnostic.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 244,
      "lastModified": "2025-10-08T11:52:23.219Z",
      "complexity": "moderate"
    },
    "dms": {
      "name": "dms",
      "generatedAt": "2026-01-08T00:24:07.881Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\auditor\\collectors\\DMSModuleCollector.js",
          "src\\models\\dms.js",
          "src\\routes\\dms.js",
          "src\\services\\dms\\adapters\\LegalDMSAdapter.js",
          "src\\services\\dms\\adapters\\MedicalDMSAdapter.js",
          "src\\services\\dms\\adapters\\PayrollDMSAdapter.js",
          "src\\services\\dms\\adapters\\SanctionDMSAdapter.js",
          "src\\services\\dms\\adapters\\TrainingDMSAdapter.js",
          "src\\services\\dms\\adapters\\VacationDMSAdapter.js",
          "src\\services\\dms\\DMSIntegrationService.js",
          "src\\services\\dms.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "BaseModuleCollector"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/dms/health",
          "file": "dms.js"
        }
      ],
      "databaseTables": [
        {
          "table": "dmss",
          "model": "dms",
          "file": "dms.js",
          "inferred": true
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 2948,
      "lastModified": "2026-01-02T13:05:15.356Z",
      "complexity": "complex"
    },
    "documentExpiration": {
      "name": "documentExpiration",
      "generatedAt": "2026-01-08T00:24:08.910Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\documentExpirationRoutes.js",
          "src\\services\\DocumentExpirationNotificationService.js",
          "src\\services\\DocumentExpirationScheduler.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "DocumentExpirationNotificationService",
          "ConceptDependencyService"
        ],
        "optional": [
          "ConceptDependencyService"
        ],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/documentExpiration/stats",
          "file": "documentExpirationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/documentExpiration/process",
          "file": "documentExpirationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/documentExpiration/scheduler/status",
          "file": "documentExpirationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/documentExpiration/scheduler/start",
          "file": "documentExpirationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/documentExpiration/scheduler/stop",
          "file": "documentExpirationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/documentExpiration/expiring",
          "file": "documentExpirationRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 876,
      "lastModified": "2025-12-16T13:34:18.903Z",
      "complexity": "complex"
    },
    "document": {
      "name": "document",
      "generatedAt": "2026-01-08T00:24:09.839Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\models\\dms\\Document.js",
          "src\\models\\dms\\DocumentAccessLog.js",
          "src\\models\\dms\\DocumentAlert.js",
          "src\\models\\dms\\DocumentMetadata.js",
          "src\\models\\dms\\DocumentPermission.js",
          "src\\models\\dms\\DocumentRequest.js",
          "src\\models\\dms\\DocumentVersion.js",
          "src\\models\\EmployeeDependencyDocument.js",
          "src\\models\\EmployeeDocument.js",
          "src\\models\\PartnerDocument.js",
          "src\\models\\UserDocuments.js",
          "src\\models\\UserMedicalDocuments.js",
          "src\\routes\\dms\\documentRoutes.js",
          "src\\routes\\dms\\employeeDocumentRoutes.js",
          "src\\routes\\dms\\hrDocumentRoutes.js",
          "src\\routes\\documentExpirationRoutes.js",
          "src\\routes\\documentRoutes.js",
          "src\\routes\\employeeDocumentRoutes.js",
          "src\\routes\\userDocumentsRoutes.js",
          "src\\services\\dms\\DocumentAuditService.js",
          "src\\services\\dms\\DocumentBridge.js",
          "src\\services\\dms\\DocumentRequestWorkflowService.js",
          "src\\services\\dms\\DocumentService.js",
          "src\\services\\dms\\DocumentStorageService.js",
          "src\\services\\DocumentExpirationNotificationService.js",
          "src\\services\\DocumentExpirationScheduler.js",
          "src\\services\\SupplierDocumentService.js",
          "src\\services\\WMSDocumentService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/document/requests",
          "file": "documentRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/document/my-documents",
          "file": "documentRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/document/upload",
          "file": "documentRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/document/upload-for-request",
          "file": "documentRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/document/:id",
          "file": "documentRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/document/:id/download",
          "file": "documentRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/document/create-request",
          "file": "documentRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/document/requests/:id/complete",
          "file": "documentRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/document/admin/requests",
          "file": "documentRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/document/admin/documents",
          "file": "documentRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "employee_dependency_documents",
          "model": "EmployeeDependencyDocument",
          "file": "EmployeeDependencyDocument.js"
        },
        {
          "table": "employee_documents",
          "model": "EmployeeDocument",
          "file": "EmployeeDocument.js"
        },
        {
          "table": "partner_documents",
          "model": "PartnerDocument",
          "file": "PartnerDocument.js"
        },
        {
          "table": "user_documents",
          "model": "UserDocuments",
          "file": "UserDocuments.js"
        },
        {
          "table": "user_medical_documents",
          "model": "UserMedicalDocuments",
          "file": "UserMedicalDocuments.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 9655,
      "lastModified": "2026-01-05T11:40:10.273Z",
      "complexity": "complex"
    },
    "e2eAdvanced": {
      "name": "e2eAdvanced",
      "generatedAt": "2026-01-08T00:24:10.786Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\models\\E2EAdvancedExecution.js",
          "src\\routes\\e2eAdvancedRoutes.js",
          "src\\testing\\e2e-advanced\\api\\e2eAdvancedRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/e2eAdvanced/run",
          "file": "e2eAdvancedRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/e2eAdvanced/run/:layer",
          "file": "e2eAdvancedRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/e2eAdvanced/status/:executionId",
          "file": "e2eAdvancedRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/e2eAdvanced/results/:executionId",
          "file": "e2eAdvancedRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/e2eAdvanced/layers",
          "file": "e2eAdvancedRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/e2eAdvanced/executions",
          "file": "e2eAdvancedRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/e2eAdvanced/executions/:executionId",
          "file": "e2eAdvancedRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "e2e_advanced_executions",
          "model": "E2EAdvancedExecution",
          "file": "E2EAdvancedExecution.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 1318,
      "lastModified": "2026-01-08T00:19:54.427Z",
      "complexity": "complex"
    },
    "e2eTestingAdvanced": {
      "name": "e2eTestingAdvanced",
      "generatedAt": "2026-01-08T00:24:11.788Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\e2eTestingAdvancedRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "MasterTestOrchestrator"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/e2eTestingAdvanced/run",
          "file": "e2eTestingAdvancedRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/e2eTestingAdvanced/run/:layer",
          "file": "e2eTestingAdvancedRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/e2eTestingAdvanced/status/:executionId",
          "file": "e2eTestingAdvancedRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/e2eTestingAdvanced/results/:executionId",
          "file": "e2eTestingAdvancedRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/e2eTestingAdvanced/layers",
          "file": "e2eTestingAdvancedRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/e2eTestingAdvanced/executions",
          "file": "e2eTestingAdvancedRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/e2eTestingAdvanced/executions/:executionId",
          "file": "e2eTestingAdvancedRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 349,
      "lastModified": "2026-01-04T02:13:03.223Z",
      "complexity": "moderate"
    },
    "e2eTesting": {
      "name": "e2eTesting",
      "generatedAt": "2026-01-08T00:24:12.643Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\e2eTestingAdvancedRoutes.js",
          "src\\routes\\e2eTestingRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "MasterTestOrchestrator"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/e2eTesting/live-stats",
          "file": "e2eTestingRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/e2eTesting/modules-status",
          "file": "e2eTestingRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/e2eTesting/execution/:executionId",
          "file": "e2eTestingRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 534,
      "lastModified": "2026-01-04T02:13:03.223Z",
      "complexity": "complex"
    },
    "emailConfig": {
      "name": "emailConfig",
      "generatedAt": "2026-01-08T00:24:13.492Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\emailConfigRoutes.js",
          "src\\services\\EmailConfigService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "EmailConfigService"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/emailConfig/",
          "file": "emailConfigRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/emailConfig/stats",
          "file": "emailConfigRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/emailConfig/",
          "file": "emailConfigRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/emailConfig/processes/all",
          "file": "emailConfigRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/emailConfig/processes/stats",
          "file": "emailConfigRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/emailConfig/processes/:processKey/email",
          "file": "emailConfigRoutes.js"
        },
        {
          "method": "PATCH",
          "path": "/api/emailConfig/processes/:processKey",
          "file": "emailConfigRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/emailConfig/processes/batch",
          "file": "emailConfigRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/emailConfig/audit/all",
          "file": "emailConfigRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/emailConfig/:emailType",
          "file": "emailConfigRoutes.js"
        },
        {
          "method": "PATCH",
          "path": "/api/emailConfig/:emailType",
          "file": "emailConfigRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/emailConfig/:emailType/test",
          "file": "emailConfigRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/emailConfig/:emailType/audit",
          "file": "emailConfigRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 1324,
      "lastModified": "2026-01-04T02:13:03.272Z",
      "complexity": "complex"
    },
    "email": {
      "name": "email",
      "generatedAt": "2026-01-08T00:24:14.477Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\cron\\companyEmailPollerCron.js",
          "src\\models\\EmailVerificationToken.js",
          "src\\routes\\companyEmailProcessRoutes.js",
          "src\\routes\\companyEmailRoutes.js",
          "src\\routes\\emailConfigRoutes.js",
          "src\\routes\\emailRoutes.js",
          "src\\routes\\emailVerificationRoutes.js",
          "src\\routes\\inboundEmailRoutes.js",
          "src\\services\\CompanyEmailPollerService.js",
          "src\\services\\CompanyEmailProcessService.js",
          "src\\services\\EmailConfigService.js",
          "src\\services\\EmailService.js",
          "src\\services\\EmailVerificationService.js",
          "src\\services\\InboundEmailService.js",
          "src\\services\\SupplierEmailService.js",
          "src\\utils\\EmailTemplateRenderer.js",
          "src\\workers\\EmailWorker.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "CompanyEmailPollerService"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/email/config/validate",
          "file": "emailRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/email/config/company",
          "file": "emailRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/email/config/company/:companyId",
          "file": "emailRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/email/queue",
          "file": "emailRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/email/logs",
          "file": "emailRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/email/stats",
          "file": "emailRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/email/worker/status",
          "file": "emailRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "email_verification_tokens",
          "model": "EmailVerificationToken",
          "file": "EmailVerificationToken.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 8571,
      "lastModified": "2026-01-07T12:00:43.309Z",
      "complexity": "complex"
    },
    "emailVerification": {
      "name": "emailVerification",
      "generatedAt": "2026-01-08T00:24:15.537Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\models\\EmailVerificationToken.js",
          "src\\routes\\emailVerificationRoutes.js",
          "src\\services\\EmailVerificationService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/emailVerification/verify",
          "file": "emailVerificationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/emailVerification/verify/:token",
          "file": "emailVerificationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/emailVerification/send",
          "file": "emailVerificationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/emailVerification/resend",
          "file": "emailVerificationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/emailVerification/status/:userId/:userType",
          "file": "emailVerificationRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/emailVerification/cleanup",
          "file": "emailVerificationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/emailVerification/health",
          "file": "emailVerificationRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "email_verification_tokens",
          "model": "EmailVerificationToken",
          "file": "EmailVerificationToken.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 1504,
      "lastModified": "2026-01-07T12:00:43.309Z",
      "complexity": "complex"
    },
    "emotionalAnalysis": {
      "name": "emotionalAnalysis",
      "generatedAt": "2026-01-08T00:24:16.679Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\models\\EmotionalAnalysis.js",
          "src\\routes\\emotionalAnalysisRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/emotionalAnalysis/analyze",
          "file": "emotionalAnalysisRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/emotionalAnalysis/history/:userId",
          "file": "emotionalAnalysisRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/emotionalAnalysis/department-report/:departmentId",
          "file": "emotionalAnalysisRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/emotionalAnalysis/test",
          "file": "emotionalAnalysisRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "biometric_emotional_analysis",
          "model": "EmotionalAnalysis",
          "file": "EmotionalAnalysis.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 477,
      "lastModified": "2025-12-16T13:34:18.775Z",
      "complexity": "moderate"
    },
    "employee360": {
      "name": "employee360",
      "generatedAt": "2026-01-08T00:24:17.612Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\employee360Routes.js",
          "src\\services\\Employee360Service.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "Employee360Service",
          "auth",
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/employee360/dashboard",
          "file": "employee360Routes.js"
        },
        {
          "method": "GET",
          "path": "/api/employee360/:userId/report",
          "file": "employee360Routes.js"
        },
        {
          "method": "GET",
          "path": "/api/employee360/:userId/summary",
          "file": "employee360Routes.js"
        },
        {
          "method": "GET",
          "path": "/api/employee360/:userId/timeline",
          "file": "employee360Routes.js"
        },
        {
          "method": "GET",
          "path": "/api/employee360/:userId/scoring",
          "file": "employee360Routes.js"
        },
        {
          "method": "POST",
          "path": "/api/employee360/compare",
          "file": "employee360Routes.js"
        },
        {
          "method": "GET",
          "path": "/api/employee360/:userId/export/pdf",
          "file": "employee360Routes.js"
        },
        {
          "method": "GET",
          "path": "/api/employee360/:userId/ai-analysis",
          "file": "employee360Routes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "employees",
          "model": "Employee",
          "file": "Employee.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 3416,
      "lastModified": "2025-12-16T13:34:18.909Z",
      "complexity": "complex"
    },
    "employeeDocument": {
      "name": "employeeDocument",
      "generatedAt": "2026-01-08T00:24:18.619Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\models\\EmployeeDocument.js",
          "src\\routes\\dms\\employeeDocumentRoutes.js",
          "src\\routes\\employeeDocumentRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/employeeDocument/user/:userId",
          "file": "employeeDocumentRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/employeeDocument/:id",
          "file": "employeeDocumentRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/employeeDocument/",
          "file": "employeeDocumentRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/employeeDocument/:id",
          "file": "employeeDocumentRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/employeeDocument/dni/:userId/photos",
          "file": "employeeDocumentRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/employeeDocument/passport/:userId",
          "file": "employeeDocumentRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/employeeDocument/alerts/expiring",
          "file": "employeeDocumentRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/employeeDocument/alerts/expired",
          "file": "employeeDocumentRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/employeeDocument/update-statuses",
          "file": "employeeDocumentRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/employeeDocument/stats/overview",
          "file": "employeeDocumentRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "employees",
          "model": "Employee",
          "file": "Employee.js"
        },
        {
          "table": "employee_documents",
          "model": "EmployeeDocument",
          "file": "EmployeeDocument.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 995,
      "lastModified": "2025-12-16T13:34:18.767Z",
      "complexity": "complex"
    },
    "engineeringMetadata": {
      "name": "engineeringMetadata",
      "generatedAt": "2026-01-08T00:24:20.315Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\engineeringMetadataRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "EcosystemBrainService",
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/engineeringMetadata/live-metadata",
          "file": "engineeringMetadataRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/engineeringMetadata/live-metadata/:moduleName",
          "file": "engineeringMetadataRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/engineeringMetadata/dependencies/:moduleName",
          "file": "engineeringMetadataRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/engineeringMetadata/endpoints/:moduleName",
          "file": "engineeringMetadataRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/engineeringMetadata/database-tables/:moduleName",
          "file": "engineeringMetadataRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/engineeringMetadata/stats",
          "file": "engineeringMetadataRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/engineeringMetadata/health",
          "file": "engineeringMetadataRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 240,
      "lastModified": "2025-12-16T13:34:18.777Z",
      "complexity": "moderate"
    },
    "engineering": {
      "name": "engineering",
      "generatedAt": "2026-01-08T00:24:22.633Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\engineeringMetadataRoutes.js",
          "src\\routes\\engineeringRoutes.js"
        ],
        "frontend": [
          "public\\js\\modules\\engineering-dashboard.js"
        ]
      },
      "dependencies": {
        "required": [
          "EcosystemBrainService",
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/engineering/metadata",
          "file": "engineeringRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/engineering/modules",
          "file": "engineeringRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/engineering/commercial-modules",
          "file": "engineeringRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/engineering/commercial-modules/:moduleKey",
          "file": "engineeringRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/engineering/bundles",
          "file": "engineeringRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/engineering/commercial-modules/category/:category",
          "file": "engineeringRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/engineering/commercial-modules/:moduleKey/pricing",
          "file": "engineeringRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/engineering/bundles",
          "file": "engineeringRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/engineering/bundles/:bundleKey",
          "file": "engineeringRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/engineering/sync-commercial-modules",
          "file": "engineeringRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/engineering/roadmap",
          "file": "engineeringRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/engineering/workflows",
          "file": "engineeringRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/engineering/workflows/:workflowId",
          "file": "engineeringRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/engineering/workflows/:workflowId/tutorial",
          "file": "engineeringRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/engineering/tutorials",
          "file": "engineeringRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/engineering/database",
          "file": "engineeringRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/engineering/applications",
          "file": "engineeringRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/engineering/stats",
          "file": "engineeringRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/engineering/update",
          "file": "engineeringRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/engineering/reload",
          "file": "engineeringRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/engineering/health",
          "file": "engineeringRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/engineering/full-system-status",
          "file": "engineeringRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/engineering/scan-files",
          "file": "engineeringRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/engineering/read-file",
          "file": "engineeringRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/engineering/update-task-description",
          "file": "engineeringRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 1991,
      "lastModified": "2026-01-04T02:13:03.225Z",
      "complexity": "complex"
    },
    "enterprise-scalability-api": {
      "name": "enterprise-scalability-api",
      "generatedAt": "2026-01-08T00:24:24.351Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\enterprise-scalability-api.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "enterprise-scalability-engine"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/enterprise-scalability-api/kubernetes/manifests",
          "file": "enterprise-scalability-api.js"
        },
        {
          "method": "POST",
          "path": "/api/enterprise-scalability-api/kubernetes/deploy",
          "file": "enterprise-scalability-api.js"
        },
        {
          "method": "POST",
          "path": "/api/enterprise-scalability-api/redis/initialize",
          "file": "enterprise-scalability-api.js"
        },
        {
          "method": "POST",
          "path": "/api/enterprise-scalability-api/redis/cache/test",
          "file": "enterprise-scalability-api.js"
        },
        {
          "method": "POST",
          "path": "/api/enterprise-scalability-api/kafka/initialize",
          "file": "enterprise-scalability-api.js"
        },
        {
          "method": "POST",
          "path": "/api/enterprise-scalability-api/kafka/publish/test",
          "file": "enterprise-scalability-api.js"
        },
        {
          "method": "POST",
          "path": "/api/enterprise-scalability-api/initialize-all",
          "file": "enterprise-scalability-api.js"
        },
        {
          "method": "GET",
          "path": "/api/enterprise-scalability-api/metrics",
          "file": "enterprise-scalability-api.js"
        },
        {
          "method": "GET",
          "path": "/api/enterprise-scalability-api/health",
          "file": "enterprise-scalability-api.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 403,
      "lastModified": "2025-09-26T14:10:46.754Z",
      "complexity": "moderate"
    },
    "faceAuth": {
      "name": "faceAuth",
      "generatedAt": "2026-01-08T00:24:25.775Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\faceAuthRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "database",
          "auth"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/faceAuth/register",
          "file": "faceAuthRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/faceAuth/authenticate",
          "file": "faceAuthRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/faceAuth/verify-liveness",
          "file": "faceAuthRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/faceAuth/user/:userId/biometric-status",
          "file": "faceAuthRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 502,
      "lastModified": "2025-09-25T22:39:39.272Z",
      "complexity": "complex"
    },
    "facialBiometric": {
      "name": "facialBiometric",
      "generatedAt": "2026-01-08T00:24:27.041Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\models\\FacialBiometricData.js",
          "src\\routes\\facialBiometricRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/facialBiometric/register",
          "file": "facialBiometricRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/facialBiometric/verify",
          "file": "facialBiometricRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/facialBiometric/user/:userId",
          "file": "facialBiometricRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/facialBiometric/stats",
          "file": "facialBiometricRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/facialBiometric/:id/validate",
          "file": "facialBiometricRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/facialBiometric/:id",
          "file": "facialBiometricRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "facial_biometric_data",
          "model": "FacialBiometricData",
          "file": "FacialBiometricData.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 450,
      "lastModified": "2026-01-04T02:13:03.226Z",
      "complexity": "moderate"
    },
    "fastAttendance": {
      "name": "fastAttendance",
      "generatedAt": "2026-01-08T00:24:28.303Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\fastAttendanceRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "AttendanceQueueService",
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/fastAttendance/fast-clock-in",
          "file": "fastAttendanceRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/fastAttendance/ticket/:ticketId",
          "file": "fastAttendanceRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/fastAttendance/health",
          "file": "fastAttendanceRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/fastAttendance/ready",
          "file": "fastAttendanceRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/fastAttendance/preload-cache",
          "file": "fastAttendanceRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/fastAttendance/cache/:companyId",
          "file": "fastAttendanceRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/fastAttendance/metrics",
          "file": "fastAttendanceRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 262,
      "lastModified": "2026-01-02T13:05:15.455Z",
      "complexity": "moderate"
    },
    "financeAccounts": {
      "name": "financeAccounts",
      "generatedAt": "2026-01-08T00:24:29.407Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\financeAccountsRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "database",
          "FinanceAutoPostingService",
          "auth"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/financeAccounts/chart",
          "file": "financeAccountsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/financeAccounts/chart/tree",
          "file": "financeAccountsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/financeAccounts/chart/:id",
          "file": "financeAccountsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/financeAccounts/chart",
          "file": "financeAccountsRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/financeAccounts/chart/:id",
          "file": "financeAccountsRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/financeAccounts/chart/:id",
          "file": "financeAccountsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/financeAccounts/cost-centers",
          "file": "financeAccountsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/financeAccounts/cost-centers/tree",
          "file": "financeAccountsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/financeAccounts/cost-centers",
          "file": "financeAccountsRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/financeAccounts/cost-centers/:id",
          "file": "financeAccountsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/financeAccounts/fiscal-periods",
          "file": "financeAccountsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/financeAccounts/fiscal-periods/current",
          "file": "financeAccountsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/financeAccounts/fiscal-periods/create-year",
          "file": "financeAccountsRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/financeAccounts/fiscal-periods/:id/status",
          "file": "financeAccountsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/financeAccounts/journal-entries",
          "file": "financeAccountsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/financeAccounts/journal-entries/:id",
          "file": "financeAccountsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/financeAccounts/journal-entries",
          "file": "financeAccountsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/financeAccounts/journal-entries/:id/post",
          "file": "financeAccountsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/financeAccounts/journal-entries/:id/reverse",
          "file": "financeAccountsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/financeAccounts/dimensions",
          "file": "financeAccountsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/financeAccounts/dimensions/:dimension/values",
          "file": "financeAccountsRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 937,
      "lastModified": "2026-01-04T02:13:03.228Z",
      "complexity": "complex"
    },
    "financeBudget": {
      "name": "financeBudget",
      "generatedAt": "2026-01-08T00:24:30.658Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\models\\FinanceBudget.js",
          "src\\models\\FinanceBudgetExecution.js",
          "src\\models\\FinanceBudgetInvestment.js",
          "src\\models\\FinanceBudgetLine.js",
          "src\\routes\\financeBudgetRoutes.js",
          "src\\services\\FinanceBudgetService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/financeBudget/list",
          "file": "financeBudgetRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/financeBudget/:id",
          "file": "financeBudgetRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/financeBudget/",
          "file": "financeBudgetRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/financeBudget/generate-from-historical",
          "file": "financeBudgetRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/financeBudget/:id",
          "file": "financeBudgetRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/financeBudget/:id/status",
          "file": "financeBudgetRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/financeBudget/:id/lines",
          "file": "financeBudgetRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/financeBudget/:id/lines",
          "file": "financeBudgetRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/financeBudget/lines/:lineId",
          "file": "financeBudgetRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/financeBudget/lines/:lineId",
          "file": "financeBudgetRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/financeBudget/:id/investments",
          "file": "financeBudgetRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/financeBudget/:id/investments",
          "file": "financeBudgetRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/financeBudget/investments/:investmentId",
          "file": "financeBudgetRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/financeBudget/investments/:investmentId/status",
          "file": "financeBudgetRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/financeBudget/:id/execution",
          "file": "financeBudgetRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/financeBudget/:id/projection",
          "file": "financeBudgetRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/financeBudget/inflation-rates",
          "file": "financeBudgetRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/financeBudget/inflation-rates",
          "file": "financeBudgetRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "budgets",
          "model": "Budget",
          "file": "Budget.js"
        },
        {
          "table": "finance_budgets",
          "model": "FinanceBudget",
          "file": "FinanceBudget.js"
        },
        {
          "table": "finance_budget_execution",
          "model": "FinanceBudgetExecution",
          "file": "FinanceBudgetExecution.js"
        },
        {
          "table": "finance_budget_investments",
          "model": "FinanceBudgetInvestment",
          "file": "FinanceBudgetInvestment.js"
        },
        {
          "table": "finance_budget_lines",
          "model": "FinanceBudgetLine",
          "file": "FinanceBudgetLine.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 2487,
      "lastModified": "2026-01-04T02:13:03.272Z",
      "complexity": "complex"
    },
    "financeDashboard": {
      "name": "financeDashboard",
      "generatedAt": "2026-01-08T00:24:32.042Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\financeDashboardRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "database",
          "FinanceKPIService",
          "FinanceBudgetService",
          "FinanceCashFlowService",
          "auth"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/financeDashboard/",
          "file": "financeDashboardRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/financeDashboard/kpis/liquidity",
          "file": "financeDashboardRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/financeDashboard/kpis/profitability",
          "file": "financeDashboardRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/financeDashboard/kpis/budget",
          "file": "financeDashboardRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/financeDashboard/kpis/cash-flow",
          "file": "financeDashboardRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/financeDashboard/kpis/operational",
          "file": "financeDashboardRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/financeDashboard/projections/year-end",
          "file": "financeDashboardRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/financeDashboard/projections/cash-flow",
          "file": "financeDashboardRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/financeDashboard/projections/budget",
          "file": "financeDashboardRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/financeDashboard/alerts",
          "file": "financeDashboardRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/financeDashboard/widgets/revenue-expense",
          "file": "financeDashboardRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/financeDashboard/widgets/budget-gauge",
          "file": "financeDashboardRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/financeDashboard/widgets/cash-position",
          "file": "financeDashboardRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/financeDashboard/widgets/top-expenses",
          "file": "financeDashboardRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/financeDashboard/widgets/ratios-summary",
          "file": "financeDashboardRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 590,
      "lastModified": "2026-01-05T01:10:00.840Z",
      "complexity": "complex"
    },
    "financeReports": {
      "name": "financeReports",
      "generatedAt": "2026-01-08T00:24:33.105Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\financeReportsRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "database",
          "FinanceReportingService",
          "auth"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/financeReports/balance-sheet",
          "file": "financeReportsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/financeReports/income-statement",
          "file": "financeReportsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/financeReports/cash-flow-statement",
          "file": "financeReportsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/financeReports/trial-balance",
          "file": "financeReportsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/financeReports/account-ledger/:accountId",
          "file": "financeReportsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/financeReports/cost-center/:costCenterId",
          "file": "financeReportsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/financeReports/variance-analysis",
          "file": "financeReportsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/financeReports/dimensional-analysis",
          "file": "financeReportsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/financeReports/export/:reportType",
          "file": "financeReportsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/financeReports/financial-ratios",
          "file": "financeReportsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/financeReports/trends",
          "file": "financeReportsRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 550,
      "lastModified": "2026-01-04T02:13:03.230Z",
      "complexity": "complex"
    },
    "finance": {
      "name": "finance",
      "generatedAt": "2026-01-08T00:24:34.194Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\models\\FinanceAccountBalance.js",
          "src\\models\\FinanceAuthorizationLog.js",
          "src\\models\\FinanceBalanceCarryover.js",
          "src\\models\\FinanceBankAccount.js",
          "src\\models\\FinanceBankTransaction.js",
          "src\\models\\FinanceBudget.js",
          "src\\models\\FinanceBudgetExecution.js",
          "src\\models\\FinanceBudgetInvestment.js",
          "src\\models\\FinanceBudgetLine.js",
          "src\\models\\FinanceCashAdjustment.js",
          "src\\models\\FinanceCashCount.js",
          "src\\models\\FinanceCashEgressRequest.js",
          "src\\models\\FinanceCashFlowForecast.js",
          "src\\models\\FinanceCashIntegrationConfig.js",
          "src\\models\\FinanceCashMovement.js",
          "src\\models\\FinanceCashRegister.js",
          "src\\models\\FinanceCashRegisterAssignment.js",
          "src\\models\\FinanceCashRegisterSession.js",
          "src\\models\\FinanceCashSessionBalance.js",
          "src\\models\\FinanceCashTransfer.js",
          "src\\models\\FinanceChartOfAccounts.js",
          "src\\models\\FinanceCheckBook.js",
          "src\\models\\FinanceCostCenter.js",
          "src\\models\\FinanceCurrency.js",
          "src\\models\\FinanceCurrencyExchange.js",
          "src\\models\\FinanceDimension.js",
          "src\\models\\FinanceExchangeRate.js",
          "src\\models\\FinanceFiscalPeriod.js",
          "src\\models\\FinanceInflationRate.js",
          "src\\models\\FinanceIssuedCheck.js",
          "src\\models\\FinanceJournalEntry.js",
          "src\\models\\FinanceJournalEntryLine.js",
          "src\\models\\FinancePaymentMethod.js",
          "src\\models\\FinancePaymentOrder.js",
          "src\\models\\FinancePaymentOrderItem.js",
          "src\\models\\FinancePettyCashExpense.js",
          "src\\models\\FinancePettyCashFund.js",
          "src\\models\\FinancePettyCashReplenishment.js",
          "src\\models\\FinanceResponsibleConfig.js",
          "src\\routes\\financeAccountsRoutes.js",
          "src\\routes\\financeBudgetRoutes.js",
          "src\\routes\\financeDashboardRoutes.js",
          "src\\routes\\financeReportsRoutes.js",
          "src\\routes\\financeRoutes.js",
          "src\\routes\\financeTreasuryRoutes.js",
          "src\\services\\FinanceAutoPostingService.js",
          "src\\services\\FinanceBudgetService.js",
          "src\\services\\FinanceCashFlowService.js",
          "src\\services\\FinanceKPIService.js",
          "src\\services\\FinanceModuleIntegration.js",
          "src\\services\\FinanceReconciliationService.js",
          "src\\services\\FinanceReportingService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/finance/status",
          "file": "financeRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/finance/initialize",
          "file": "financeRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/finance/integrations",
          "file": "financeRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/finance/integrations/:integration/auto-posting",
          "file": "financeRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/finance/bundles",
          "file": "financeRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/finance/deactivation-impact/:module",
          "file": "financeRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/finance/sync-cost-centers",
          "file": "financeRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "finance_account_balances",
          "model": "FinanceAccountBalance",
          "file": "FinanceAccountBalance.js"
        },
        {
          "table": "finance_authorization_logs",
          "model": "FinanceAuthorizationLog",
          "file": "FinanceAuthorizationLog.js"
        },
        {
          "table": "finance_cash_balance_carryover",
          "model": "FinanceBalanceCarryover",
          "file": "FinanceBalanceCarryover.js"
        },
        {
          "table": "finance_bank_accounts",
          "model": "FinanceBankAccount",
          "file": "FinanceBankAccount.js"
        },
        {
          "table": "finance_bank_transactions",
          "model": "FinanceBankTransaction",
          "file": "FinanceBankTransaction.js"
        },
        {
          "table": "finance_budgets",
          "model": "FinanceBudget",
          "file": "FinanceBudget.js"
        },
        {
          "table": "finance_budget_execution",
          "model": "FinanceBudgetExecution",
          "file": "FinanceBudgetExecution.js"
        },
        {
          "table": "finance_budget_investments",
          "model": "FinanceBudgetInvestment",
          "file": "FinanceBudgetInvestment.js"
        },
        {
          "table": "finance_budget_lines",
          "model": "FinanceBudgetLine",
          "file": "FinanceBudgetLine.js"
        },
        {
          "table": "finance_cash_adjustments",
          "model": "FinanceCashAdjustment",
          "file": "FinanceCashAdjustment.js"
        },
        {
          "table": "finance_cash_counts",
          "model": "FinanceCashCount",
          "file": "FinanceCashCount.js"
        },
        {
          "table": "finance_cash_egress_requests",
          "model": "FinanceCashEgressRequest",
          "file": "FinanceCashEgressRequest.js"
        },
        {
          "table": "finance_cash_flow_forecast",
          "model": "FinanceCashFlowForecast",
          "file": "FinanceCashFlowForecast.js"
        },
        {
          "table": "finance_cash_integration_config",
          "model": "FinanceCashIntegrationConfig",
          "file": "FinanceCashIntegrationConfig.js"
        },
        {
          "table": "finance_cash_movements",
          "model": "FinanceCashMovement",
          "file": "FinanceCashMovement.js"
        },
        {
          "table": "finance_cash_registers",
          "model": "FinanceCashRegister",
          "file": "FinanceCashRegister.js"
        },
        {
          "table": "finance_cash_register_assignments",
          "model": "FinanceCashRegisterAssignment",
          "file": "FinanceCashRegisterAssignment.js"
        },
        {
          "table": "finance_cash_register_sessions",
          "model": "FinanceCashRegisterSession",
          "file": "FinanceCashRegisterSession.js"
        },
        {
          "table": "finance_cash_session_balances",
          "model": "FinanceCashSessionBalance",
          "file": "FinanceCashSessionBalance.js"
        },
        {
          "table": "finance_cash_transfers",
          "model": "FinanceCashTransfer",
          "file": "FinanceCashTransfer.js"
        },
        {
          "table": "finance_chart_of_accounts",
          "model": "FinanceChartOfAccounts",
          "file": "FinanceChartOfAccounts.js"
        },
        {
          "table": "finance_checkbooks",
          "model": "FinanceCheckBook",
          "file": "FinanceCheckBook.js"
        },
        {
          "table": "finance_cost_centers",
          "model": "FinanceCostCenter",
          "file": "FinanceCostCenter.js"
        },
        {
          "table": "finance_currencies",
          "model": "FinanceCurrency",
          "file": "FinanceCurrency.js"
        },
        {
          "table": "finance_currency_exchanges",
          "model": "FinanceCurrencyExchange",
          "file": "FinanceCurrencyExchange.js"
        },
        {
          "table": "finance_dimensions",
          "model": "FinanceDimension",
          "file": "FinanceDimension.js"
        },
        {
          "table": "finance_exchange_rates",
          "model": "FinanceExchangeRate",
          "file": "FinanceExchangeRate.js"
        },
        {
          "table": "finance_fiscal_periods",
          "model": "FinanceFiscalPeriod",
          "file": "FinanceFiscalPeriod.js"
        },
        {
          "table": "finance_inflation_rates",
          "model": "FinanceInflationRate",
          "file": "FinanceInflationRate.js"
        },
        {
          "table": "finance_issued_checks",
          "model": "FinanceIssuedCheck",
          "file": "FinanceIssuedCheck.js"
        },
        {
          "table": "finance_journal_entries",
          "model": "FinanceJournalEntry",
          "file": "FinanceJournalEntry.js"
        },
        {
          "table": "finance_journal_entry_lines",
          "model": "FinanceJournalEntryLine",
          "file": "FinanceJournalEntryLine.js"
        },
        {
          "table": "finance_payment_methods",
          "model": "FinancePaymentMethod",
          "file": "FinancePaymentMethod.js"
        },
        {
          "table": "finance_payment_orders",
          "model": "FinancePaymentOrder",
          "file": "FinancePaymentOrder.js"
        },
        {
          "table": "finance_payment_order_items",
          "model": "FinancePaymentOrderItem",
          "file": "FinancePaymentOrderItem.js"
        },
        {
          "table": "finance_petty_cash_expenses",
          "model": "FinancePettyCashExpense",
          "file": "FinancePettyCashExpense.js"
        },
        {
          "table": "finance_petty_cash_funds",
          "model": "FinancePettyCashFund",
          "file": "FinancePettyCashFund.js"
        },
        {
          "table": "finance_petty_cash_replenishments",
          "model": "FinancePettyCashReplenishment",
          "file": "FinancePettyCashReplenishment.js"
        },
        {
          "table": "finance_responsible_config",
          "model": "FinanceResponsibleConfig",
          "file": "FinanceResponsibleConfig.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 15919,
      "lastModified": "2026-01-05T11:40:10.265Z",
      "complexity": "complex"
    },
    "financeTreasury": {
      "name": "financeTreasury",
      "generatedAt": "2026-01-08T00:24:35.508Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\financeTreasuryRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "database",
          "FinanceCashFlowService",
          "FinanceReconciliationService",
          "auth"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/financeTreasury/bank-accounts",
          "file": "financeTreasuryRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/financeTreasury/bank-accounts/dashboard",
          "file": "financeTreasuryRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/financeTreasury/bank-accounts/:id",
          "file": "financeTreasuryRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/financeTreasury/bank-accounts",
          "file": "financeTreasuryRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/financeTreasury/bank-accounts/:id",
          "file": "financeTreasuryRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/financeTreasury/bank-accounts/:id/balance",
          "file": "financeTreasuryRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/financeTreasury/transactions",
          "file": "financeTreasuryRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/financeTreasury/transactions",
          "file": "financeTreasuryRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/financeTreasury/transactions/import",
          "file": "financeTreasuryRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/financeTreasury/reconciliation/pending",
          "file": "financeTreasuryRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/financeTreasury/reconciliation/suggestions/:bankAccountId",
          "file": "financeTreasuryRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/financeTreasury/reconciliation/reconcile",
          "file": "financeTreasuryRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/financeTreasury/reconciliation/auto/:bankAccountId",
          "file": "financeTreasuryRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/financeTreasury/reconciliation/unreconcile/:transactionId",
          "file": "financeTreasuryRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/financeTreasury/reconciliation/summary/:bankAccountId",
          "file": "financeTreasuryRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/financeTreasury/cash-flow/forecast",
          "file": "financeTreasuryRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/financeTreasury/cash-flow/scenarios",
          "file": "financeTreasuryRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/financeTreasury/cash-flow/alerts",
          "file": "financeTreasuryRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/financeTreasury/dashboard",
          "file": "financeTreasuryRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 684,
      "lastModified": "2026-01-04T02:13:03.231Z",
      "complexity": "complex"
    },
    "holidayApi": {
      "name": "holidayApi",
      "generatedAt": "2026-01-08T00:24:36.518Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\holidayApiRoutes.js",
          "src\\services\\HolidayApiService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "database",
          "auth",
          "HolidayApiService"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/holidayApi/countries",
          "file": "holidayApiRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/holidayApi/latam-countries",
          "file": "holidayApiRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/holidayApi/preview/:countryCode/:year",
          "file": "holidayApiRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/holidayApi/stats/:countryCode/:year",
          "file": "holidayApiRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/holidayApi/check/:countryCode/:date",
          "file": "holidayApiRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/holidayApi/upcoming/:countryCode",
          "file": "holidayApiRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/holidayApi/sync/:countryCode/:year",
          "file": "holidayApiRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/holidayApi/sync-multi/:countryCode",
          "file": "holidayApiRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/holidayApi/sync-for-branch/:branchId",
          "file": "holidayApiRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/holidayApi/sync-all-latam/:year",
          "file": "holidayApiRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/holidayApi/cache",
          "file": "holidayApiRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/holidayApi/health",
          "file": "holidayApiRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "holidays",
          "model": "Holiday",
          "file": "Holiday.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 849,
      "lastModified": "2025-12-16T13:34:18.912Z",
      "complexity": "complex"
    },
    "hourBank": {
      "name": "hourBank",
      "generatedAt": "2026-01-08T00:24:37.726Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\hourBankRoutes.js",
          "src\\services\\HourBankService.js",
          "src\\workflows\\generated\\HourBankWorkflowGenerated.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "auth",
          "HourBankService",
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/hourBank/templates",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hourBank/templates/:id",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/hourBank/templates",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/hourBank/templates/:id",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hourBank/templates/defaults",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/hourBank/templates/init-defaults",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hourBank/balance",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hourBank/balance/:userId",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hourBank/balances",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hourBank/transactions",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hourBank/transactions/:userId",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/hourBank/requests",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hourBank/requests",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hourBank/requests/pending",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/hourBank/requests/:id/approve",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/hourBank/requests/:id/reject",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/hourBank/requests/:id",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hourBank/decisions/pending",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/hourBank/decisions/:id",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hourBank/stats",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hourBank/config",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/hourBank/validate-early-departure",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/hourBank/process-early-departure",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hourBank/health/:userId",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hourBank/my-health",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hourBank/vicious-cycle/:userId",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hourBank/employees-at-risk",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hourBank/budget",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/hourBank/budget",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hourBank/budgets",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hourBank/metrics/company",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hourBank/metrics/branches",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hourBank/metrics/departments",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hourBank/employees-list",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hourBank/metrics",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hourBank/my-summary",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hourBank/employee-summary/:userId",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/hourBank/record-impact",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/hourBank/redemption",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hourBank/redemption/my-requests",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hourBank/redemption/pending-approval",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/hourBank/redemption/:id/approve",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/hourBank/redemption/:id/reject",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/hourBank/redemption/:id",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hourBank/redemption/scheduled",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/hourBank/redemption/process-checkout",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hourBank/redemption/summary",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hourBank/account-statement",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hourBank/account-statement/:userId",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hourBank/loans/my-status",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hourBank/loans/employee-status/:userId",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/hourBank/redemption/execute-with-loan",
          "file": "hourBankRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hourBank/fichajes",
          "file": "hourBankRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 6115,
      "lastModified": "2025-12-16T13:34:19.049Z",
      "complexity": "complex"
    },
    "hoursCube": {
      "name": "hoursCube",
      "generatedAt": "2026-01-08T00:24:38.780Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\hoursCubeRoutes.js",
          "src\\services\\HoursCubeService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "HoursCubeService",
          "ReplacementCostAnalyzer",
          "VacationOptimizer",
          "database",
          "OvertimeCalculatorService"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/hoursCube/:companyId",
          "file": "hoursCubeRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hoursCube/:companyId/drill-down/:dimension/:dimensionId",
          "file": "hoursCubeRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/hoursCube/:companyId/compare-periods",
          "file": "hoursCubeRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hoursCube/:companyId/replacement-costs",
          "file": "hoursCubeRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/hoursCube/:companyId/vacation-projection",
          "file": "hoursCubeRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hoursCube/:companyId/vacation-optimizer",
          "file": "hoursCubeRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/hoursCube/:companyId/vacation-what-if",
          "file": "hoursCubeRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hoursCube/:companyId/executive-dashboard",
          "file": "hoursCubeRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hoursCube/:companyId/multi-level-metrics",
          "file": "hoursCubeRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hoursCube/:companyId/employee/:userId/metrics",
          "file": "hoursCubeRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hoursCube/health",
          "file": "hoursCubeRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 2053,
      "lastModified": "2026-01-04T02:13:03.233Z",
      "complexity": "complex"
    },
    "hsePPEDetection": {
      "name": "hsePPEDetection",
      "generatedAt": "2026-01-08T00:24:39.902Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\hsePPEDetectionRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "hse"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/hsePPEDetection/violations/catalog",
          "file": "hsePPEDetectionRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hsePPEDetection/violations/catalog/grouped",
          "file": "hsePPEDetectionRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hsePPEDetection/violations/suggest",
          "file": "hsePPEDetectionRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hsePPEDetection/violations/ai-tags",
          "file": "hsePPEDetectionRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hsePPEDetection/regulations",
          "file": "hsePPEDetectionRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hsePPEDetection/regulations/:countryCode",
          "file": "hsePPEDetectionRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hsePPEDetection/regulations/:countryCode/consent-document",
          "file": "hsePPEDetectionRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hsePPEDetection/consents/status/:companyId",
          "file": "hsePPEDetectionRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/hsePPEDetection/consents/register",
          "file": "hsePPEDetectionRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hsePPEDetection/ppe/status",
          "file": "hsePPEDetectionRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/hsePPEDetection/ppe/detect",
          "file": "hsePPEDetectionRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hsePPEDetection/ppe/detections",
          "file": "hsePPEDetectionRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hsePPEDetection/ppe/statistics",
          "file": "hsePPEDetectionRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/hsePPEDetection/cases",
          "file": "hsePPEDetectionRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hsePPEDetection/cases/:caseId",
          "file": "hsePPEDetectionRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hsePPEDetection/cases/pending/:companyId",
          "file": "hsePPEDetectionRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/hsePPEDetection/cases/:caseId/assign",
          "file": "hsePPEDetectionRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/hsePPEDetection/cases/:caseId/verdict",
          "file": "hsePPEDetectionRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/hsePPEDetection/cases/:caseId/close",
          "file": "hsePPEDetectionRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hsePPEDetection/cases/statistics/:companyId",
          "file": "hsePPEDetectionRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hsePPEDetection/cases/correlation/:companyId",
          "file": "hsePPEDetectionRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hsePPEDetection/zones/:companyId",
          "file": "hsePPEDetectionRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/hsePPEDetection/zones",
          "file": "hsePPEDetectionRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 664,
      "lastModified": "2025-12-18T15:40:23.301Z",
      "complexity": "complex"
    },
    "hse": {
      "name": "hse",
      "generatedAt": "2026-01-08T00:24:40.852Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\auditor\\collectors\\HSEModuleCollector.js",
          "src\\models\\FinanceCashSessionBalance.js",
          "src\\models\\HseCompanyConfig.js",
          "src\\routes\\hsePPEDetectionRoutes.js",
          "src\\routes\\hseRoutes.js",
          "src\\services\\afip\\AfipAuthService.js",
          "src\\services\\FirebasePushService.js",
          "src\\services\\hse\\HSECaseService.js",
          "src\\services\\hse\\HSEViolationCatalogService.js",
          "src\\services\\HseService.js",
          "src\\services\\PettyCashService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "BaseModuleCollector"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/hse/categories",
          "file": "hseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hse/catalog",
          "file": "hseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/hse/catalog",
          "file": "hseRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/hse/catalog/:id",
          "file": "hseRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/hse/catalog/:id",
          "file": "hseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hse/requirements",
          "file": "hseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hse/requirements/position/:positionId",
          "file": "hseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hse/requirements/matrix",
          "file": "hseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/hse/requirements",
          "file": "hseRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/hse/requirements/:id",
          "file": "hseRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/hse/requirements/:id",
          "file": "hseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hse/deliveries",
          "file": "hseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hse/deliveries/employee/:employeeId",
          "file": "hseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hse/deliveries/expiring",
          "file": "hseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/hse/deliveries",
          "file": "hseRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/hse/deliveries/:id",
          "file": "hseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/hse/deliveries/:id/sign",
          "file": "hseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/hse/deliveries/:id/return",
          "file": "hseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/hse/deliveries/:id/replace",
          "file": "hseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hse/inspections",
          "file": "hseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hse/inspections/pending",
          "file": "hseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/hse/inspections",
          "file": "hseRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/hse/inspections/:id/complete",
          "file": "hseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hse/dashboard",
          "file": "hseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hse/compliance/:employeeId",
          "file": "hseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hse/reports/expiring",
          "file": "hseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/hse/config",
          "file": "hseRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/hse/config",
          "file": "hseRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "finance_cash_session_balances",
          "model": "FinanceCashSessionBalance",
          "file": "FinanceCashSessionBalance.js"
        },
        {
          "table": "hse_company_config",
          "model": "HseCompanyConfig",
          "file": "HseCompanyConfig.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 4894,
      "lastModified": "2026-01-07T15:15:24.447Z",
      "complexity": "complex"
    },
    "inboundEmail": {
      "name": "inboundEmail",
      "generatedAt": "2026-01-08T00:24:42.093Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\inboundEmailRoutes.js",
          "src\\services\\InboundEmailService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "InboundEmailService",
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/inboundEmail/webhook",
          "file": "inboundEmailRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/inboundEmail/sendgrid",
          "file": "inboundEmailRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/inboundEmail/mailgun",
          "file": "inboundEmailRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/inboundEmail/postmark",
          "file": "inboundEmailRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/inboundEmail/ses",
          "file": "inboundEmailRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/inboundEmail/manual",
          "file": "inboundEmailRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/inboundEmail/stats",
          "file": "inboundEmailRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/inboundEmail/history",
          "file": "inboundEmailRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 1179,
      "lastModified": "2025-12-18T15:40:23.362Z",
      "complexity": "complex"
    },
    "inbox": {
      "name": "inbox",
      "generatedAt": "2026-01-08T00:24:43.182Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\inbox.js",
          "src\\services\\inboxService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "inboxService",
          "auth",
          "SLAEscalationService",
          "OllamaNotificationAnalyzer",
          "database"
        ],
        "optional": [
          "SLAEscalationService",
          "OllamaNotificationAnalyzer"
        ],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/inbox/",
          "file": "inbox.js"
        },
        {
          "method": "GET",
          "path": "/api/inbox/stats",
          "file": "inbox.js"
        },
        {
          "method": "GET",
          "path": "/api/inbox/group/:group_id",
          "file": "inbox.js"
        },
        {
          "method": "POST",
          "path": "/api/inbox/group",
          "file": "inbox.js"
        },
        {
          "method": "POST",
          "path": "/api/inbox/group/:group_id/message",
          "file": "inbox.js"
        },
        {
          "method": "PUT",
          "path": "/api/inbox/group/:group_id/read",
          "file": "inbox.js"
        },
        {
          "method": "GET",
          "path": "/api/inbox/employee/:employee_id",
          "file": "inbox.js"
        },
        {
          "method": "GET",
          "path": "/api/inbox/pending-badge",
          "file": "inbox.js"
        },
        {
          "method": "PUT",
          "path": "/api/inbox/group/:group_id/close",
          "file": "inbox.js"
        },
        {
          "method": "POST",
          "path": "/api/inbox/message/:message_id/discharge",
          "file": "inbox.js"
        },
        {
          "method": "PUT",
          "path": "/api/inbox/message/:message_id/discharge/process",
          "file": "inbox.js"
        },
        {
          "method": "GET",
          "path": "/api/inbox/sla-score",
          "file": "inbox.js"
        },
        {
          "method": "GET",
          "path": "/api/inbox/sla-score/:employee_id",
          "file": "inbox.js"
        },
        {
          "method": "GET",
          "path": "/api/inbox/escalation-status",
          "file": "inbox.js"
        },
        {
          "method": "GET",
          "path": "/api/inbox/ai/suggestions",
          "file": "inbox.js"
        },
        {
          "method": "POST",
          "path": "/api/inbox/ai/suggestions/:id/accept",
          "file": "inbox.js"
        },
        {
          "method": "POST",
          "path": "/api/inbox/ai/suggestions/:id/reject",
          "file": "inbox.js"
        },
        {
          "method": "GET",
          "path": "/api/inbox/ai/status",
          "file": "inbox.js"
        },
        {
          "method": "POST",
          "path": "/api/inbox/ai/analyze-message",
          "file": "inbox.js"
        },
        {
          "method": "GET",
          "path": "/api/inbox/ai/knowledge-base",
          "file": "inbox.js"
        },
        {
          "method": "POST",
          "path": "/api/inbox/ai/knowledge-base",
          "file": "inbox.js"
        },
        {
          "method": "POST",
          "path": "/api/inbox/employee-notification",
          "file": "inbox.js"
        },
        {
          "method": "GET",
          "path": "/api/inbox/my-notifications",
          "file": "inbox.js"
        },
        {
          "method": "PUT",
          "path": "/api/inbox/ai/knowledge-base/:id/verify",
          "file": "inbox.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 1934,
      "lastModified": "2025-12-16T13:34:19.032Z",
      "complexity": "complex"
    },
    "invoice": {
      "name": "invoice",
      "generatedAt": "2026-01-08T00:24:44.205Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\models\\Invoice.js",
          "src\\models\\InvoiceItem.js",
          "src\\models\\ProcurementInvoice.js",
          "src\\models\\SupplierInvoice.js",
          "src\\models\\SupplierInvoiceItem.js",
          "src\\routes\\invoiceRoutes.js",
          "src\\services\\billing\\ManualInvoiceService.js",
          "src\\services\\InvoiceGenerationService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/invoice/",
          "file": "invoiceRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/invoice/generate-monthly",
          "file": "invoiceRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/invoice/:id",
          "file": "invoiceRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/invoice/company/:company_id",
          "file": "invoiceRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/invoice/:id/approve",
          "file": "invoiceRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/invoice/:id/send",
          "file": "invoiceRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/invoice/:id/mark-paid",
          "file": "invoiceRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/invoice/:id/cancel",
          "file": "invoiceRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/invoice/check-overdue",
          "file": "invoiceRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/invoice/stats/overview",
          "file": "invoiceRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/invoice/:id/pdf",
          "file": "invoiceRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "invoices",
          "model": "Invoice",
          "file": "Invoice.js"
        },
        {
          "table": "invoice_items",
          "model": "InvoiceItem",
          "file": "InvoiceItem.js"
        },
        {
          "table": "procurement_invoices",
          "model": "ProcurementInvoice",
          "file": "ProcurementInvoice.js"
        },
        {
          "table": "supplier_invoices",
          "model": "SupplierInvoice",
          "file": "SupplierInvoice.js"
        },
        {
          "table": "supplier_invoice_items",
          "model": "SupplierInvoiceItem",
          "file": "SupplierInvoiceItem.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 2066,
      "lastModified": "2026-01-05T23:24:51.057Z",
      "complexity": "complex"
    },
    "invoicing": {
      "name": "invoicing",
      "generatedAt": "2026-01-08T00:24:45.374Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\invoicingRoutes.js",
          "src\\services\\InvoicingService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "PaymentService",
          "CommissionCalculationService",
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/invoicing/payments",
          "file": "invoicingRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/invoicing/payments/:companyId",
          "file": "invoicingRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/invoicing/payments/details/:paymentId",
          "file": "invoicingRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/invoicing/invoices",
          "file": "invoicingRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/invoicing/invoices/:id",
          "file": "invoicingRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/invoicing/commissions/partner/:partnerId",
          "file": "invoicingRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/invoicing/commissions/period/:year/:month",
          "file": "invoicingRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/invoicing/commissions/:id/mark-paid",
          "file": "invoicingRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/invoicing/commissions/pending/:partnerId",
          "file": "invoicingRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 1044,
      "lastModified": "2025-12-16T13:34:18.920Z",
      "complexity": "complex"
    },
    "jobPostings": {
      "name": "jobPostings",
      "generatedAt": "2026-01-08T00:24:46.570Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\auditor\\collectors\\JobPostingsModuleCollector.js",
          "src\\routes\\jobPostingsRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "BaseModuleCollector"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/jobPostings/public/offers",
          "file": "jobPostingsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/jobPostings/public/offers/:id",
          "file": "jobPostingsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/jobPostings/public/apply",
          "file": "jobPostingsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/jobPostings/public/companies",
          "file": "jobPostingsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/jobPostings/public/candidates/register",
          "file": "jobPostingsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/jobPostings/public/candidates/verify",
          "file": "jobPostingsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/jobPostings/public/candidates/login",
          "file": "jobPostingsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/jobPostings/public/candidates/me",
          "file": "jobPostingsRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/jobPostings/public/candidates/profile",
          "file": "jobPostingsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/jobPostings/public/candidates/pool",
          "file": "jobPostingsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/jobPostings/public/candidates/pool/stats",
          "file": "jobPostingsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/jobPostings/candidates/pool",
          "file": "jobPostingsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/jobPostings/candidates/pool/:id",
          "file": "jobPostingsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/jobPostings/candidates/pool/:id/cv",
          "file": "jobPostingsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/jobPostings/candidates/pool/:id/import",
          "file": "jobPostingsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/jobPostings/offers",
          "file": "jobPostingsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/jobPostings/offers/:id",
          "file": "jobPostingsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/jobPostings/offers",
          "file": "jobPostingsRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/jobPostings/offers/:id",
          "file": "jobPostingsRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/jobPostings/offers/:id",
          "file": "jobPostingsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/jobPostings/offers/:id/publish",
          "file": "jobPostingsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/jobPostings/offers/:id/run-internal-matching",
          "file": "jobPostingsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/jobPostings/offers/:id/internal-candidates",
          "file": "jobPostingsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/jobPostings/applications",
          "file": "jobPostingsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/jobPostings/applications/:id",
          "file": "jobPostingsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/jobPostings/applications",
          "file": "jobPostingsRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/jobPostings/applications/:id/status",
          "file": "jobPostingsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/jobPostings/applications/:id/review",
          "file": "jobPostingsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/jobPostings/applications/:id/approve-admin",
          "file": "jobPostingsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/jobPostings/applications/:id/medical-result",
          "file": "jobPostingsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/jobPostings/applications/:id/hire",
          "file": "jobPostingsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/jobPostings/applications/:id/reject",
          "file": "jobPostingsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/jobPostings/applications/:id/cv",
          "file": "jobPostingsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/jobPostings/pending-medical",
          "file": "jobPostingsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/jobPostings/ready-to-hire",
          "file": "jobPostingsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/jobPostings/applications/:id/schedule-interview",
          "file": "jobPostingsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/jobPostings/applications/:id/complete-interview",
          "file": "jobPostingsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/jobPostings/pipeline",
          "file": "jobPostingsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/jobPostings/pending-legal",
          "file": "jobPostingsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/jobPostings/applications/:id/legal-result",
          "file": "jobPostingsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/jobPostings/stats",
          "file": "jobPostingsRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "job_postings",
          "model": "JobPosting",
          "file": "JobPosting.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 3953,
      "lastModified": "2026-01-07T03:40:47.377Z",
      "complexity": "complex"
    },
    "kiosk-enterprise": {
      "name": "kiosk-enterprise",
      "generatedAt": "2026-01-08T00:24:47.712Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\kiosk-enterprise.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "face-api-backend-engine",
          "database",
          "company-isolation"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/kiosk-enterprise/detect-employee",
          "file": "kiosk-enterprise.js"
        },
        {
          "method": "POST",
          "path": "/api/kiosk-enterprise/register-attendance",
          "file": "kiosk-enterprise.js"
        },
        {
          "method": "GET",
          "path": "/api/kiosk-enterprise/stats/:company_id",
          "file": "kiosk-enterprise.js"
        },
        {
          "method": "POST",
          "path": "/api/kiosk-enterprise/configure",
          "file": "kiosk-enterprise.js"
        },
        {
          "method": "GET",
          "path": "/api/kiosk-enterprise/health",
          "file": "kiosk-enterprise.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 476,
      "lastModified": "2025-09-29T03:44:00.830Z",
      "complexity": "moderate"
    },
    "kiosk": {
      "name": "kiosk",
      "generatedAt": "2026-01-08T00:24:48.630Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\auditor\\collectors\\AndroidKioskCollector.js",
          "src\\auditor\\collectors\\KiosksModuleCollector.js",
          "src\\models\\Kiosk-postgresql.js",
          "src\\routes\\kiosk-enterprise.js",
          "src\\routes\\kioskRoutes.js",
          "src\\routes\\kiosks.js",
          "src\\services\\kiosk-websocket-server.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/kiosk/available",
          "file": "kioskRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/kiosk/",
          "file": "kioskRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/kiosk/:id",
          "file": "kioskRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/kiosk/",
          "file": "kioskRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/kiosk/:id",
          "file": "kioskRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/kiosk/:id",
          "file": "kioskRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/kiosk/:id/validate-gps",
          "file": "kioskRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/kiosk/configure-security",
          "file": "kioskRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/kiosk/security-info",
          "file": "kioskRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/kiosk/security-alerts",
          "file": "kioskRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/kiosk/security-alerts/:id/review",
          "file": "kioskRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/kiosk/password-auth",
          "file": "kioskRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/kiosk/:id/activate",
          "file": "kioskRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/kiosk/seed-demo",
          "file": "kioskRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "kiosks",
          "model": "Kiosk-postgresql",
          "file": "Kiosk-postgresql.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 3843,
      "lastModified": "2025-12-18T15:40:23.303Z",
      "complexity": "complex"
    },
    "kiosks": {
      "name": "kiosks",
      "generatedAt": "2026-01-08T00:24:50.249Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\auditor\\collectors\\KiosksModuleCollector.js",
          "src\\routes\\kiosks.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "BaseModuleCollector"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/kiosks/",
          "file": "kiosks.js"
        },
        {
          "method": "GET",
          "path": "/api/kiosks/:id",
          "file": "kiosks.js"
        },
        {
          "method": "POST",
          "path": "/api/kiosks/",
          "file": "kiosks.js"
        },
        {
          "method": "PUT",
          "path": "/api/kiosks/:id",
          "file": "kiosks.js"
        },
        {
          "method": "DELETE",
          "path": "/api/kiosks/:id",
          "file": "kiosks.js"
        },
        {
          "method": "GET",
          "path": "/api/kiosks/:id/stats",
          "file": "kiosks.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 1030,
      "lastModified": "2025-12-16T13:34:18.793Z",
      "complexity": "complex"
    },
    "lead": {
      "name": "lead",
      "generatedAt": "2026-01-08T00:24:51.448Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\leadRoutes.js",
          "src\\services\\LeadScoringService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "LeadScoringService",
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/lead/",
          "file": "leadRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/lead/:id",
          "file": "leadRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/lead/",
          "file": "leadRoutes.js"
        },
        {
          "method": "PATCH",
          "path": "/api/lead/:id",
          "file": "leadRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/lead/:id/activity",
          "file": "leadRoutes.js"
        },
        {
          "method": "PATCH",
          "path": "/api/lead/:id/bant",
          "file": "leadRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/lead/:id/lifecycle",
          "file": "leadRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/lead/:id/disqualify",
          "file": "leadRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/lead/:id/reactivate",
          "file": "leadRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/lead/:id/assign",
          "file": "leadRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/lead/pipeline/summary",
          "file": "leadRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/lead/hot/urgent",
          "file": "leadRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/lead/reactivate/pending",
          "file": "leadRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/lead/stats/vendor",
          "file": "leadRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/lead/maintenance/decay",
          "file": "leadRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 1319,
      "lastModified": "2026-01-04T02:13:03.282Z",
      "complexity": "complex"
    },
    "legal": {
      "name": "legal",
      "generatedAt": "2026-01-08T00:24:52.421Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\auditor\\collectors\\LegalModuleCollector.js",
          "src\\models\\LegalEditAuthorization.js",
          "src\\models\\PartnerLegalConsent.js",
          "src\\models\\UserLegalIssue.js",
          "src\\routes\\legalRoutes.js",
          "src\\routes\\userLegalIssueRoutes.js",
          "src\\services\\dms\\adapters\\LegalDMSAdapter.js",
          "src\\services\\EmployeeLegal360Service.js",
          "src\\services\\LegalCase360Service.js",
          "src\\services\\LegalImmutabilityService.js",
          "src\\services\\LegalJurisdictionService.js",
          "src\\services\\LegalOllamaService.js",
          "src\\services\\LegalWorkflowService.js",
          "src\\workflows\\generated\\LegalCaseWorkflowGenerated.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "BaseModuleCollector",
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/legal/communication-types",
          "file": "legalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/legal/communications",
          "file": "legalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/legal/communications",
          "file": "legalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/legal/communications/:id",
          "file": "legalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/legal/communications/:id/pdf",
          "file": "legalRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/legal/communications/:id/status",
          "file": "legalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/legal/dashboard/stats",
          "file": "legalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/legal/jurisdiction",
          "file": "legalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/legal/jurisdiction/employee/:employeeId",
          "file": "legalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/legal/jurisdiction/all",
          "file": "legalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/legal/employee/:employeeId/legal-360",
          "file": "legalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/legal/issues",
          "file": "legalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/legal/issues",
          "file": "legalRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/legal/issues/:id",
          "file": "legalRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/legal/issues/:id",
          "file": "legalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/legal/editability/:table/:recordId",
          "file": "legalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/legal/authorization/request",
          "file": "legalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/legal/authorization/:id/approve",
          "file": "legalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/legal/authorization/:id/reject",
          "file": "legalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/legal/authorizations/pending",
          "file": "legalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/legal/authorizations/my-requests",
          "file": "legalRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/legal/record/:table/:id",
          "file": "legalRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/legal/record/:table/:id",
          "file": "legalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/legal/cases",
          "file": "legalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/legal/cases",
          "file": "legalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/legal/cases/:id",
          "file": "legalRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/legal/cases/:id/advance-stage",
          "file": "legalRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/legal/cases/:id/sub-status",
          "file": "legalRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/legal/cases/:id/close",
          "file": "legalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/legal/cases/:id/timeline",
          "file": "legalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/legal/cases/:id/timeline",
          "file": "legalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/legal/cases/:id/documents",
          "file": "legalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/legal/cases/:id/documents",
          "file": "legalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/legal/documents/:docId/response",
          "file": "legalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/legal/documents/alerts",
          "file": "legalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/legal/cases/:id/deadlines",
          "file": "legalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/legal/cases/:id/deadlines",
          "file": "legalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/legal/workflow/stages",
          "file": "legalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/legal/dashboard/stats",
          "file": "legalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/legal/employee/:id/360",
          "file": "legalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/legal/cases/:id/employee-360",
          "file": "legalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/legal/ai/status",
          "file": "legalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/legal/ai/analyze-risk",
          "file": "legalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/legal/ai/case-summary",
          "file": "legalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/legal/ai/analyze-employee",
          "file": "legalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/legal/ai/calculate-exposure",
          "file": "legalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/legal/ai/suggest-documents",
          "file": "legalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/legal/ai/assist",
          "file": "legalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/legal/ai/analyze-timeline",
          "file": "legalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/legal/ai/recommendations",
          "file": "legalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/legal/ai/previous-analyses/:caseId",
          "file": "legalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/legal/deadlines/upcoming",
          "file": "legalRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/legal/deadlines/:id/complete",
          "file": "legalRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "legal_edit_authorizations",
          "model": "LegalEditAuthorization",
          "file": "LegalEditAuthorization.js"
        },
        {
          "table": "partner_legal_consents",
          "model": "PartnerLegalConsent",
          "file": "PartnerLegalConsent.js"
        },
        {
          "table": "user_legal_issues",
          "model": "UserLegalIssue",
          "file": "UserLegalIssue.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 9520,
      "lastModified": "2026-01-08T00:04:57.772Z",
      "complexity": "complex"
    },
    "location": {
      "name": "location",
      "generatedAt": "2026-01-08T00:24:53.468Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\models\\EmployeeLocation.js",
          "src\\routes\\locationRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/location/report",
          "file": "locationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/location/current",
          "file": "locationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/location/history/:userId",
          "file": "locationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/location/stats",
          "file": "locationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/location/geofence",
          "file": "locationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/location/branches",
          "file": "locationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/location/departments",
          "file": "locationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/location/track/:userId",
          "file": "locationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/location/visitors",
          "file": "locationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/location/branch-center",
          "file": "locationRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "employee_locations",
          "model": "EmployeeLocation",
          "file": "EmployeeLocation.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 959,
      "lastModified": "2025-12-16T13:34:18.797Z",
      "complexity": "complex"
    },
    "logistics": {
      "name": "logistics",
      "generatedAt": "2026-01-08T00:24:54.497Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\logisticsRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "logistics",
          "auth"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/logistics/warehouses",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/logistics/warehouses/:id",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/logistics/warehouses",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/logistics/warehouses/:id",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/logistics/warehouses/:id/config",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/logistics/warehouses/:id/kpis",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/logistics/warehouses/:warehouseId/locations",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/logistics/locations/:id",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/logistics/locations",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/logistics/warehouses/:warehouseId/locations/bulk",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/logistics/location-types",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/logistics/location-types",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/logistics/warehouses/:warehouseId/stock",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/logistics/stock/product/:productId",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/logistics/stock/adjust",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/logistics/stock/transfer",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/logistics/warehouses/:warehouseId/movements",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/logistics/warehouses/:warehouseId/waves",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/logistics/waves/:id",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/logistics/waves",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/logistics/waves/generate",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/logistics/waves/:id/start",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/logistics/waves/:id/complete",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/logistics/warehouses/:warehouseId/pick-lists",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/logistics/pick-lists/:id",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/logistics/pick-list-lines/:lineId/confirm",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/logistics/picking/kpis",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/logistics/warehouses/:warehouseId/pack-orders",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/logistics/pack-orders",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/logistics/packages",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/logistics/packages/:id/items",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/logistics/packages/:id/close",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/logistics/pack-orders/:id/complete",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/logistics/package-types",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/logistics/package-types",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/logistics/carriers",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/logistics/carriers/:id",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/logistics/carriers",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/logistics/carriers/:id",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/logistics/vehicles",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/logistics/vehicles",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/logistics/vehicles/:id/availability",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/logistics/drivers",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/logistics/drivers",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/logistics/delivery-zones",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/logistics/delivery-zones/:id",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/logistics/delivery-zones",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/logistics/delivery-zones/:id",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/logistics/delivery-zones/customer-config",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/logistics/delivery-zones/:zoneId/customer/:customerId",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/logistics/routes",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/logistics/routes/:id",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/logistics/routes",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/logistics/routes/:id/stops",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/logistics/route-stops/:id",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/logistics/routes/:id/start",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/logistics/routes/:id/optimize",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/logistics/routes/kpis",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/logistics/shipments",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/logistics/shipments/pending",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/logistics/shipments/kpis",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/logistics/shipments/:id",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/logistics/shipments/track/:trackingNumber",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/logistics/shipments",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/logistics/shipments/bulk",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/logistics/shipments/:id/status",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/logistics/shipments/:id/tracking",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/logistics/shipments/:id/assign-carrier",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/logistics/shipments/:id/in-transit",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/logistics/shipments/:id/deliver",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/logistics/shipments/:id/issue",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/logistics/shipments/:id/cancel",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/logistics/shipments/:id/pod",
          "file": "logisticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/logistics/shipments/:id/label",
          "file": "logisticsRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 926,
      "lastModified": "2026-01-04T21:59:54.835Z",
      "complexity": "complex"
    },
    "marketing": {
      "name": "marketing",
      "generatedAt": "2026-01-08T00:24:55.562Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\auditor\\reporters\\MarketingDynamicReporter.js",
          "src\\routes\\marketingRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/marketing/leads",
          "file": "marketingRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/marketing/leads/:id",
          "file": "marketingRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/marketing/leads",
          "file": "marketingRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/marketing/leads/:id",
          "file": "marketingRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/marketing/leads/:id",
          "file": "marketingRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/marketing/leads/:id/send-flyer",
          "file": "marketingRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/marketing/flyer-preview",
          "file": "marketingRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/marketing/stats",
          "file": "marketingRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/marketing/track/:token",
          "file": "marketingRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/marketing/leads/:id/send-survey",
          "file": "marketingRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/marketing/survey/:token",
          "file": "marketingRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/marketing/survey/:token",
          "file": "marketingRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/marketing/leads/:id/events",
          "file": "marketingRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/marketing/leads/pending-surveys",
          "file": "marketingRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 1865,
      "lastModified": "2026-01-04T02:13:03.236Z",
      "complexity": "complex"
    },
    "medicalAdvanced": {
      "name": "medicalAdvanced",
      "generatedAt": "2026-01-08T00:24:56.658Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\models\\UserMedicalAdvanced.js",
          "src\\routes\\medicalAdvancedRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/medicalAdvanced/anthropometric/:userId",
          "file": "medicalAdvancedRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/medicalAdvanced/anthropometric",
          "file": "medicalAdvancedRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/medicalAdvanced/anthropometric/:id",
          "file": "medicalAdvancedRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/medicalAdvanced/anthropometric/:id",
          "file": "medicalAdvancedRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/medicalAdvanced/chronic-conditions-catalog",
          "file": "medicalAdvancedRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/medicalAdvanced/chronic-conditions/:userId",
          "file": "medicalAdvancedRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/medicalAdvanced/chronic-conditions",
          "file": "medicalAdvancedRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/medicalAdvanced/chronic-conditions/:id",
          "file": "medicalAdvancedRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/medicalAdvanced/chronic-conditions/:id",
          "file": "medicalAdvancedRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/medicalAdvanced/surgeries/:userId",
          "file": "medicalAdvancedRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/medicalAdvanced/surgeries",
          "file": "medicalAdvancedRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/medicalAdvanced/surgeries/:id",
          "file": "medicalAdvancedRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/medicalAdvanced/surgeries/:id",
          "file": "medicalAdvancedRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/medicalAdvanced/psychiatric/:userId",
          "file": "medicalAdvancedRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/medicalAdvanced/psychiatric",
          "file": "medicalAdvancedRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/medicalAdvanced/psychiatric/:id",
          "file": "medicalAdvancedRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/medicalAdvanced/psychiatric/:id",
          "file": "medicalAdvancedRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/medicalAdvanced/sports-catalog",
          "file": "medicalAdvancedRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/medicalAdvanced/sports/:userId",
          "file": "medicalAdvancedRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/medicalAdvanced/sports",
          "file": "medicalAdvancedRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/medicalAdvanced/sports/:id",
          "file": "medicalAdvancedRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/medicalAdvanced/sports/:id",
          "file": "medicalAdvancedRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/medicalAdvanced/healthy-habits/:userId",
          "file": "medicalAdvancedRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/medicalAdvanced/healthy-habits",
          "file": "medicalAdvancedRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/medicalAdvanced/healthy-habits/:userId",
          "file": "medicalAdvancedRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/medicalAdvanced/complete/:userId",
          "file": "medicalAdvancedRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "user_anthropometric_data",
          "model": "UserMedicalAdvanced",
          "file": "UserMedicalAdvanced.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 999,
      "lastModified": "2026-01-04T02:13:03.238Z",
      "complexity": "complex"
    },
    "medicalAuthorizations": {
      "name": "medicalAuthorizations",
      "generatedAt": "2026-01-08T00:24:57.967Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\medicalAuthorizationsRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "auth",
          "MedicalImmutabilityService",
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/medicalAuthorizations/pending",
          "file": "medicalAuthorizationsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/medicalAuthorizations/my-requests",
          "file": "medicalAuthorizationsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/medicalAuthorizations/:id",
          "file": "medicalAuthorizationsRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/medicalAuthorizations/:id/approve",
          "file": "medicalAuthorizationsRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/medicalAuthorizations/:id/reject",
          "file": "medicalAuthorizationsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/medicalAuthorizations/:id/window-status",
          "file": "medicalAuthorizationsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/medicalAuthorizations/:id/cancel",
          "file": "medicalAuthorizationsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/medicalAuthorizations/stats/summary",
          "file": "medicalAuthorizationsRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 655,
      "lastModified": "2025-12-16T13:34:18.799Z",
      "complexity": "complex"
    },
    "medicalCase": {
      "name": "medicalCase",
      "generatedAt": "2026-01-08T00:24:59.200Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\medicalCaseRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "auth",
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/medicalCase/",
          "file": "medicalCaseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/medicalCase/employee/:employeeId",
          "file": "medicalCaseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/medicalCase/:caseId",
          "file": "medicalCaseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/medicalCase/doctor/pending",
          "file": "medicalCaseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/medicalCase/employee/:employeeId/medical-history",
          "file": "medicalCaseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/medicalCase/:caseId/messages",
          "file": "medicalCaseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/medicalCase/:caseId/messages",
          "file": "medicalCaseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/medicalCase/:caseId/diagnosis",
          "file": "medicalCaseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/medicalCase/:caseId/close",
          "file": "medicalCaseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/medicalCase/company/doctors",
          "file": "medicalCaseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/medicalCase/company/assign-doctor",
          "file": "medicalCaseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/medicalCase/employee/:employeeId/360",
          "file": "medicalCaseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/medicalCase/employee/:employeeId/fitness-status",
          "file": "medicalCaseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/medicalCase/employees/with-medical-records",
          "file": "medicalCaseRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 1758,
      "lastModified": "2026-01-04T02:13:03.239Z",
      "complexity": "complex"
    },
    "medicalDoctor": {
      "name": "medicalDoctor",
      "generatedAt": "2026-01-08T00:25:00.520Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\medicalDoctorRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/medicalDoctor/login",
          "file": "medicalDoctorRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/medicalDoctor/select-company",
          "file": "medicalDoctorRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/medicalDoctor/companies",
          "file": "medicalDoctorRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/medicalDoctor/dashboard",
          "file": "medicalDoctorRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/medicalDoctor/cases/pending",
          "file": "medicalDoctorRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/medicalDoctor/profile",
          "file": "medicalDoctorRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/medicalDoctor/verify-token",
          "file": "medicalDoctorRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 919,
      "lastModified": "2025-12-16T13:34:18.802Z",
      "complexity": "complex"
    },
    "medicalRecords": {
      "name": "medicalRecords",
      "generatedAt": "2026-01-08T00:25:01.585Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\medicalRecordsRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "auth",
          "MedicalImmutabilityService",
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/medicalRecords/",
          "file": "medicalRecordsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/medicalRecords/:id",
          "file": "medicalRecordsRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/medicalRecords/:id",
          "file": "medicalRecordsRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/medicalRecords/:id",
          "file": "medicalRecordsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/medicalRecords/:id/editability",
          "file": "medicalRecordsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/medicalRecords/:id/request-authorization",
          "file": "medicalRecordsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/medicalRecords/:id/audit-trail",
          "file": "medicalRecordsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/medicalRecords/:id/custody-chain",
          "file": "medicalRecordsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/medicalRecords/:id/lock",
          "file": "medicalRecordsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/medicalRecords/employee/:employeeId",
          "file": "medicalRecordsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/medicalRecords/expiring/list",
          "file": "medicalRecordsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/medicalRecords/stats/summary",
          "file": "medicalRecordsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/medicalRecords/verify-signature",
          "file": "medicalRecordsRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "medical_records",
          "model": "MedicalRecord",
          "file": "MedicalRecord.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 599,
      "lastModified": "2025-12-16T13:34:18.802Z",
      "complexity": "complex"
    },
    "medicalRoutes-basic": {
      "name": "medicalRoutes-basic",
      "generatedAt": "2026-01-08T00:25:02.808Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\medicalRoutes-basic.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/medicalRoutes-basic/test",
          "file": "medicalRoutes-basic.js"
        },
        {
          "method": "GET",
          "path": "/api/medicalRoutes-basic/status",
          "file": "medicalRoutes-basic.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 29,
      "lastModified": "2025-09-01T21:29:37.780Z",
      "complexity": "simple"
    },
    "medical": {
      "name": "medical",
      "generatedAt": "2026-01-08T00:25:04.065Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\auditor\\collectors\\MedicalDashboardModuleCollector.js",
          "src\\auditor\\collectors\\MedicalWorkflowCollector.js",
          "src\\models\\EmployeeMedicalRecord.js",
          "src\\models\\MedicalCertificate.js",
          "src\\models\\MedicalDiagnosis.js",
          "src\\models\\MedicalEditAuthorization.js",
          "src\\models\\MedicalExamTemplate.js",
          "src\\models\\MedicalHistory.js",
          "src\\models\\MedicalPhoto.js",
          "src\\models\\MedicalPrescription.js",
          "src\\models\\MedicalQuestionnaire.js",
          "src\\models\\MedicalRecord.js",
          "src\\models\\MedicalRecordAuditLog.js",
          "src\\models\\MedicalStatistics.js",
          "src\\models\\MedicalStudy.js",
          "src\\models\\MedicalStudyRequest.js",
          "src\\models\\UserMedicalAdvanced.js",
          "src\\models\\UserMedicalDocuments.js",
          "src\\models\\UserMedicalExams.js",
          "src\\routes\\medicalAdvancedRoutes.js",
          "src\\routes\\medicalAuthorizationsRoutes.js",
          "src\\routes\\medicalCaseRoutes.js",
          "src\\routes\\medicalDoctorRoutes.js",
          "src\\routes\\medicalRecordsRoutes.js",
          "src\\routes\\medicalRoutes-basic.js",
          "src\\routes\\medicalRoutes.js",
          "src\\routes\\medicalTemplatesRoutes.js",
          "src\\routes\\userMedicalExamsRoutes.js",
          "src\\routes\\userMedicalRoutes.js",
          "src\\services\\dms\\adapters\\MedicalDMSAdapter.js",
          "src\\services\\MedicalExamExpirationScheduler.js",
          "src\\services\\MedicalImmutabilityService.js",
          "src\\services\\medicalStatisticsService.js",
          "src\\workflows\\generated\\MedicalWorkflowGenerated.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "BaseModuleCollector"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/medical/certificates",
          "file": "medicalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/medical/certificates/my",
          "file": "medicalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/medical/certificates",
          "file": "medicalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/medical/certificates/:id/respond",
          "file": "medicalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/medical/prescriptions",
          "file": "medicalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/medical/prescriptions/my",
          "file": "medicalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/medical/questionnaires",
          "file": "medicalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/medical/questionnaires",
          "file": "medicalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/medical/diagnoses",
          "file": "medicalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/medical/upload",
          "file": "medicalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/medical/photos/request",
          "file": "medicalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/medical/photos/:id/upload",
          "file": "medicalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/medical/photos/my-requests",
          "file": "medicalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/medical/photos/:id/review",
          "file": "medicalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/medical/studies",
          "file": "medicalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/medical/studies/my",
          "file": "medicalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/medical/medical-record/:userId?",
          "file": "medicalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/medical/history/:userId/diagnosis/:diagnosisCode",
          "file": "medicalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/medical/history/:userId",
          "file": "medicalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/medical/request-document-auto",
          "file": "medicalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/medical/mark-request-completed",
          "file": "medicalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/medical/test-fehaciente-request",
          "file": "medicalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/medical/pending-requests",
          "file": "medicalRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "employee_medical_records",
          "model": "EmployeeMedicalRecord",
          "file": "EmployeeMedicalRecord.js"
        },
        {
          "table": "medical_certificates",
          "model": "MedicalCertificate",
          "file": "MedicalCertificate.js"
        },
        {
          "table": "medical_diagnoses",
          "model": "MedicalDiagnosis",
          "file": "MedicalDiagnosis.js"
        },
        {
          "table": "medical_edit_authorizations",
          "model": "MedicalEditAuthorization",
          "file": "MedicalEditAuthorization.js"
        },
        {
          "table": "medical_exam_templates",
          "model": "MedicalExamTemplate",
          "file": "MedicalExamTemplate.js"
        },
        {
          "table": "medical_history",
          "model": "MedicalHistory",
          "file": "MedicalHistory.js"
        },
        {
          "table": "medical_photos",
          "model": "MedicalPhoto",
          "file": "MedicalPhoto.js"
        },
        {
          "table": "medical_prescriptions",
          "model": "MedicalPrescription",
          "file": "MedicalPrescription.js"
        },
        {
          "table": "medical_questionnaires",
          "model": "MedicalQuestionnaire",
          "file": "MedicalQuestionnaire.js"
        },
        {
          "table": "medical_records",
          "model": "MedicalRecord",
          "file": "MedicalRecord.js"
        },
        {
          "table": "medical_record_audit_log",
          "model": "MedicalRecordAuditLog",
          "file": "MedicalRecordAuditLog.js"
        },
        {
          "table": "medical_statistics",
          "model": "MedicalStatistics",
          "file": "MedicalStatistics.js"
        },
        {
          "table": "medical_studies",
          "model": "MedicalStudy",
          "file": "MedicalStudy.js"
        },
        {
          "table": "medical_study_requests",
          "model": "MedicalStudyRequest",
          "file": "MedicalStudyRequest.js"
        },
        {
          "table": "user_anthropometric_data",
          "model": "UserMedicalAdvanced",
          "file": "UserMedicalAdvanced.js"
        },
        {
          "table": "user_medical_documents",
          "model": "UserMedicalDocuments",
          "file": "UserMedicalDocuments.js"
        },
        {
          "table": "user_medical_exams",
          "model": "UserMedicalExams",
          "file": "UserMedicalExams.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 16015,
      "lastModified": "2026-01-07T12:49:27.505Z",
      "complexity": "complex"
    },
    "medicalTemplates": {
      "name": "medicalTemplates",
      "generatedAt": "2026-01-08T00:25:05.598Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\medicalTemplatesRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "auth",
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/medicalTemplates/",
          "file": "medicalTemplatesRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/medicalTemplates/global",
          "file": "medicalTemplatesRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/medicalTemplates/type/:examType",
          "file": "medicalTemplatesRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/medicalTemplates/:id",
          "file": "medicalTemplatesRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/medicalTemplates/",
          "file": "medicalTemplatesRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/medicalTemplates/:id",
          "file": "medicalTemplatesRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/medicalTemplates/:id",
          "file": "medicalTemplatesRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/medicalTemplates/:id/clone",
          "file": "medicalTemplatesRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/medicalTemplates/:id/studies",
          "file": "medicalTemplatesRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 592,
      "lastModified": "2025-12-16T13:34:18.804Z",
      "complexity": "complex"
    },
    "message": {
      "name": "message",
      "generatedAt": "2026-01-08T00:25:06.941Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\models\\Message.js",
          "src\\models\\SupportTicketMessage.js",
          "src\\routes\\messageRoutes.js",
          "src\\routes\\supplierMessagesRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/message/",
          "file": "messageRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/message/:id",
          "file": "messageRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/message/",
          "file": "messageRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/message/:id/confirm-biometric",
          "file": "messageRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/message/:id/read",
          "file": "messageRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/message/read-all",
          "file": "messageRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/message/stats/unread-count",
          "file": "messageRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/message/:id",
          "file": "messageRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "messages",
          "model": "Message",
          "file": "Message.js"
        },
        {
          "table": "support_ticket_messages",
          "model": "SupportTicketMessage",
          "file": "SupportTicketMessage.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 977,
      "lastModified": "2026-01-06T14:33:41.970Z",
      "complexity": "complex"
    },
    "military-security-api": {
      "name": "military-security-api",
      "generatedAt": "2026-01-08T00:25:08.105Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\military-security-api.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "military-security-engine"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/military-security-api/biometric/secure-hash",
          "file": "military-security-api.js"
        },
        {
          "method": "POST",
          "path": "/api/military-security-api/mfa/generate",
          "file": "military-security-api.js"
        },
        {
          "method": "POST",
          "path": "/api/military-security-api/mfa/verify",
          "file": "military-security-api.js"
        },
        {
          "method": "GET",
          "path": "/api/military-security-api/threats/analyze",
          "file": "military-security-api.js"
        },
        {
          "method": "POST",
          "path": "/api/military-security-api/gdpr/request",
          "file": "military-security-api.js"
        },
        {
          "method": "POST",
          "path": "/api/military-security-api/encrypt",
          "file": "military-security-api.js"
        },
        {
          "method": "POST",
          "path": "/api/military-security-api/decrypt",
          "file": "military-security-api.js"
        },
        {
          "method": "GET",
          "path": "/api/military-security-api/metrics",
          "file": "military-security-api.js"
        },
        {
          "method": "GET",
          "path": "/api/military-security-api/health",
          "file": "military-security-api.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 479,
      "lastModified": "2025-09-26T14:17:29.410Z",
      "complexity": "moderate"
    },
    "mobile": {
      "name": "mobile",
      "generatedAt": "2026-01-08T00:25:09.287Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\brain\\registry\\MobileAppsRegistry.js",
          "src\\routes\\mobileRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/mobile/config/mobile-connection",
          "file": "mobileRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/mobile/health",
          "file": "mobileRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/mobile/auth/login",
          "file": "mobileRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/mobile/auth/logout",
          "file": "mobileRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/mobile/biometric/face/register",
          "file": "mobileRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/mobile/biometric/face/verify",
          "file": "mobileRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/mobile/biometric/fingerprint/register",
          "file": "mobileRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/mobile/biometric/fingerprint/verify",
          "file": "mobileRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/mobile/qr/generate",
          "file": "mobileRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/mobile/qr/verify",
          "file": "mobileRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/mobile/requests/permission",
          "file": "mobileRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/mobile/requests/my-requests",
          "file": "mobileRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/mobile/notifications",
          "file": "mobileRoutes.js"
        },
        {
          "method": "PATCH",
          "path": "/api/mobile/notifications/:id/read",
          "file": "mobileRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/mobile/dashboard/summary",
          "file": "mobileRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/mobile/medical/appointment",
          "file": "mobileRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/mobile/medical/certificate",
          "file": "mobileRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/mobile/training/assigned",
          "file": "mobileRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/mobile/training/:id/complete",
          "file": "mobileRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 1628,
      "lastModified": "2026-01-04T02:13:02.014Z",
      "complexity": "complex"
    },
    "modules": {
      "name": "modules",
      "generatedAt": "2026-01-08T00:25:10.295Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\auditor\\core\\ModuleScanner.js",
          "src\\routes\\debug-company-modules.js",
          "src\\routes\\modulesRoutes.js",
          "src\\routes\\modulesRoutes_SIMPLIFIED.js",
          "src\\seeds\\seedSystemModules.js",
          "src\\services\\moduleService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/modules/",
          "file": "modulesRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/modules/active",
          "file": "modulesRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/modules/:id",
          "file": "modulesRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/modules/",
          "file": "modulesRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/modules/:id",
          "file": "modulesRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/modules/validate",
          "file": "modulesRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/modules/analyze-impact",
          "file": "modulesRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/modules/available/:panel",
          "file": "modulesRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/modules/company/:company_id",
          "file": "modulesRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/modules/company/:company_id/activate",
          "file": "modulesRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/modules/company/:company_id/deactivate",
          "file": "modulesRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/modules/stats/general",
          "file": "modulesRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 2168,
      "lastModified": "2026-01-04T14:50:17.464Z",
      "complexity": "complex"
    },
    "modulesRoutes_SIMPLIFIED": {
      "name": "modulesRoutes_SIMPLIFIED",
      "generatedAt": "2026-01-08T00:25:11.417Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\modulesRoutes_SIMPLIFIED.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "database",
          "auth"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/modulesRoutes_SIMPLIFIED/active",
          "file": "modulesRoutes_SIMPLIFIED.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 127,
      "lastModified": "2026-01-04T02:13:03.239Z",
      "complexity": "simple"
    },
    "multipleART": {
      "name": "multipleART",
      "generatedAt": "2026-01-08T00:25:12.315Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\models\\MultipleARTConfiguration.js",
          "src\\routes\\multipleARTRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/multipleART/",
          "file": "multipleARTRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/multipleART/:id",
          "file": "multipleARTRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/multipleART/",
          "file": "multipleARTRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/multipleART/:id",
          "file": "multipleARTRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/multipleART/:id",
          "file": "multipleARTRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/multipleART/:id/test-notification",
          "file": "multipleARTRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/multipleART/test-all-notifications",
          "file": "multipleARTRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/multipleART/config/global",
          "file": "multipleARTRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "multiple_art_configurations",
          "model": "MultipleARTConfiguration",
          "file": "MultipleARTConfiguration.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 469,
      "lastModified": "2025-09-06T16:23:51.598Z",
      "complexity": "moderate"
    },
    "notificationAnalytics": {
      "name": "notificationAnalytics",
      "generatedAt": "2026-01-08T00:25:13.318Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\notificationAnalyticsRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/notificationAnalytics/overview",
          "file": "notificationAnalyticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/notificationAnalytics/by-channel",
          "file": "notificationAnalyticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/notificationAnalytics/by-module",
          "file": "notificationAnalyticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/notificationAnalytics/timeline",
          "file": "notificationAnalyticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/notificationAnalytics/sla-performance",
          "file": "notificationAnalyticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/notificationAnalytics/top-recipients",
          "file": "notificationAnalyticsRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "notifications",
          "model": "Notification",
          "file": "Notification.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 254,
      "lastModified": "2026-01-07T16:50:06.276Z",
      "complexity": "moderate"
    },
    "notificationCron": {
      "name": "notificationCron",
      "generatedAt": "2026-01-08T00:25:14.568Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\notificationCronRoutes.js",
          "src\\services\\NotificationCronService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/notificationCron/status",
          "file": "notificationCronRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/notificationCron/start",
          "file": "notificationCronRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/notificationCron/stop",
          "file": "notificationCronRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/notificationCron/run/:jobName",
          "file": "notificationCronRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "notifications",
          "model": "Notification",
          "file": "Notification.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 622,
      "lastModified": "2026-01-07T15:10:56.491Z",
      "complexity": "complex"
    },
    "notification": {
      "name": "notification",
      "generatedAt": "2026-01-08T00:25:16.079Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\auditor\\collectors\\NotificationModuleCollector.js",
          "src\\auditor\\collectors\\NotificationsCollector.js",
          "src\\config\\notificationTemplates-altaEmpresa.js",
          "src\\microservices\\notification-service.js",
          "src\\migrations\\create-notifications-v2-tables.js",
          "src\\models\\AccessNotification-postgresql.js",
          "src\\models\\Notification.js",
          "src\\models\\NotificationActionsLog.js",
          "src\\models\\NotificationTemplate.js",
          "src\\models\\NotificationWorkflow.js",
          "src\\models\\PartnerNotification.js",
          "src\\models\\UserNotificationPreference.js",
          "src\\routes\\notificationAnalyticsRoutes.js",
          "src\\routes\\notificationCronRoutes.js",
          "src\\routes\\notificationRoutes.js",
          "src\\routes\\notificationsEnterprise.js",
          "src\\routes\\notificationUnifiedRoutes.js",
          "src\\routes\\notificationWorkflowRoutes.js",
          "src\\services\\AltaEmpresaNotificationService.js",
          "src\\services\\AponntNotificationService.js",
          "src\\services\\DocumentExpirationNotificationService.js",
          "src\\services\\EppExpirationNotificationService.js",
          "src\\services\\NotificationCentralExchange.js",
          "src\\services\\NotificationChannelDispatcher.js",
          "src\\services\\NotificationCronService.js",
          "src\\services\\NotificationEnterpriseService.js",
          "src\\services\\NotificationExternalService.js",
          "src\\services\\NotificationOrchestrator.js",
          "src\\services\\NotificationRecipientResolver.js",
          "src\\services\\notificationService.js",
          "src\\services\\NotificationUnifiedService.js",
          "src\\services\\NotificationWebhookService.js",
          "src\\services\\NotificationWebSocketService.js",
          "src\\services\\NotificationWorkflowService.js",
          "src\\services\\OllamaNotificationAnalyzer.js",
          "src\\services\\PartnerNotificationService.js",
          "src\\services\\proactiveNotificationService.js",
          "src\\services\\SupportNotificationService.js",
          "src\\utils\\notificationSystem.js",
          "src\\workflows\\generated\\CommercialNotificationsWorkflow.js",
          "src\\workflows\\generated\\NotificationWorkflowGenerated.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/notification/",
          "file": "notificationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/notification/unread-count",
          "file": "notificationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/notification/groups",
          "file": "notificationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/notification/critical",
          "file": "notificationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/notification/:id",
          "file": "notificationRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/notification/:id/mark-read",
          "file": "notificationRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/notification/mark-all-read",
          "file": "notificationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/notification/:id/respond",
          "file": "notificationRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/notification/cleanup",
          "file": "notificationRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "access_notifications",
          "model": "AccessNotification-postgresql",
          "file": "AccessNotification-postgresql.js"
        },
        {
          "table": "notifications",
          "model": "Notification",
          "file": "Notification.js"
        },
        {
          "table": "notification_actions_log",
          "model": "NotificationActionsLog",
          "file": "NotificationActionsLog.js"
        },
        {
          "table": "notification_templates",
          "model": "NotificationTemplate",
          "file": "NotificationTemplate.js"
        },
        {
          "table": "notification_workflows",
          "model": "NotificationWorkflow",
          "file": "NotificationWorkflow.js"
        },
        {
          "table": "partner_notifications",
          "model": "PartnerNotification",
          "file": "PartnerNotification.js"
        },
        {
          "table": "user_notification_preferences",
          "model": "UserNotificationPreference",
          "file": "UserNotificationPreference.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 23415,
      "lastModified": "2026-01-08T00:04:57.854Z",
      "complexity": "complex"
    },
    "notificationsEnterprise": {
      "name": "notificationsEnterprise",
      "generatedAt": "2026-01-08T00:25:17.564Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\notificationsEnterprise.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "NotificationWorkflowService",
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/notificationsEnterprise/",
          "file": "notificationsEnterprise.js"
        },
        {
          "method": "GET",
          "path": "/api/notificationsEnterprise/pending",
          "file": "notificationsEnterprise.js"
        },
        {
          "method": "GET",
          "path": "/api/notificationsEnterprise/unread",
          "file": "notificationsEnterprise.js"
        },
        {
          "method": "GET",
          "path": "/api/notificationsEnterprise/stats",
          "file": "notificationsEnterprise.js"
        },
        {
          "method": "GET",
          "path": "/api/notificationsEnterprise/:id",
          "file": "notificationsEnterprise.js"
        },
        {
          "method": "POST",
          "path": "/api/notificationsEnterprise/",
          "file": "notificationsEnterprise.js"
        },
        {
          "method": "PUT",
          "path": "/api/notificationsEnterprise/:id/action",
          "file": "notificationsEnterprise.js"
        },
        {
          "method": "PUT",
          "path": "/api/notificationsEnterprise/:id/read",
          "file": "notificationsEnterprise.js"
        },
        {
          "method": "PUT",
          "path": "/api/notificationsEnterprise/read-all",
          "file": "notificationsEnterprise.js"
        },
        {
          "method": "GET",
          "path": "/api/notificationsEnterprise/:id/history",
          "file": "notificationsEnterprise.js"
        },
        {
          "method": "DELETE",
          "path": "/api/notificationsEnterprise/:id",
          "file": "notificationsEnterprise.js"
        },
        {
          "method": "GET",
          "path": "/api/notificationsEnterprise/workflows",
          "file": "notificationsEnterprise.js"
        },
        {
          "method": "GET",
          "path": "/api/notificationsEnterprise/workflows/:id",
          "file": "notificationsEnterprise.js"
        },
        {
          "method": "GET",
          "path": "/api/notificationsEnterprise/templates",
          "file": "notificationsEnterprise.js"
        },
        {
          "method": "GET",
          "path": "/api/notificationsEnterprise/preferences",
          "file": "notificationsEnterprise.js"
        },
        {
          "method": "PUT",
          "path": "/api/notificationsEnterprise/preferences/:module",
          "file": "notificationsEnterprise.js"
        }
      ],
      "databaseTables": [
        {
          "table": "notifications",
          "model": "Notification",
          "file": "Notification.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 641,
      "lastModified": "2025-12-16T13:34:18.810Z",
      "complexity": "complex"
    },
    "notificationUnified": {
      "name": "notificationUnified",
      "generatedAt": "2026-01-08T00:25:18.701Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\notificationUnifiedRoutes.js",
          "src\\services\\NotificationUnifiedService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "NotificationUnifiedService",
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/notificationUnified/threads",
          "file": "notificationUnifiedRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/notificationUnified/threads/:threadId/messages",
          "file": "notificationUnifiedRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/notificationUnified/threads",
          "file": "notificationUnifiedRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/notificationUnified/",
          "file": "notificationUnifiedRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/notificationUnified/stats",
          "file": "notificationUnifiedRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/notificationUnified/send",
          "file": "notificationUnifiedRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/notificationUnified/send-template",
          "file": "notificationUnifiedRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/notificationUnified/:id",
          "file": "notificationUnifiedRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/notificationUnified/:id/read",
          "file": "notificationUnifiedRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/notificationUnified/:id/action",
          "file": "notificationUnifiedRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/notificationUnified/:id",
          "file": "notificationUnifiedRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/notificationUnified/bulk/read",
          "file": "notificationUnifiedRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/notificationUnified/config/templates",
          "file": "notificationUnifiedRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/notificationUnified/config/workflows",
          "file": "notificationUnifiedRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/notificationUnified/aponnt/broadcast",
          "file": "notificationUnifiedRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/notificationUnified/support",
          "file": "notificationUnifiedRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/notificationUnified/:id/ai-feedback",
          "file": "notificationUnifiedRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/notificationUnified/ai/health",
          "file": "notificationUnifiedRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/notificationUnified/mobile/unread-count",
          "file": "notificationUnifiedRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/notificationUnified/mobile/recent",
          "file": "notificationUnifiedRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/notificationUnified/mobile/register-push",
          "file": "notificationUnifiedRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "notifications",
          "model": "Notification",
          "file": "Notification.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 1967,
      "lastModified": "2026-01-07T00:13:46.990Z",
      "complexity": "complex"
    },
    "notificationWorkflow": {
      "name": "notificationWorkflow",
      "generatedAt": "2026-01-08T00:25:19.969Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\models\\NotificationWorkflow.js",
          "src\\routes\\notificationWorkflowRoutes.js",
          "src\\services\\NotificationWorkflowService.js",
          "src\\workflows\\generated\\NotificationWorkflowGenerated.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/notificationWorkflow/workflows",
          "file": "notificationWorkflowRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/notificationWorkflow/workflows/stats",
          "file": "notificationWorkflowRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/notificationWorkflow/workflows/:id",
          "file": "notificationWorkflowRoutes.js"
        },
        {
          "method": "PATCH",
          "path": "/api/notificationWorkflow/workflows/:id",
          "file": "notificationWorkflowRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/notificationWorkflow/workflows",
          "file": "notificationWorkflowRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/notificationWorkflow/trigger",
          "file": "notificationWorkflowRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/notificationWorkflow/response/:logId",
          "file": "notificationWorkflowRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/notificationWorkflow/log",
          "file": "notificationWorkflowRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/notificationWorkflow/metrics/process/:processKey",
          "file": "notificationWorkflowRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/notificationWorkflow/metrics/channels",
          "file": "notificationWorkflowRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "notifications",
          "model": "Notification",
          "file": "Notification.js"
        },
        {
          "table": "notification_workflows",
          "model": "NotificationWorkflow",
          "file": "NotificationWorkflow.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 2321,
      "lastModified": "2026-01-08T00:04:57.854Z",
      "complexity": "complex"
    },
    "offlineSync": {
      "name": "offlineSync",
      "generatedAt": "2026-01-08T00:25:21.341Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\offlineSyncRoutes.js",
          "src\\services\\offlineSync.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "auth",
          "offlineSync"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/offlineSync/queue",
          "file": "offlineSyncRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/offlineSync/sync/:deviceId",
          "file": "offlineSyncRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/offlineSync/status/:deviceId",
          "file": "offlineSyncRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/offlineSync/cleanup/:deviceId",
          "file": "offlineSyncRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/offlineSync/batch",
          "file": "offlineSyncRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/offlineSync/heartbeat",
          "file": "offlineSyncRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 432,
      "lastModified": "2025-09-07T06:41:53.632Z",
      "complexity": "moderate"
    },
    "onboarding": {
      "name": "onboarding",
      "generatedAt": "2026-01-08T00:25:22.422Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\models\\ContractOnboarding.js",
          "src\\routes\\budgetOnboardingRoutes.js",
          "src\\routes\\commissionOnboardingRoutes.js",
          "src\\routes\\contractOnboardingRoutes.js",
          "src\\routes\\onboardingRoutes.js",
          "src\\services\\OnboardingService.js",
          "src\\workflows\\generated\\OnboardingWorkflowGenerated.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/onboarding/initiate",
          "file": "onboardingRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/onboarding/:trace_id/budget/respond",
          "file": "onboardingRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/onboarding/:trace_id/contract/generate",
          "file": "onboardingRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/onboarding/:trace_id/contract/sign",
          "file": "onboardingRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/onboarding/:trace_id/invoice/generate",
          "file": "onboardingRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/onboarding/:trace_id/invoice/confirm-payment",
          "file": "onboardingRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/onboarding/:trace_id/activate",
          "file": "onboardingRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/onboarding/:trace_id/commissions/liquidate",
          "file": "onboardingRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/onboarding/:trace_id/welcome",
          "file": "onboardingRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/onboarding/:trace_id/status",
          "file": "onboardingRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/onboarding/list",
          "file": "onboardingRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/onboarding/:trace_id/cancel",
          "file": "onboardingRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/onboarding/stats",
          "file": "onboardingRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "contracts",
          "model": "ContractOnboarding",
          "file": "ContractOnboarding.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 3868,
      "lastModified": "2026-01-04T02:13:03.315Z",
      "complexity": "complex"
    },
    "organizational": {
      "name": "organizational",
      "generatedAt": "2026-01-08T00:25:23.728Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\auditor\\collectors\\OrganizationalModuleCollector.js",
          "src\\models\\OrganizationalPosition.js",
          "src\\routes\\organizationalRoutes.js",
          "src\\services\\OrganizationalHierarchyService.js",
          "src\\services\\OrganizationalSSOTService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "BaseModuleCollector",
          "OrganizationalSSOTService"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/organizational/sectors",
          "file": "organizationalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/organizational/sectors",
          "file": "organizationalRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/organizational/sectors/:id",
          "file": "organizationalRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/organizational/sectors/:id",
          "file": "organizationalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/organizational/agreements",
          "file": "organizationalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/organizational/agreements",
          "file": "organizationalRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/organizational/agreements/:id",
          "file": "organizationalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/organizational/categories",
          "file": "organizationalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/organizational/categories",
          "file": "organizationalRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/organizational/categories/:id",
          "file": "organizationalRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/organizational/categories/:id",
          "file": "organizationalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/organizational/roles",
          "file": "organizationalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/organizational/roles",
          "file": "organizationalRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/organizational/roles/:id",
          "file": "organizationalRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/organizational/roles/:id",
          "file": "organizationalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/organizational/structure",
          "file": "organizationalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/organizational/countries",
          "file": "organizationalRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/organizational/employees/:userId/category",
          "file": "organizationalRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/organizational/employees/:userId/sector",
          "file": "organizationalRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/organizational/employees/:userId/roles",
          "file": "organizationalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/organizational/shifts/:shiftId/holidays",
          "file": "organizationalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/organizational/shifts/:shiftId/calendar",
          "file": "organizationalRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/organizational/shifts/:shiftId/custom-days",
          "file": "organizationalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/organizational/hierarchy/tree",
          "file": "organizationalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/organizational/hierarchy/flat",
          "file": "organizationalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/organizational/hierarchy/flowchart",
          "file": "organizationalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/organizational/hierarchy/stats",
          "file": "organizationalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/organizational/hierarchy/escalation/:userId",
          "file": "organizationalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/organizational/hierarchy/supervisor/:userId",
          "file": "organizationalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/organizational/hierarchy/subordinates/:userId",
          "file": "organizationalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/organizational/hierarchy/ancestors/:positionId",
          "file": "organizationalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/organizational/hierarchy/descendants/:positionId",
          "file": "organizationalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/organizational/hierarchy/can-approve",
          "file": "organizationalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/organizational/hierarchy/next-approver",
          "file": "organizationalRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/organizational/hierarchy/paths",
          "file": "organizationalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/organizational/positions",
          "file": "organizationalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/organizational/positions/:id",
          "file": "organizationalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/organizational/positions",
          "file": "organizationalRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/organizational/positions/:id",
          "file": "organizationalRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/organizational/positions/:id",
          "file": "organizationalRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/organizational/employees/:userId/position",
          "file": "organizationalRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/organizational/shifts/:shiftId/holiday-settings",
          "file": "organizationalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/organizational/holidays",
          "file": "organizationalRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "organizational_positions",
          "model": "OrganizationalPosition",
          "file": "OrganizationalPosition.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 4883,
      "lastModified": "2026-01-02T13:05:15.377Z",
      "complexity": "complex"
    },
    "partnerCommission": {
      "name": "partnerCommission",
      "generatedAt": "2026-01-08T00:25:24.891Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\models\\PartnerCommissionLog.js",
          "src\\routes\\partnerCommissionRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/partnerCommission/dashboard",
          "file": "partnerCommissionRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/partnerCommission/config",
          "file": "partnerCommissionRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/partnerCommission/config",
          "file": "partnerCommissionRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/partnerCommission/transactions",
          "file": "partnerCommissionRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/partnerCommission/transactions",
          "file": "partnerCommissionRoutes.js"
        },
        {
          "method": "PATCH",
          "path": "/api/partnerCommission/transactions/:id/status",
          "file": "partnerCommissionRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/partnerCommission/summaries",
          "file": "partnerCommissionRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/partnerCommission/my-commissions",
          "file": "partnerCommissionRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "commissions",
          "model": "Commission",
          "file": "Commission.js"
        },
        {
          "table": "partners",
          "model": "Partner",
          "file": "Partner.js"
        },
        {
          "table": "partner_commissions_log",
          "model": "PartnerCommissionLog",
          "file": "PartnerCommissionLog.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 653,
      "lastModified": "2025-12-16T13:34:18.815Z",
      "complexity": "complex"
    },
    "partner": {
      "name": "partner",
      "generatedAt": "2026-01-08T00:25:26.319Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\models\\Partner.js",
          "src\\models\\PartnerAvailability.js",
          "src\\models\\PartnerCommissionLog.js",
          "src\\models\\PartnerDocument.js",
          "src\\models\\PartnerLegalConsent.js",
          "src\\models\\PartnerMediationCase.js",
          "src\\models\\PartnerNotification.js",
          "src\\models\\PartnerReview.js",
          "src\\models\\PartnerRole.js",
          "src\\models\\PartnerServiceConversation.js",
          "src\\models\\PartnerServiceRequest.js",
          "src\\routes\\partnerCommissionRoutes.js",
          "src\\routes\\partnerRoutes.js",
          "src\\services\\PartnerNotificationService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/partner/register",
          "file": "partnerRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/partner/login",
          "file": "partnerRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/partner/",
          "file": "partnerRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/partner/:id",
          "file": "partnerRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/partner/:id",
          "file": "partnerRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/partner/:id/approve",
          "file": "partnerRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/partner/:id/reject",
          "file": "partnerRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/partner/:id/status",
          "file": "partnerRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/partner/:id/status-history",
          "file": "partnerRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/partner/:id/active-contracts",
          "file": "partnerRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/partner/service-requests",
          "file": "partnerRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/partner/reviews",
          "file": "partnerRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/partner/mediation",
          "file": "partnerRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/partner/:id/commissions",
          "file": "partnerRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "partners",
          "model": "Partner",
          "file": "Partner.js"
        },
        {
          "table": "partner_availability",
          "model": "PartnerAvailability",
          "file": "PartnerAvailability.js"
        },
        {
          "table": "partner_commissions_log",
          "model": "PartnerCommissionLog",
          "file": "PartnerCommissionLog.js"
        },
        {
          "table": "partner_documents",
          "model": "PartnerDocument",
          "file": "PartnerDocument.js"
        },
        {
          "table": "partner_legal_consents",
          "model": "PartnerLegalConsent",
          "file": "PartnerLegalConsent.js"
        },
        {
          "table": "partner_mediation_cases",
          "model": "PartnerMediationCase",
          "file": "PartnerMediationCase.js"
        },
        {
          "table": "partner_notifications",
          "model": "PartnerNotification",
          "file": "PartnerNotification.js"
        },
        {
          "table": "partner_reviews",
          "model": "PartnerReview",
          "file": "PartnerReview.js"
        },
        {
          "table": "partner_roles",
          "model": "PartnerRole",
          "file": "PartnerRole.js"
        },
        {
          "table": "partner_service_conversations",
          "model": "PartnerServiceConversation",
          "file": "PartnerServiceConversation.js"
        },
        {
          "table": "partner_service_requests",
          "model": "PartnerServiceRequest",
          "file": "PartnerServiceRequest.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 2989,
      "lastModified": "2026-01-07T01:57:39.618Z",
      "complexity": "complex"
    },
    "paymentOrder": {
      "name": "paymentOrder",
      "generatedAt": "2026-01-08T00:25:28.087Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\models\\FinancePaymentOrder.js",
          "src\\models\\FinancePaymentOrderItem.js",
          "src\\routes\\paymentOrderRoutes.js",
          "src\\services\\PaymentOrderService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/paymentOrder/pending-invoices",
          "file": "paymentOrderRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/paymentOrder/",
          "file": "paymentOrderRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/paymentOrder/",
          "file": "paymentOrderRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/paymentOrder/pending-approval",
          "file": "paymentOrderRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/paymentOrder/upcoming",
          "file": "paymentOrderRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/paymentOrder/stats",
          "file": "paymentOrderRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/paymentOrder/:id",
          "file": "paymentOrderRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/paymentOrder/:id/submit",
          "file": "paymentOrderRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/paymentOrder/:id/approve",
          "file": "paymentOrderRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/paymentOrder/:id/schedule",
          "file": "paymentOrderRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/paymentOrder/:id/execute",
          "file": "paymentOrderRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/paymentOrder/:id/cancel",
          "file": "paymentOrderRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/paymentOrder/:id/notify",
          "file": "paymentOrderRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/paymentOrder/forecast/refresh",
          "file": "paymentOrderRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/paymentOrder/forecast/summary",
          "file": "paymentOrderRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/paymentOrder/forecast/cube",
          "file": "paymentOrderRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/paymentOrder/forecast/drilldown",
          "file": "paymentOrderRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/paymentOrder/forecast/kpis",
          "file": "paymentOrderRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/paymentOrder/forecast/timeline",
          "file": "paymentOrderRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/paymentOrder/forecast/supplier-concentration",
          "file": "paymentOrderRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/paymentOrder/forecast/seasonality",
          "file": "paymentOrderRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/paymentOrder/forecast/yoy",
          "file": "paymentOrderRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/paymentOrder/checkbooks",
          "file": "paymentOrderRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/paymentOrder/checkbooks",
          "file": "paymentOrderRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/paymentOrder/checkbooks/available",
          "file": "paymentOrderRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/paymentOrder/checkbooks/stats",
          "file": "paymentOrderRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/paymentOrder/checkbooks/:id",
          "file": "paymentOrderRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/paymentOrder/checkbooks/:id/cancel",
          "file": "paymentOrderRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/paymentOrder/checks",
          "file": "paymentOrderRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/paymentOrder/checks",
          "file": "paymentOrderRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/paymentOrder/checks/portfolio",
          "file": "paymentOrderRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/paymentOrder/checks/portfolio/summary",
          "file": "paymentOrderRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/paymentOrder/checks/maturity",
          "file": "paymentOrderRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/paymentOrder/checks/bounced",
          "file": "paymentOrderRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/paymentOrder/checks/upcoming",
          "file": "paymentOrderRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/paymentOrder/checks/stats",
          "file": "paymentOrderRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/paymentOrder/checks/timeline",
          "file": "paymentOrderRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/paymentOrder/checks/by-beneficiary",
          "file": "paymentOrderRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/paymentOrder/checks/dashboard",
          "file": "paymentOrderRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/paymentOrder/checks/search",
          "file": "paymentOrderRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/paymentOrder/checks/:id",
          "file": "paymentOrderRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/paymentOrder/checks/:id/history",
          "file": "paymentOrderRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/paymentOrder/checks/:id/deliver",
          "file": "paymentOrderRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/paymentOrder/checks/:id/cash",
          "file": "paymentOrderRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/paymentOrder/checks/:id/bounce",
          "file": "paymentOrderRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/paymentOrder/checks/:id/void",
          "file": "paymentOrderRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/paymentOrder/checks/:id/cancel",
          "file": "paymentOrderRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/paymentOrder/checks/:id/replace",
          "file": "paymentOrderRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "finance_payment_orders",
          "model": "FinancePaymentOrder",
          "file": "FinancePaymentOrder.js"
        },
        {
          "table": "finance_payment_order_items",
          "model": "FinancePaymentOrderItem",
          "file": "FinancePaymentOrderItem.js"
        },
        {
          "table": "payments",
          "model": "Payment",
          "file": "Payment.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 2638,
      "lastModified": "2026-01-05T11:40:10.267Z",
      "complexity": "complex"
    },
    "payroll": {
      "name": "payroll",
      "generatedAt": "2026-01-08T00:25:29.645Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\auditor\\collectors\\PayrollModuleCollector.js",
          "src\\models\\PayrollConceptClassification.js",
          "src\\models\\PayrollConceptType.js",
          "src\\models\\PayrollCountry.js",
          "src\\models\\PayrollEntity.js",
          "src\\models\\PayrollEntityCategory.js",
          "src\\models\\PayrollEntitySettlement.js",
          "src\\models\\PayrollEntitySettlementDetail.js",
          "src\\models\\PayrollPayslipTemplate.js",
          "src\\models\\PayrollRun.js",
          "src\\models\\PayrollRunConceptDetail.js",
          "src\\models\\PayrollRunDetail.js",
          "src\\models\\PayrollTemplate.js",
          "src\\models\\PayrollTemplateConcept.js",
          "src\\models\\UserPayrollAssignment.js",
          "src\\models\\UserPayrollBonus.js",
          "src\\models\\UserPayrollConceptOverride.js",
          "src\\routes\\payrollRoutes.js",
          "src\\routes\\payrollTemplates.js",
          "src\\services\\dms\\adapters\\PayrollDMSAdapter.js",
          "src\\services\\PayrollCalculatorService.js",
          "src\\services\\PayrollExportService.js",
          "src\\workflows\\generated\\PayrollWorkflowGenerated.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "BaseModuleCollector",
          "PayrollCalculatorService"
        ],
        "optional": [
          "PayrollCalculatorService"
        ],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/payroll/countries",
          "file": "payrollRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/payroll/countries/:id",
          "file": "payrollRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/payroll/branches",
          "file": "payrollRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/payroll/branches",
          "file": "payrollRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/payroll/branches/:id",
          "file": "payrollRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/payroll/agreements",
          "file": "payrollRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/payroll/agreements",
          "file": "payrollRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/payroll/concept-types",
          "file": "payrollRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/payroll/concept-classifications",
          "file": "payrollRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/payroll/templates",
          "file": "payrollRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/payroll/templates/:id",
          "file": "payrollRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/payroll/templates",
          "file": "payrollRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/payroll/templates/:id",
          "file": "payrollRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/payroll/templates/:id/duplicate",
          "file": "payrollRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/payroll/templates/:templateId/concepts",
          "file": "payrollRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/payroll/concepts/:id",
          "file": "payrollRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/payroll/concepts/:id",
          "file": "payrollRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/payroll/assignments",
          "file": "payrollRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/payroll/assignments",
          "file": "payrollRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/payroll/assignments/:id",
          "file": "payrollRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/payroll/overrides",
          "file": "payrollRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/payroll/overrides",
          "file": "payrollRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/payroll/bonuses",
          "file": "payrollRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/payroll/bonuses",
          "file": "payrollRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/payroll/bonuses/:id",
          "file": "payrollRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/payroll/calculate/preview",
          "file": "payrollRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/payroll/calculate/single",
          "file": "payrollRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/payroll/calculate/bulk",
          "file": "payrollRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/payroll/runs/summary",
          "file": "payrollRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/payroll/runs/details",
          "file": "payrollRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/payroll/runs",
          "file": "payrollRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/payroll/runs/:id",
          "file": "payrollRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/payroll/runs/:id/approve",
          "file": "payrollRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/payroll/runs/:id/pay",
          "file": "payrollRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/payroll/runs/:runId/details/:userId",
          "file": "payrollRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/payroll/categories",
          "file": "payrollRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/payroll/categories",
          "file": "payrollRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/payroll/reports/summary",
          "file": "payrollRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/payroll/reports/by-concept",
          "file": "payrollRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/payroll/entity-categories",
          "file": "payrollRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/payroll/entity-categories/:id",
          "file": "payrollRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/payroll/entity-categories",
          "file": "payrollRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/payroll/entity-categories/:id",
          "file": "payrollRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/payroll/entity-categories/:id",
          "file": "payrollRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/payroll/entities",
          "file": "payrollRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/payroll/entities/:id",
          "file": "payrollRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/payroll/entities",
          "file": "payrollRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/payroll/entities/:id",
          "file": "payrollRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/payroll/entity-settlements/generate",
          "file": "payrollRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/payroll/entity-settlements",
          "file": "payrollRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/payroll/entity-settlements/:id",
          "file": "payrollRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/payroll/entity-settlements/:id/status",
          "file": "payrollRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/payroll/payslip-block-types",
          "file": "payrollRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/payroll/payslip-templates",
          "file": "payrollRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/payroll/payslip-templates/:id",
          "file": "payrollRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/payroll/payslip-templates",
          "file": "payrollRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/payroll/payslip-templates/:id",
          "file": "payrollRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/payroll/export/formats",
          "file": "payrollRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/payroll/export/formats/erp",
          "file": "payrollRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/payroll/export/payroll-run/:runId",
          "file": "payrollRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/payroll/export/entity-settlement/:settlementId",
          "file": "payrollRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/payroll/export/bank-transfer/:runId",
          "file": "payrollRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/payroll/export/accounting/:runId",
          "file": "payrollRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/payroll/payslip/generate",
          "file": "payrollRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/payroll/payslip/generate-pdf",
          "file": "payrollRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/payroll/payslip/preview-pdf",
          "file": "payrollRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/payroll/user/:userId/history",
          "file": "payrollRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/payroll/user/:userId/history/:detailId/concepts",
          "file": "payrollRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/payroll/user/:userId/position",
          "file": "payrollRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "payroll_concept_classifications",
          "model": "PayrollConceptClassification",
          "file": "PayrollConceptClassification.js"
        },
        {
          "table": "payroll_concept_types",
          "model": "PayrollConceptType",
          "file": "PayrollConceptType.js"
        },
        {
          "table": "payroll_countries",
          "model": "PayrollCountry",
          "file": "PayrollCountry.js"
        },
        {
          "table": "payroll_entities",
          "model": "PayrollEntity",
          "file": "PayrollEntity.js"
        },
        {
          "table": "payroll_entity_categories",
          "model": "PayrollEntityCategory",
          "file": "PayrollEntityCategory.js"
        },
        {
          "table": "payroll_entity_settlements",
          "model": "PayrollEntitySettlement",
          "file": "PayrollEntitySettlement.js"
        },
        {
          "table": "payroll_entity_settlement_details",
          "model": "PayrollEntitySettlementDetail",
          "file": "PayrollEntitySettlementDetail.js"
        },
        {
          "table": "payroll_payslip_templates",
          "model": "PayrollPayslipTemplate",
          "file": "PayrollPayslipTemplate.js"
        },
        {
          "table": "payroll_runs",
          "model": "PayrollRun",
          "file": "PayrollRun.js"
        },
        {
          "table": "payroll_run_concept_details",
          "model": "PayrollRunConceptDetail",
          "file": "PayrollRunConceptDetail.js"
        },
        {
          "table": "payroll_run_details",
          "model": "PayrollRunDetail",
          "file": "PayrollRunDetail.js"
        },
        {
          "table": "payroll_templates",
          "model": "PayrollTemplate",
          "file": "PayrollTemplate.js"
        },
        {
          "table": "payroll_template_concepts",
          "model": "PayrollTemplateConcept",
          "file": "PayrollTemplateConcept.js"
        },
        {
          "table": "user_payroll_assignment",
          "model": "UserPayrollAssignment",
          "file": "UserPayrollAssignment.js"
        },
        {
          "table": "user_payroll_bonuses",
          "model": "UserPayrollBonus",
          "file": "UserPayrollBonus.js"
        },
        {
          "table": "user_payroll_concept_overrides",
          "model": "UserPayrollConceptOverride",
          "file": "UserPayrollConceptOverride.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 10080,
      "lastModified": "2026-01-04T02:13:03.244Z",
      "complexity": "complex"
    },
    "payrollTemplates": {
      "name": "payrollTemplates",
      "generatedAt": "2026-01-08T00:25:31.250Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\payrollTemplates.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/payrollTemplates/",
          "file": "payrollTemplates.js"
        },
        {
          "method": "GET",
          "path": "/api/payrollTemplates/:id",
          "file": "payrollTemplates.js"
        },
        {
          "method": "POST",
          "path": "/api/payrollTemplates/",
          "file": "payrollTemplates.js"
        },
        {
          "method": "PUT",
          "path": "/api/payrollTemplates/:id",
          "file": "payrollTemplates.js"
        },
        {
          "method": "POST",
          "path": "/api/payrollTemplates/:id/apply-massive",
          "file": "payrollTemplates.js"
        },
        {
          "method": "GET",
          "path": "/api/payrollTemplates/employee/:employeeId",
          "file": "payrollTemplates.js"
        },
        {
          "method": "POST",
          "path": "/api/payrollTemplates/:id/items",
          "file": "payrollTemplates.js"
        },
        {
          "method": "PUT",
          "path": "/api/payrollTemplates/items/:itemId",
          "file": "payrollTemplates.js"
        },
        {
          "method": "DELETE",
          "path": "/api/payrollTemplates/items/:itemId",
          "file": "payrollTemplates.js"
        }
      ],
      "databaseTables": [
        {
          "table": "payroll_templates",
          "model": "PayrollTemplate",
          "file": "PayrollTemplate.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 659,
      "lastModified": "2025-09-07T17:39:58.393Z",
      "complexity": "complex"
    },
    "permissions": {
      "name": "permissions",
      "generatedAt": "2026-01-08T00:25:32.368Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\middleware\\permissions.js",
          "src\\routes\\permissionsRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/permissions/modules",
          "file": "permissionsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/permissions/modules/:moduleId/actions",
          "file": "permissionsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/permissions/users/:userId",
          "file": "permissionsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/permissions/users/:userId/grant",
          "file": "permissionsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/permissions/users/:userId/revoke",
          "file": "permissionsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/permissions/role-templates",
          "file": "permissionsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/permissions/users/:userId/apply-role-template",
          "file": "permissionsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/permissions/audit",
          "file": "permissionsRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "permissions",
          "model": "Permission",
          "file": "Permission.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 811,
      "lastModified": "2025-12-16T13:34:18.556Z",
      "complexity": "complex"
    },
    "phase4": {
      "name": "phase4",
      "generatedAt": "2026-01-08T00:25:33.499Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\auditor\\core\\Phase4TestOrchestrator.js",
          "src\\brain\\validators\\Phase4Validator.js",
          "src\\routes\\auditorPhase4Routes.js",
          "src\\routes\\phase4Routes.js",
          "src\\services\\BrainPhase4Integration.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "database",
          "OllamaAnalyzer",
          "TicketGenerator",
          "TechnicalReportGenerator",
          "SystemRegistry",
          "SchemaValidator",
          "logging",
          "FlutterIntegrationCollector",
          "StressTestCollector",
          "UIElementDiscoveryEngine",
          "IntelligentTestingOrchestrator",
          "OvertimeCalculatorService",
          "NotificationWorkflowService",
          "HourBankService",
          "BrainNervousSystem"
        ],
        "optional": [
          "HourBankService",
          "BrainNervousSystem"
        ],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/phase4/health",
          "file": "phase4Routes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 11148,
      "lastModified": "2026-01-04T14:50:17.433Z",
      "complexity": "complex"
    },
    "postgresql-partitioning": {
      "name": "postgresql-partitioning",
      "generatedAt": "2026-01-08T00:25:34.543Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\postgresql-partitioning.js",
          "src\\services\\postgresql-partitioning-service.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "postgresql-partitioning-service",
          "database"
        ],
        "optional": [
          "database"
        ],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/postgresql-partitioning/implement",
          "file": "postgresql-partitioning.js"
        },
        {
          "method": "GET",
          "path": "/api/postgresql-partitioning/stats",
          "file": "postgresql-partitioning.js"
        },
        {
          "method": "POST",
          "path": "/api/postgresql-partitioning/test-performance",
          "file": "postgresql-partitioning.js"
        },
        {
          "method": "GET",
          "path": "/api/postgresql-partitioning/health",
          "file": "postgresql-partitioning.js"
        },
        {
          "method": "GET",
          "path": "/api/postgresql-partitioning/performance/:companyId",
          "file": "postgresql-partitioning.js"
        },
        {
          "method": "POST",
          "path": "/api/postgresql-partitioning/cleanup",
          "file": "postgresql-partitioning.js"
        },
        {
          "method": "GET",
          "path": "/api/postgresql-partitioning/dashboard",
          "file": "postgresql-partitioning.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 683,
      "lastModified": "2025-12-16T13:34:19.036Z",
      "complexity": "complex"
    },
    "predictiveWorkforce": {
      "name": "predictiveWorkforce",
      "generatedAt": "2026-01-08T00:25:35.525Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\predictiveWorkforceRoutes.js",
          "src\\services\\PredictiveWorkforceService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "auth",
          "database",
          "PredictiveWorkforceService"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/predictiveWorkforce/:companyId/ira",
          "file": "predictiveWorkforceRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/predictiveWorkforce/:companyId/ira/:date",
          "file": "predictiveWorkforceRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/predictiveWorkforce/:companyId/ira-range",
          "file": "predictiveWorkforceRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/predictiveWorkforce/:companyId/sensitivity",
          "file": "predictiveWorkforceRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/predictiveWorkforce/:companyId/compare/:level",
          "file": "predictiveWorkforceRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/predictiveWorkforce/:companyId/forecast",
          "file": "predictiveWorkforceRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/predictiveWorkforce/:companyId/drill-down/:metric",
          "file": "predictiveWorkforceRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 2008,
      "lastModified": "2025-12-16T13:34:18.951Z",
      "complexity": "complex"
    },
    "pricing": {
      "name": "pricing",
      "generatedAt": "2026-01-08T00:25:36.582Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\companyPricingRoutes.js",
          "src\\routes\\pricingRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/pricing/pricing",
          "file": "pricingRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/pricing/pricing/calculate",
          "file": "pricingRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 635,
      "lastModified": "2025-09-18T02:15:21.306Z",
      "complexity": "complex"
    },
    "privacyRegulation": {
      "name": "privacyRegulation",
      "generatedAt": "2026-01-08T00:25:37.805Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\privacyRegulationRoutes.js",
          "src\\services\\PrivacyRegulationService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "PrivacyRegulationService",
          "auth"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/privacyRegulation/countries",
          "file": "privacyRegulationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/privacyRegulation/config/:countryCode",
          "file": "privacyRegulationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/privacyRegulation/company-config",
          "file": "privacyRegulationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/privacyRegulation/generate-consent",
          "file": "privacyRegulationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/privacyRegulation/validate-analysis/:type",
          "file": "privacyRegulationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/privacyRegulation/compliance-summary",
          "file": "privacyRegulationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/privacyRegulation/clear-cache",
          "file": "privacyRegulationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/privacyRegulation/employee/:employeeId/regulation",
          "file": "privacyRegulationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/privacyRegulation/my-regulation",
          "file": "privacyRegulationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/privacyRegulation/branches-by-country",
          "file": "privacyRegulationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/privacyRegulation/employees-by-regulation",
          "file": "privacyRegulationRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 1198,
      "lastModified": "2025-12-16T13:34:18.953Z",
      "complexity": "complex"
    },
    "proactive": {
      "name": "proactive",
      "generatedAt": "2026-01-08T00:25:39.485Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\proactive.js",
          "src\\services\\proactiveNotificationService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "proactiveNotificationService"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/proactive/dashboard",
          "file": "proactive.js"
        },
        {
          "method": "POST",
          "path": "/api/proactive/execute",
          "file": "proactive.js"
        },
        {
          "method": "GET",
          "path": "/api/proactive/rules",
          "file": "proactive.js"
        },
        {
          "method": "POST",
          "path": "/api/proactive/rules",
          "file": "proactive.js"
        },
        {
          "method": "PUT",
          "path": "/api/proactive/rules/:id",
          "file": "proactive.js"
        },
        {
          "method": "DELETE",
          "path": "/api/proactive/rules/:id",
          "file": "proactive.js"
        },
        {
          "method": "GET",
          "path": "/api/proactive/rules/:id/history",
          "file": "proactive.js"
        },
        {
          "method": "POST",
          "path": "/api/proactive/rules/:id/execute",
          "file": "proactive.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 1823,
      "lastModified": "2025-12-16T13:34:19.038Z",
      "complexity": "complex"
    },
    "procedures": {
      "name": "procedures",
      "generatedAt": "2026-01-08T00:25:40.580Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\auditor\\collectors\\ProceduresModuleCollector.js",
          "src\\routes\\proceduresRoutes.js",
          "src\\services\\ProceduresService.js",
          "src\\workflows\\generated\\ProceduresWorkflowGenerated.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "BaseModuleCollector"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/procedures/stats/dashboard",
          "file": "proceduresRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procedures/stats/compliance-report",
          "file": "proceduresRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procedures/generate-code",
          "file": "proceduresRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procedures/employee/my-procedures",
          "file": "proceduresRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procedures/employee/my-pending",
          "file": "proceduresRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procedures/employee/my-summary",
          "file": "proceduresRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procedures/employee/:userId/summary",
          "file": "proceduresRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procedures/scope/entities/:scopeType",
          "file": "proceduresRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/procedures/scope/preview",
          "file": "proceduresRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/procedures/cleanup-expired",
          "file": "proceduresRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procedures/hierarchy/tree",
          "file": "proceduresRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procedures/hierarchy/view",
          "file": "proceduresRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procedures/hierarchy/constants",
          "file": "proceduresRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procedures/hierarchy/parents/:documentType",
          "file": "proceduresRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/procedures/hierarchy/validate",
          "file": "proceduresRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procedures/",
          "file": "proceduresRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procedures/:id",
          "file": "proceduresRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/procedures/",
          "file": "proceduresRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/procedures/:id",
          "file": "proceduresRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/procedures/:id",
          "file": "proceduresRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/procedures/:id/roles",
          "file": "proceduresRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procedures/:id/target-users",
          "file": "proceduresRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/procedures/:id/submit-review",
          "file": "proceduresRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/procedures/:id/approve",
          "file": "proceduresRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/procedures/:id/publish",
          "file": "proceduresRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/procedures/:id/obsolete",
          "file": "proceduresRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/procedures/:id/new-version",
          "file": "proceduresRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procedures/:id/versions",
          "file": "proceduresRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/procedures/:id/acknowledge",
          "file": "proceduresRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procedures/:id/acknowledgements",
          "file": "proceduresRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/procedures/:id/send-reminders",
          "file": "proceduresRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procedures/:id/children",
          "file": "proceduresRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procedures/:id/ancestors",
          "file": "proceduresRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procedures/:id/can-delete",
          "file": "proceduresRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/procedures/:id/move",
          "file": "proceduresRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procedures/:id/scope-users",
          "file": "proceduresRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procedures/:id/lock-status",
          "file": "proceduresRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/procedures/:id/lock",
          "file": "proceduresRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/procedures/:id/unlock",
          "file": "proceduresRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procedures/:id/lock-history",
          "file": "proceduresRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "procedures",
          "model": "Procedure",
          "file": "Procedure.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 3617,
      "lastModified": "2026-01-02T13:05:15.381Z",
      "complexity": "complex"
    },
    "processChain": {
      "name": "processChain",
      "generatedAt": "2026-01-08T00:25:42.076Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\models\\ProcessChainAnalytics.js",
          "src\\routes\\processChainRoutes.js",
          "src\\services\\ProcessChainAnalyticsService.js",
          "src\\services\\ProcessChainGenerator.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/processChain/generate",
          "file": "processChainRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/processChain/available/:userId",
          "file": "processChainRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/processChain/validate",
          "file": "processChainRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/processChain/actions",
          "file": "processChainRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/processChain/analytics/track",
          "file": "processChainRoutes.js"
        },
        {
          "method": "PATCH",
          "path": "/api/processChain/analytics/:id/start",
          "file": "processChainRoutes.js"
        },
        {
          "method": "PATCH",
          "path": "/api/processChain/analytics/:id/complete",
          "file": "processChainRoutes.js"
        },
        {
          "method": "PATCH",
          "path": "/api/processChain/analytics/:id/abandon",
          "file": "processChainRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/processChain/analytics/:id/feedback",
          "file": "processChainRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/processChain/analytics/dashboard",
          "file": "processChainRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/processChain/analytics/top-actions",
          "file": "processChainRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/processChain/analytics/module-stats",
          "file": "processChainRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/processChain/analytics/bottlenecks",
          "file": "processChainRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/processChain/analytics/trends",
          "file": "processChainRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/processChain/health",
          "file": "processChainRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "process_chain_analytics",
          "model": "ProcessChainAnalytics",
          "file": "ProcessChainAnalytics.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 2019,
      "lastModified": "2026-01-04T02:13:03.245Z",
      "complexity": "complex"
    },
    "procurement": {
      "name": "procurement",
      "generatedAt": "2026-01-08T00:25:43.639Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\models\\ProcurementAccountingConfig.js",
          "src\\models\\ProcurementApprovalConfig.js",
          "src\\models\\ProcurementCategory.js",
          "src\\models\\ProcurementContract.js",
          "src\\models\\ProcurementContractItem.js",
          "src\\models\\ProcurementExchangeRate.js",
          "src\\models\\ProcurementInternalReceipt.js",
          "src\\models\\ProcurementInternalReceiptItem.js",
          "src\\models\\ProcurementInvoice.js",
          "src\\models\\ProcurementItem.js",
          "src\\models\\ProcurementOrder.js",
          "src\\models\\ProcurementOrderItem.js",
          "src\\models\\ProcurementPayment.js",
          "src\\models\\ProcurementReceipt.js",
          "src\\models\\ProcurementReceiptItem.js",
          "src\\models\\ProcurementRequisition.js",
          "src\\models\\ProcurementRequisitionItem.js",
          "src\\models\\ProcurementRfq.js",
          "src\\models\\ProcurementRfqItem.js",
          "src\\models\\ProcurementRfqQuote.js",
          "src\\models\\ProcurementRfqSupplier.js",
          "src\\models\\ProcurementSector.js",
          "src\\models\\ProcurementSupplier.js",
          "src\\models\\ProcurementSupplierItemMapping.js",
          "src\\routes\\procurementRoutes.js",
          "src\\services\\ProcurementService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/procurement/dashboard",
          "file": "procurementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procurement/dashboard/pending",
          "file": "procurementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/procurement/requisitions",
          "file": "procurementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procurement/requisitions",
          "file": "procurementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procurement/requisitions/:id",
          "file": "procurementRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/procurement/requisitions/:id",
          "file": "procurementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/procurement/requisitions/:id/submit",
          "file": "procurementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/procurement/requisitions/:id/approve",
          "file": "procurementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/procurement/requisitions/:id/reject",
          "file": "procurementRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/procurement/requisitions/:id",
          "file": "procurementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/procurement/rfqs",
          "file": "procurementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procurement/rfqs",
          "file": "procurementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procurement/rfqs/:id",
          "file": "procurementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/procurement/rfqs/:id/publish",
          "file": "procurementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/procurement/rfqs/:id/invite",
          "file": "procurementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/procurement/rfqs/:id/close",
          "file": "procurementRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/procurement/rfqs/:id",
          "file": "procurementRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/procurement/rfqs/:id",
          "file": "procurementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/procurement/rfqs/:id/evaluate",
          "file": "procurementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procurement/rfqs/:id/comparison-report",
          "file": "procurementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/procurement/quotations/compare",
          "file": "procurementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/procurement/orders",
          "file": "procurementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procurement/orders",
          "file": "procurementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procurement/orders/:id",
          "file": "procurementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/procurement/orders/:id/approve",
          "file": "procurementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/procurement/orders/:id/send",
          "file": "procurementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/procurement/orders/:id/cancel",
          "file": "procurementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/procurement/receipts",
          "file": "procurementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procurement/receipts",
          "file": "procurementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procurement/receipts/:id",
          "file": "procurementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/procurement/receipts/:id/confirm",
          "file": "procurementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/procurement/receipts/:id/quality",
          "file": "procurementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/procurement/internal-receipts",
          "file": "procurementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procurement/internal-receipts",
          "file": "procurementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/procurement/invoices",
          "file": "procurementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procurement/invoices",
          "file": "procurementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procurement/invoices/:id",
          "file": "procurementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procurement/invoices/:id/three-way-match",
          "file": "procurementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/procurement/invoices/:id/verify",
          "file": "procurementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/procurement/invoices/:id/dispute",
          "file": "procurementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procurement/invoices/pending-payment",
          "file": "procurementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/procurement/suppliers",
          "file": "procurementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procurement/suppliers",
          "file": "procurementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procurement/suppliers/:id",
          "file": "procurementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procurement/suppliers/:id/pending-claims",
          "file": "procurementRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/procurement/suppliers/:id",
          "file": "procurementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/procurement/suppliers/:id/enable-portal",
          "file": "procurementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/procurement/suppliers/:id/disable-portal",
          "file": "procurementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/procurement/suppliers/:id/reset-portal-password",
          "file": "procurementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procurement/suppliers/:id/history",
          "file": "procurementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procurement/suppliers/suggested",
          "file": "procurementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/procurement/item-mappings",
          "file": "procurementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procurement/item-mappings",
          "file": "procurementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/procurement/item-mappings/resolve",
          "file": "procurementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/procurement/item-mappings/bulk-import",
          "file": "procurementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procurement/item-mappings/stats",
          "file": "procurementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procurement/item-mappings/unmapped/:supplierId",
          "file": "procurementRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/procurement/item-mappings/:id",
          "file": "procurementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procurement/categories",
          "file": "procurementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/procurement/categories",
          "file": "procurementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procurement/sectors",
          "file": "procurementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/procurement/sectors",
          "file": "procurementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procurement/approval-config",
          "file": "procurementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/procurement/approval-config",
          "file": "procurementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procurement/accounting-config",
          "file": "procurementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/procurement/accounting-config",
          "file": "procurementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procurement/finance/cost-centers",
          "file": "procurementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procurement/finance/accounts",
          "file": "procurementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procurement/warehouse/list",
          "file": "procurementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procurement/warehouse/products",
          "file": "procurementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procurement/reports/by-supplier",
          "file": "procurementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procurement/reports/by-category",
          "file": "procurementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/procurement/reports/pending-deliveries",
          "file": "procurementRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "procurement_accounting_config",
          "model": "ProcurementAccountingConfig",
          "file": "ProcurementAccountingConfig.js"
        },
        {
          "table": "procurement_approval_config",
          "model": "ProcurementApprovalConfig",
          "file": "ProcurementApprovalConfig.js"
        },
        {
          "table": "procurement_categories",
          "model": "ProcurementCategory",
          "file": "ProcurementCategory.js"
        },
        {
          "table": "procurement_contracts",
          "model": "ProcurementContract",
          "file": "ProcurementContract.js"
        },
        {
          "table": "procurement_contract_items",
          "model": "ProcurementContractItem",
          "file": "ProcurementContractItem.js"
        },
        {
          "table": "procurement_exchange_rates",
          "model": "ProcurementExchangeRate",
          "file": "ProcurementExchangeRate.js"
        },
        {
          "table": "procurement_internal_receipts",
          "model": "ProcurementInternalReceipt",
          "file": "ProcurementInternalReceipt.js"
        },
        {
          "table": "procurement_internal_receipt_items",
          "model": "ProcurementInternalReceiptItem",
          "file": "ProcurementInternalReceiptItem.js"
        },
        {
          "table": "procurement_invoices",
          "model": "ProcurementInvoice",
          "file": "ProcurementInvoice.js"
        },
        {
          "table": "procurement_items",
          "model": "ProcurementItem",
          "file": "ProcurementItem.js"
        },
        {
          "table": "procurement_orders",
          "model": "ProcurementOrder",
          "file": "ProcurementOrder.js"
        },
        {
          "table": "procurement_order_items",
          "model": "ProcurementOrderItem",
          "file": "ProcurementOrderItem.js"
        },
        {
          "table": "procurement_payments",
          "model": "ProcurementPayment",
          "file": "ProcurementPayment.js"
        },
        {
          "table": "procurement_receipts",
          "model": "ProcurementReceipt",
          "file": "ProcurementReceipt.js"
        },
        {
          "table": "procurement_receipt_items",
          "model": "ProcurementReceiptItem",
          "file": "ProcurementReceiptItem.js"
        },
        {
          "table": "procurement_requisitions",
          "model": "ProcurementRequisition",
          "file": "ProcurementRequisition.js"
        },
        {
          "table": "procurement_requisition_items",
          "model": "ProcurementRequisitionItem",
          "file": "ProcurementRequisitionItem.js"
        },
        {
          "table": "procurement_rfqs",
          "model": "ProcurementRfq",
          "file": "ProcurementRfq.js"
        },
        {
          "table": "procurement_rfq_items",
          "model": "ProcurementRfqItem",
          "file": "ProcurementRfqItem.js"
        },
        {
          "table": "procurement_rfq_quotes",
          "model": "ProcurementRfqQuote",
          "file": "ProcurementRfqQuote.js"
        },
        {
          "table": "procurement_rfq_suppliers",
          "model": "ProcurementRfqSupplier",
          "file": "ProcurementRfqSupplier.js"
        },
        {
          "table": "procurement_sectors",
          "model": "ProcurementSector",
          "file": "ProcurementSector.js"
        },
        {
          "table": "wms_suppliers",
          "model": "ProcurementSupplier",
          "file": "ProcurementSupplier.js"
        },
        {
          "table": "procurement_supplier_item_mappings",
          "model": "ProcurementSupplierItemMapping",
          "file": "ProcurementSupplierItemMapping.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 9145,
      "lastModified": "2026-01-05T11:40:10.259Z",
      "complexity": "complex"
    },
    "quotes": {
      "name": "quotes",
      "generatedAt": "2026-01-08T00:25:47.093Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\quotesRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "QuoteManagementService",
          "auth"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/quotes/company/:companyId",
          "file": "quotesRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/quotes/company/:companyId/active",
          "file": "quotesRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/quotes/",
          "file": "quotesRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/quotes/:id/send",
          "file": "quotesRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/quotes/:id/accept",
          "file": "quotesRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/quotes/:id/reject",
          "file": "quotesRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/quotes/:id/activate",
          "file": "quotesRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/quotes/seller/:sellerId/stats",
          "file": "quotesRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "quotes",
          "model": "Quote",
          "file": "Quote.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 229,
      "lastModified": "2025-12-16T13:34:18.824Z",
      "complexity": "moderate"
    },
    "report": {
      "name": "report",
      "generatedAt": "2026-01-08T00:25:48.716Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\auditor\\collectors\\ReportsModuleCollector.js",
          "src\\auditor\\reporters\\AuditReportGenerator.js",
          "src\\auditor\\reporters\\MarketingDynamicReporter.js",
          "src\\auditor\\reporters\\OllamaTicketReporter.js",
          "src\\auditor\\reporters\\TechnicalArchitectureReporter.js",
          "src\\auditor\\reporters\\TechnicalReportGenerator.js",
          "src\\routes\\auditReports.js",
          "src\\routes\\financeReportsRoutes.js",
          "src\\routes\\reportRoutes.js",
          "src\\services\\auditReportService.js",
          "src\\services\\FinanceReportingService.js",
          "src\\services\\RiskReportService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "BaseModuleCollector"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/report/attendance",
          "file": "reportRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/report/users-summary",
          "file": "reportRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/report/daily-summary",
          "file": "reportRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 6687,
      "lastModified": "2026-01-04T02:13:03.279Z",
      "complexity": "complex"
    },
    "resourceCenter": {
      "name": "resourceCenter",
      "generatedAt": "2026-01-08T00:25:49.844Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\resourceCenter.js",
          "src\\services\\resourceCenterService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "resourceCenterService"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/resourceCenter/dashboard",
          "file": "resourceCenter.js"
        },
        {
          "method": "GET",
          "path": "/api/resourceCenter/summary",
          "file": "resourceCenter.js"
        },
        {
          "method": "GET",
          "path": "/api/resourceCenter/departments",
          "file": "resourceCenter.js"
        },
        {
          "method": "GET",
          "path": "/api/resourceCenter/employees",
          "file": "resourceCenter.js"
        },
        {
          "method": "GET",
          "path": "/api/resourceCenter/employee/:employee_id",
          "file": "resourceCenter.js"
        },
        {
          "method": "GET",
          "path": "/api/resourceCenter/my-stats",
          "file": "resourceCenter.js"
        },
        {
          "method": "GET",
          "path": "/api/resourceCenter/overload-alerts",
          "file": "resourceCenter.js"
        },
        {
          "method": "GET",
          "path": "/api/resourceCenter/budget-alerts",
          "file": "resourceCenter.js"
        },
        {
          "method": "POST",
          "path": "/api/resourceCenter/record",
          "file": "resourceCenter.js"
        },
        {
          "method": "GET",
          "path": "/api/resourceCenter/comparison",
          "file": "resourceCenter.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 985,
      "lastModified": "2025-12-16T13:34:19.039Z",
      "complexity": "complex"
    },
    "retailAnalytics": {
      "name": "retailAnalytics",
      "generatedAt": "2026-01-08T00:25:50.960Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\retailAnalyticsRoutes.js",
          "src\\services\\RetailAnalyticsService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "auth",
          "RetailAnalyticsService",
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/retailAnalytics/dashboard",
          "file": "retailAnalyticsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/retailAnalytics/sync-transactions",
          "file": "retailAnalyticsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/retailAnalytics/basket-analysis/run",
          "file": "retailAnalyticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/retailAnalytics/basket-analysis/rules",
          "file": "retailAnalyticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/retailAnalytics/basket-analysis/product/:productId",
          "file": "retailAnalyticsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/retailAnalytics/forecast/generate",
          "file": "retailAnalyticsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/retailAnalytics/forecast/bulk",
          "file": "retailAnalyticsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/retailAnalytics/rfm/calculate",
          "file": "retailAnalyticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/retailAnalytics/rfm/segments",
          "file": "retailAnalyticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/retailAnalytics/rfm/customers/:segment",
          "file": "retailAnalyticsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/retailAnalytics/abc-xyz/calculate",
          "file": "retailAnalyticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/retailAnalytics/abc-xyz/products",
          "file": "retailAnalyticsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/retailAnalytics/reorder/generate",
          "file": "retailAnalyticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/retailAnalytics/reorder/suggestions",
          "file": "retailAnalyticsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/retailAnalytics/reorder/approve",
          "file": "retailAnalyticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/retailAnalytics/centralized/pending",
          "file": "retailAnalyticsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/retailAnalytics/centralized/consolidate",
          "file": "retailAnalyticsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/retailAnalytics/centralized/distribute",
          "file": "retailAnalyticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/retailAnalytics/centralized/network-stock",
          "file": "retailAnalyticsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/retailAnalytics/config",
          "file": "retailAnalyticsRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/retailAnalytics/config",
          "file": "retailAnalyticsRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 1933,
      "lastModified": "2026-01-04T02:13:03.285Z",
      "complexity": "complex"
    },
    "riskIntelligence": {
      "name": "riskIntelligence",
      "generatedAt": "2026-01-08T00:25:52.089Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\auditor\\collectors\\RiskIntelligenceModuleCollector.js",
          "src\\routes\\riskIntelligenceRoutes.js",
          "src\\services\\RiskIntelligenceService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "BaseModuleCollector"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/riskIntelligence/risk-dashboard",
          "file": "riskIntelligenceRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/riskIntelligence/employee/:id/risk-analysis",
          "file": "riskIntelligenceRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/riskIntelligence/violations",
          "file": "riskIntelligenceRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/riskIntelligence/violations/:id/resolve",
          "file": "riskIntelligenceRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/riskIntelligence/indices-config",
          "file": "riskIntelligenceRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/riskIntelligence/indices-config/:id",
          "file": "riskIntelligenceRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/riskIntelligence/departments",
          "file": "riskIntelligenceRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/riskIntelligence/analyze/:id",
          "file": "riskIntelligenceRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/riskIntelligence/analyze-all",
          "file": "riskIntelligenceRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/riskIntelligence/trends",
          "file": "riskIntelligenceRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/riskIntelligence/export/dashboard/pdf",
          "file": "riskIntelligenceRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/riskIntelligence/export/dashboard/excel",
          "file": "riskIntelligenceRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/riskIntelligence/export/employee/:id/pdf",
          "file": "riskIntelligenceRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/riskIntelligence/export/violations/pdf",
          "file": "riskIntelligenceRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/riskIntelligence/export/violations/excel",
          "file": "riskIntelligenceRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/riskIntelligence/risk-config",
          "file": "riskIntelligenceRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/riskIntelligence/risk-config",
          "file": "riskIntelligenceRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/riskIntelligence/risk-config/method",
          "file": "riskIntelligenceRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/riskIntelligence/risk-config/segmentation",
          "file": "riskIntelligenceRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/riskIntelligence/risk-config/recalculate",
          "file": "riskIntelligenceRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/riskIntelligence/segmented-analysis",
          "file": "riskIntelligenceRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/riskIntelligence/benchmark-comparison",
          "file": "riskIntelligenceRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/riskIntelligence/employee/:id/thresholds",
          "file": "riskIntelligenceRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/riskIntelligence/rbac-stats",
          "file": "riskIntelligenceRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 2258,
      "lastModified": "2026-01-02T13:05:15.382Z",
      "complexity": "complex"
    },
    "salaryAdvanced": {
      "name": "salaryAdvanced",
      "generatedAt": "2026-01-08T00:25:53.070Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\models\\UserSalaryAdvanced.js",
          "src\\routes\\salaryAdvancedRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/salaryAdvanced/labor-agreements",
          "file": "salaryAdvancedRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/salaryAdvanced/labor-agreements/:id/categories",
          "file": "salaryAdvancedRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/salaryAdvanced/categories",
          "file": "salaryAdvancedRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/salaryAdvanced/config/:userId",
          "file": "salaryAdvancedRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/salaryAdvanced/config/:userId/current",
          "file": "salaryAdvancedRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/salaryAdvanced/config",
          "file": "salaryAdvancedRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/salaryAdvanced/config/:id",
          "file": "salaryAdvancedRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/salaryAdvanced/config/:userId/update-salary",
          "file": "salaryAdvancedRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/salaryAdvanced/payroll/:userId",
          "file": "salaryAdvancedRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/salaryAdvanced/payroll/:userId/:year/:month",
          "file": "salaryAdvancedRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/salaryAdvanced/payroll",
          "file": "salaryAdvancedRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/salaryAdvanced/payroll/:id",
          "file": "salaryAdvancedRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/salaryAdvanced/payroll/:id/approve",
          "file": "salaryAdvancedRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/salaryAdvanced/payroll/:id/pay",
          "file": "salaryAdvancedRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/salaryAdvanced/summary/:userId",
          "file": "salaryAdvancedRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "labor_agreements_catalog",
          "model": "UserSalaryAdvanced",
          "file": "UserSalaryAdvanced.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 815,
      "lastModified": "2026-01-04T02:13:03.247Z",
      "complexity": "complex"
    },
    "salesOrchestration": {
      "name": "salesOrchestration",
      "generatedAt": "2026-01-08T00:25:54.007Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\salesOrchestrationRoutes.js",
          "src\\services\\salesOrchestrationService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "SalesOrchestrationService",
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/salesOrchestration/meetings",
          "file": "salesOrchestrationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/salesOrchestration/meetings/:id",
          "file": "salesOrchestrationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/salesOrchestration/meetings",
          "file": "salesOrchestrationRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/salesOrchestration/meetings/:id",
          "file": "salesOrchestrationRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/salesOrchestration/meetings/:id",
          "file": "salesOrchestrationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/salesOrchestration/meetings/:id/confirm",
          "file": "salesOrchestrationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/salesOrchestration/meetings/:id/resend-survey",
          "file": "salesOrchestrationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/salesOrchestration/meetings/:id/send-demo-access",
          "file": "salesOrchestrationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/salesOrchestration/meetings/:id/start",
          "file": "salesOrchestrationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/salesOrchestration/meetings/:id/end",
          "file": "salesOrchestrationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/salesOrchestration/meetings/:id/feedback",
          "file": "salesOrchestrationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/salesOrchestration/meetings/:id/reschedule",
          "file": "salesOrchestrationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/salesOrchestration/meetings/:id/generate-pitch",
          "file": "salesOrchestrationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/salesOrchestration/meetings/:id/send-pitch",
          "file": "salesOrchestrationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/salesOrchestration/meetings/:id/pitch",
          "file": "salesOrchestrationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/salesOrchestration/meetings/:id/attendees",
          "file": "salesOrchestrationRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/salesOrchestration/attendees/:id",
          "file": "salesOrchestrationRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/salesOrchestration/attendees/:id",
          "file": "salesOrchestrationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/salesOrchestration/survey/:token",
          "file": "salesOrchestrationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/salesOrchestration/survey/:token",
          "file": "salesOrchestrationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/salesOrchestration/satisfaction/:token",
          "file": "salesOrchestrationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/salesOrchestration/satisfaction/:token",
          "file": "salesOrchestrationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/salesOrchestration/modules",
          "file": "salesOrchestrationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/salesOrchestration/vendors",
          "file": "salesOrchestrationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/salesOrchestration/stats",
          "file": "salesOrchestrationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/salesOrchestration/meetings/:id/cancel",
          "file": "salesOrchestrationRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/salesOrchestration/meetings/:id",
          "file": "salesOrchestrationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/salesOrchestration/meetings/:id/mark-quoted",
          "file": "salesOrchestrationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/salesOrchestration/meetings/:id/approve-pitch",
          "file": "salesOrchestrationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/salesOrchestration/meetings/:id/reject-pitch",
          "file": "salesOrchestrationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/salesOrchestration/meetings/:id/attendee-pitches",
          "file": "salesOrchestrationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/salesOrchestration/meetings/:id/survey-responses",
          "file": "salesOrchestrationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/salesOrchestration/flyers/ask-your-ai",
          "file": "salesOrchestrationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/salesOrchestration/flyers/promo",
          "file": "salesOrchestrationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/salesOrchestration/flyers/send-ask-your-ai",
          "file": "salesOrchestrationRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 4403,
      "lastModified": "2026-01-07T11:13:21.750Z",
      "complexity": "complex"
    },
    "sanction": {
      "name": "sanction",
      "generatedAt": "2026-01-08T00:25:55.007Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\auditor\\collectors\\SanctionsModuleCollector.js",
          "src\\models\\Sanction-postgresql.js",
          "src\\routes\\sanctionRoutes.js",
          "src\\services\\dms\\adapters\\SanctionDMSAdapter.js",
          "src\\services\\SanctionWorkflowService.js",
          "src\\workflows\\generated\\SanctionsWorkflowGenerated.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "BaseModuleCollector",
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/sanction/",
          "file": "sanctionRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/sanction/stats",
          "file": "sanctionRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/sanction/pending-review",
          "file": "sanctionRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/sanction/types",
          "file": "sanctionRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/sanction/blocks",
          "file": "sanctionRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/sanction/:id",
          "file": "sanctionRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/sanction/",
          "file": "sanctionRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/sanction/:id",
          "file": "sanctionRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/sanction/:id",
          "file": "sanctionRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/sanction/types",
          "file": "sanctionRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/sanction/types",
          "file": "sanctionRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/sanction/request",
          "file": "sanctionRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/sanction/:id/submit",
          "file": "sanctionRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/sanction/:id/lawyer-approve",
          "file": "sanctionRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/sanction/:id/lawyer-reject",
          "file": "sanctionRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/sanction/:id/lawyer-modify",
          "file": "sanctionRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/sanction/:id/hr-confirm",
          "file": "sanctionRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/sanction/:id/appeal",
          "file": "sanctionRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/sanction/:id/resolve-appeal",
          "file": "sanctionRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/sanction/:id/history",
          "file": "sanctionRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/sanction/:id/detail",
          "file": "sanctionRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/sanction/employee/:userId/disciplinary-history",
          "file": "sanctionRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/sanction/blocks/check/:employeeId",
          "file": "sanctionRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/sanction/blocks/employee/:employeeId",
          "file": "sanctionRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/sanction/blocks/:id/deactivate",
          "file": "sanctionRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "sanctions",
          "model": "Sanction-postgresql",
          "file": "Sanction-postgresql.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 3670,
      "lastModified": "2026-01-02T13:05:15.382Z",
      "complexity": "complex"
    },
    "seedDemo": {
      "name": "seedDemo",
      "generatedAt": "2026-01-08T00:25:56.319Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\seedDemoRoute.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [],
      "databaseTables": [],
      "progress": 25,
      "uxTestResults": null,
      "linesOfCode": 1892,
      "lastModified": "2026-01-06T02:24:42.495Z",
      "complexity": "complex"
    },
    "shift-calendar-": {
      "name": "shift-calendar-",
      "generatedAt": "2026-01-08T00:25:57.400Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\shift-calendar-routes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "auth",
          "ShiftCalculatorService",
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/shift-calendar-/:id/calendar",
          "file": "shift-calendar-Routes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 444,
      "lastModified": "2025-12-16T13:34:18.831Z",
      "complexity": "moderate"
    },
    "shift": {
      "name": "shift",
      "generatedAt": "2026-01-08T00:25:58.395Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\auditor\\collectors\\ShiftsModuleCollector.js",
          "src\\models\\Shift-postgresql.js",
          "src\\models\\UserShiftAssignment.js",
          "src\\routes\\shift-calendar-routes.js",
          "src\\routes\\shiftRoutes.js",
          "src\\services\\ShiftCalculatorService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "BaseModuleCollector"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/shift/",
          "file": "shiftRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/shift/:id",
          "file": "shiftRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/shift/",
          "file": "shiftRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/shift/:id",
          "file": "shiftRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/shift/:id",
          "file": "shiftRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/shift/:id/assign-users",
          "file": "shiftRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/shift/:id/users",
          "file": "shiftRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/shift/bulk-assign",
          "file": "shiftRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "shifts",
          "model": "Shift-postgresql",
          "file": "Shift-postgresql.js"
        },
        {
          "table": "user_shift_assignments",
          "model": "UserShiftAssignment",
          "file": "UserShiftAssignment.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 2564,
      "lastModified": "2025-12-18T15:40:23.309Z",
      "complexity": "complex"
    },
    "sla": {
      "name": "sla",
      "generatedAt": "2026-01-08T00:25:59.256Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\jobs\\support-sla-monitor.js",
          "src\\models\\SupportSLAPlan.js",
          "src\\routes\\sla.js",
          "src\\services\\SLAEscalationService.js",
          "src\\services\\slaService.js",
          "src\\services\\slaServiceSimple.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "database",
          "SupportNotificationService"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/sla/dashboard",
          "file": "sla.js"
        },
        {
          "method": "GET",
          "path": "/api/sla/metrics",
          "file": "sla.js"
        },
        {
          "method": "GET",
          "path": "/api/sla/ranking",
          "file": "sla.js"
        },
        {
          "method": "GET",
          "path": "/api/sla/bottlenecks",
          "file": "sla.js"
        },
        {
          "method": "GET",
          "path": "/api/sla/approver/:approver_id",
          "file": "sla.js"
        },
        {
          "method": "GET",
          "path": "/api/sla/my-stats",
          "file": "sla.js"
        },
        {
          "method": "POST",
          "path": "/api/sla/save-metrics",
          "file": "sla.js"
        },
        {
          "method": "GET",
          "path": "/api/sla/comparison",
          "file": "sla.js"
        }
      ],
      "databaseTables": [
        {
          "table": "support_sla_plans",
          "model": "SupportSLAPlan",
          "file": "SupportSLAPlan.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 2064,
      "lastModified": "2026-01-04T02:13:03.285Z",
      "complexity": "complex"
    },
    "staffCommissions": {
      "name": "staffCommissions",
      "generatedAt": "2026-01-08T00:26:00.139Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\staffCommissionsRoutes.js",
          "src\\services\\StaffCommissionService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "StaffCommissionService"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/staffCommissions/:staffId",
          "file": "staffCommissionsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/staffCommissions/:staffId/pyramid",
          "file": "staffCommissionsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/staffCommissions/:staffId/subordinates",
          "file": "staffCommissionsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/staffCommissions/:staffId/pyramid-percentage",
          "file": "staffCommissionsRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/staffCommissions/:staffId/pyramid-percentage",
          "file": "staffCommissionsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/staffCommissions/:staffId/projection",
          "file": "staffCommissionsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/staffCommissions/team/summary",
          "file": "staffCommissionsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/staffCommissions/team/ranking",
          "file": "staffCommissionsRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "commissions",
          "model": "Commission",
          "file": "Commission.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 700,
      "lastModified": "2025-12-16T13:34:18.972Z",
      "complexity": "complex"
    },
    "supplierMessages": {
      "name": "supplierMessages",
      "generatedAt": "2026-01-08T00:26:01.169Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\supplierMessagesRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "database",
          "auth",
          "supplierAuth"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/supplierMessages/unread-count",
          "file": "supplierMessagesRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/supplierMessages/inbox",
          "file": "supplierMessagesRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/supplierMessages/sent",
          "file": "supplierMessagesRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/supplierMessages/conversation/:companyId",
          "file": "supplierMessagesRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/supplierMessages/:id",
          "file": "supplierMessagesRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/supplierMessages/send",
          "file": "supplierMessagesRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/supplierMessages/:id/mark-read",
          "file": "supplierMessagesRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/supplierMessages/statistics",
          "file": "supplierMessagesRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/supplierMessages/bulk-mark-read",
          "file": "supplierMessagesRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "messages",
          "model": "Message",
          "file": "Message.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 439,
      "lastModified": "2026-01-06T14:33:41.970Z",
      "complexity": "moderate"
    },
    "supplierPortalAttachments": {
      "name": "supplierPortalAttachments",
      "generatedAt": "2026-01-08T00:26:02.062Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\supplierPortalAttachments.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/supplierPortalAttachments/rfq/:rfqId/company-attachments",
          "file": "supplierPortalAttachments.js"
        },
        {
          "method": "GET",
          "path": "/api/supplierPortalAttachments/rfq/:rfqId/company-attachments",
          "file": "supplierPortalAttachments.js"
        },
        {
          "method": "GET",
          "path": "/api/supplierPortalAttachments/rfq/:rfqId/company-attachments/:attachmentId/download",
          "file": "supplierPortalAttachments.js"
        },
        {
          "method": "POST",
          "path": "/api/supplierPortalAttachments/rfq/:rfqId/company-attachments/:attachmentId/acknowledge",
          "file": "supplierPortalAttachments.js"
        },
        {
          "method": "POST",
          "path": "/api/supplierPortalAttachments/purchase-order/:poId/attachments",
          "file": "supplierPortalAttachments.js"
        },
        {
          "method": "GET",
          "path": "/api/supplierPortalAttachments/purchase-order/:poId/attachments",
          "file": "supplierPortalAttachments.js"
        },
        {
          "method": "GET",
          "path": "/api/supplierPortalAttachments/purchase-order/:poId/attachments/:attachmentId/download",
          "file": "supplierPortalAttachments.js"
        },
        {
          "method": "POST",
          "path": "/api/supplierPortalAttachments/invoice/upload",
          "file": "supplierPortalAttachments.js"
        },
        {
          "method": "POST",
          "path": "/api/supplierPortalAttachments/invoice/:invoiceId/validate",
          "file": "supplierPortalAttachments.js"
        },
        {
          "method": "GET",
          "path": "/api/supplierPortalAttachments/rfq/:rfqId/check-required-downloads",
          "file": "supplierPortalAttachments.js"
        },
        {
          "method": "POST",
          "path": "/api/supplierPortalAttachments/rfq/:rfqId/supplier-upload",
          "file": "supplierPortalAttachments.js"
        },
        {
          "method": "POST",
          "path": "/api/supplierPortalAttachments/purchase-order/:poId/supplier-upload",
          "file": "supplierPortalAttachments.js"
        },
        {
          "method": "GET",
          "path": "/api/supplierPortalAttachments/rfq/:rfqId/my-uploads",
          "file": "supplierPortalAttachments.js"
        },
        {
          "method": "DELETE",
          "path": "/api/supplierPortalAttachments/rfq/:rfqId/:attachmentId",
          "file": "supplierPortalAttachments.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 809,
      "lastModified": "2026-01-06T14:35:50.175Z",
      "complexity": "complex"
    },
    "supplierPortal": {
      "name": "supplierPortal",
      "generatedAt": "2026-01-08T00:26:02.937Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\supplierPortalAttachments.js",
          "src\\routes\\supplierPortalRoutes.js",
          "src\\services\\SupplierPortalService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/supplierPortal/auth/login",
          "file": "supplierPortalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/supplierPortal/auth/register",
          "file": "supplierPortalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/supplierPortal/auth/verify",
          "file": "supplierPortalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/supplierPortal/profile/change-password",
          "file": "supplierPortalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/supplierPortal/profile/request-banking-token",
          "file": "supplierPortalRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/supplierPortal/profile/banking",
          "file": "supplierPortalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/supplierPortal/profile/compliance-status",
          "file": "supplierPortalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/supplierPortal/dashboard",
          "file": "supplierPortalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/supplierPortal/rfqs",
          "file": "supplierPortalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/supplierPortal/rfqs/:id",
          "file": "supplierPortalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/supplierPortal/rfqs/:id/quote",
          "file": "supplierPortalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/supplierPortal/rfqs/:id/decline",
          "file": "supplierPortalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/supplierPortal/rfqs/:id/upload-attachment",
          "file": "supplierPortalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/supplierPortal/rfqs/:id/attachments",
          "file": "supplierPortalRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/supplierPortal/attachments/:id",
          "file": "supplierPortalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/supplierPortal/invoices/upload",
          "file": "supplierPortalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/supplierPortal/documents/:id/download",
          "file": "supplierPortalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/supplierPortal/orders",
          "file": "supplierPortalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/supplierPortal/orders/:id",
          "file": "supplierPortalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/supplierPortal/orders/:id/confirm",
          "file": "supplierPortalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/supplierPortal/invoices",
          "file": "supplierPortalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/supplierPortal/invoices/:id",
          "file": "supplierPortalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/supplierPortal/claims",
          "file": "supplierPortalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/supplierPortal/claims/:id",
          "file": "supplierPortalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/supplierPortal/claims/:id/acknowledge",
          "file": "supplierPortalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/supplierPortal/claims/:id/respond",
          "file": "supplierPortalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/supplierPortal/claims/:id/credit-note",
          "file": "supplierPortalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/supplierPortal/payments",
          "file": "supplierPortalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/supplierPortal/payments/:id",
          "file": "supplierPortalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/supplierPortal/offers",
          "file": "supplierPortalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/supplierPortal/offers",
          "file": "supplierPortalRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/supplierPortal/offers/:id",
          "file": "supplierPortalRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/supplierPortal/offers/:id",
          "file": "supplierPortalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/supplierPortal/statistics",
          "file": "supplierPortalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/supplierPortal/notifications",
          "file": "supplierPortalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/supplierPortal/notifications/:id/read",
          "file": "supplierPortalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/supplierPortal/notifications/read-all",
          "file": "supplierPortalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/supplierPortal/profile",
          "file": "supplierPortalRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/supplierPortal/profile",
          "file": "supplierPortalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/supplierPortal/profile/change-password",
          "file": "supplierPortalRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/supplierPortal/profile/banking",
          "file": "supplierPortalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/supplierPortal/profile/compliance-status",
          "file": "supplierPortalRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 3308,
      "lastModified": "2026-01-06T14:35:50.175Z",
      "complexity": "complex"
    },
    "supportEscalation": {
      "name": "supportEscalation",
      "generatedAt": "2026-01-08T00:26:03.861Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\models\\SupportEscalation.js",
          "src\\routes\\supportEscalationRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/supportEscalation/escalate",
          "file": "supportEscalationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/supportEscalation/escalation/history/:ticketId",
          "file": "supportEscalationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/supportEscalation/escalation/stats",
          "file": "supportEscalationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/supportEscalation/escalation/status",
          "file": "supportEscalationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/supportEscalation/escalation/run-cycle",
          "file": "supportEscalationRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "support_escalations",
          "model": "SupportEscalation",
          "file": "SupportEscalation.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 279,
      "lastModified": "2026-01-04T02:13:03.248Z",
      "complexity": "moderate"
    },
    "supportRoutesV2": {
      "name": "supportRoutesV2",
      "generatedAt": "2026-01-08T00:26:04.772Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\supportRoutesV2.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "auth",
          "database",
          "SupportNotificationService",
          "support-sla-monitor",
          "AssistantService"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/supportRoutesV2/tickets",
          "file": "supportRoutesV2.js"
        },
        {
          "method": "GET",
          "path": "/api/supportRoutesV2/tickets",
          "file": "supportRoutesV2.js"
        },
        {
          "method": "GET",
          "path": "/api/supportRoutesV2/tickets/:ticket_id",
          "file": "supportRoutesV2.js"
        },
        {
          "method": "POST",
          "path": "/api/supportRoutesV2/tickets/:ticket_id/messages",
          "file": "supportRoutesV2.js"
        },
        {
          "method": "PATCH",
          "path": "/api/supportRoutesV2/tickets/:ticket_id/status",
          "file": "supportRoutesV2.js"
        },
        {
          "method": "POST",
          "path": "/api/supportRoutesV2/tickets/:ticket_id/rate",
          "file": "supportRoutesV2.js"
        },
        {
          "method": "POST",
          "path": "/api/supportRoutesV2/tickets/:ticket_id/escalate",
          "file": "supportRoutesV2.js"
        },
        {
          "method": "GET",
          "path": "/api/supportRoutesV2/sla-plans",
          "file": "supportRoutesV2.js"
        },
        {
          "method": "PATCH",
          "path": "/api/supportRoutesV2/companies/:company_id/sla-plan",
          "file": "supportRoutesV2.js"
        },
        {
          "method": "POST",
          "path": "/api/supportRoutesV2/vendors/:vendor_id/assign-supervisor",
          "file": "supportRoutesV2.js"
        },
        {
          "method": "GET",
          "path": "/api/supportRoutesV2/tickets/:ticket_id/activity",
          "file": "supportRoutesV2.js"
        },
        {
          "method": "POST",
          "path": "/api/supportRoutesV2/monitor/start",
          "file": "supportRoutesV2.js"
        },
        {
          "method": "POST",
          "path": "/api/supportRoutesV2/monitor/stop",
          "file": "supportRoutesV2.js"
        },
        {
          "method": "GET",
          "path": "/api/supportRoutesV2/monitor/status",
          "file": "supportRoutesV2.js"
        },
        {
          "method": "POST",
          "path": "/api/supportRoutesV2/monitor/run-now",
          "file": "supportRoutesV2.js"
        },
        {
          "method": "GET",
          "path": "/api/supportRoutesV2/admin/tickets",
          "file": "supportRoutesV2.js"
        },
        {
          "method": "GET",
          "path": "/api/supportRoutesV2/admin/tickets/stats",
          "file": "supportRoutesV2.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 1331,
      "lastModified": "2026-01-04T02:13:03.251Z",
      "complexity": "complex"
    },
    "synapseCentral": {
      "name": "synapseCentral",
      "generatedAt": "2026-01-08T00:26:05.686Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\synapseCentralRoutes.js",
          "src\\synapse\\SynapseCentralHub.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "SynapseCentralHub"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/synapseCentral/status",
          "file": "synapseCentralRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/synapseCentral/history",
          "file": "synapseCentralRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/synapseCentral/modules",
          "file": "synapseCentralRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/synapseCentral/categories",
          "file": "synapseCentralRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/synapseCentral/dependencies",
          "file": "synapseCentralRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/synapseCentral/run",
          "file": "synapseCentralRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/synapseCentral/assign-rubro",
          "file": "synapseCentralRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/synapseCentral/chart-data/:id",
          "file": "synapseCentralRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/synapseCentral/test-types",
          "file": "synapseCentralRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/synapseCentral/panels",
          "file": "synapseCentralRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/synapseCentral/tipos",
          "file": "synapseCentralRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/synapseCentral/rubros",
          "file": "synapseCentralRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 1142,
      "lastModified": "2026-01-04T02:13:03.302Z",
      "complexity": "complex"
    },
    "taskIntelligence": {
      "name": "taskIntelligence",
      "generatedAt": "2026-01-08T00:26:06.625Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\taskIntelligenceRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "PreTaskAnalyzer",
          "PostTaskSynchronizer",
          "CodeIntelligenceService"
        ],
        "optional": [
          "CodeIntelligenceService"
        ],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/taskIntelligence/analyze",
          "file": "taskIntelligenceRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/taskIntelligence/complete",
          "file": "taskIntelligenceRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/taskIntelligence/inconsistencies",
          "file": "taskIntelligenceRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/taskIntelligence/assign-to-claude",
          "file": "taskIntelligenceRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/taskIntelligence/assign-to-human",
          "file": "taskIntelligenceRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/taskIntelligence/create-phase",
          "file": "taskIntelligenceRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/taskIntelligence/my-pending-tasks",
          "file": "taskIntelligenceRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 523,
      "lastModified": "2025-12-16T13:34:18.837Z",
      "complexity": "complex"
    },
    "technologyStack": {
      "name": "technologyStack",
      "generatedAt": "2026-01-08T00:26:07.541Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\technologyStackRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/technologyStack/all",
          "file": "technologyStackRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/technologyStack/by-module",
          "file": "technologyStackRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/technologyStack/summary",
          "file": "technologyStackRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 180,
      "lastModified": "2025-12-16T13:34:18.837Z",
      "complexity": "simple"
    },
    "temporaryAccess": {
      "name": "temporaryAccess",
      "generatedAt": "2026-01-08T00:26:08.390Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\models\\TemporaryAccessActivityLog.js",
          "src\\models\\TemporaryAccessGrant.js",
          "src\\routes\\temporaryAccessRoutes.js",
          "src\\services\\TemporaryAccessService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/temporaryAccess/auth/login",
          "file": "temporaryAccessRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/temporaryAccess/auth/change-password",
          "file": "temporaryAccessRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/temporaryAccess/templates",
          "file": "temporaryAccessRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/temporaryAccess/create",
          "file": "temporaryAccessRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/temporaryAccess/list",
          "file": "temporaryAccessRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/temporaryAccess/:grantId",
          "file": "temporaryAccessRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/temporaryAccess/:grantId/activate",
          "file": "temporaryAccessRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/temporaryAccess/:grantId/revoke",
          "file": "temporaryAccessRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/temporaryAccess/company/stats",
          "file": "temporaryAccessRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/temporaryAccess/company/activity",
          "file": "temporaryAccessRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/temporaryAccess/:grantId/activity",
          "file": "temporaryAccessRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/temporaryAccess/:grantId/extend",
          "file": "temporaryAccessRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/temporaryAccess/:grantId/suspend",
          "file": "temporaryAccessRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/temporaryAccess/:grantId/reactivate",
          "file": "temporaryAccessRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/temporaryAccess/:grantId",
          "file": "temporaryAccessRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/temporaryAccess/cron/auto-expire",
          "file": "temporaryAccessRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/temporaryAccess/cron/expiry-warnings",
          "file": "temporaryAccessRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "temporary_access_activity_log",
          "model": "TemporaryAccessActivityLog",
          "file": "TemporaryAccessActivityLog.js"
        },
        {
          "table": "temporary_access_grants",
          "model": "TemporaryAccessGrant",
          "file": "TemporaryAccessGrant.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 2370,
      "lastModified": "2026-01-04T02:13:03.291Z",
      "complexity": "complex"
    },
    "tempRegisterOHModule": {
      "name": "tempRegisterOHModule",
      "generatedAt": "2026-01-08T00:26:09.328Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\tempRegisterOHModuleRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/tempRegisterOHModule/register-oh-module",
          "file": "tempRegisterOHModuleRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 175,
      "lastModified": "2025-12-16T13:34:18.840Z",
      "complexity": "simple"
    },
    "testing": {
      "name": "testing",
      "generatedAt": "2026-01-08T00:26:10.171Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\auditor\\ai\\AITestingEngine.js",
          "src\\auditor\\core\\IntelligentTestingOrchestrator.js",
          "src\\auditor\\core\\UltimateTestingEngine.js",
          "src\\routes\\e2eTestingAdvancedRoutes.js",
          "src\\routes\\e2eTestingRoutes.js",
          "src\\routes\\testingRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "UIElementDiscoveryEngine"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/testing/run-e2e-advanced",
          "file": "testingRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/testing/test-status/:executionId",
          "file": "testingRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 3229,
      "lastModified": "2026-01-05T19:49:46.935Z",
      "complexity": "complex"
    },
    "trainingKnowledge": {
      "name": "trainingKnowledge",
      "generatedAt": "2026-01-08T00:26:11.021Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\trainingKnowledgeRoutes.js",
          "src\\services\\TrainingKnowledgeService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "TrainingKnowledgeService"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/trainingKnowledge/status",
          "file": "trainingKnowledgeRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/trainingKnowledge/tutorial/:moduleKey",
          "file": "trainingKnowledgeRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/trainingKnowledge/tutorials",
          "file": "trainingKnowledgeRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/trainingKnowledge/plan/:userId",
          "file": "trainingKnowledgeRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/trainingKnowledge/quiz/:moduleKey",
          "file": "trainingKnowledgeRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/trainingKnowledge/quiz/:moduleKey/submit",
          "file": "trainingKnowledgeRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/trainingKnowledge/progress/:userId",
          "file": "trainingKnowledgeRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/trainingKnowledge/ticket-tutorial",
          "file": "trainingKnowledgeRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/trainingKnowledge/notify-feature",
          "file": "trainingKnowledgeRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/trainingKnowledge/updates/:userId",
          "file": "trainingKnowledgeRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/trainingKnowledge/support-dashboard",
          "file": "trainingKnowledgeRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/trainingKnowledge/brain-status",
          "file": "trainingKnowledgeRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/trainingKnowledge/module-health/:moduleKey",
          "file": "trainingKnowledgeRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/trainingKnowledge/health",
          "file": "trainingKnowledgeRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 1636,
      "lastModified": "2025-12-18T15:40:23.388Z",
      "complexity": "complex"
    },
    "training": {
      "name": "training",
      "generatedAt": "2026-01-08T00:26:11.800Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\models\\Training-postgresql.js",
          "src\\models\\TrainingAssignment-postgresql.js",
          "src\\models\\TrainingProgress-postgresql.js",
          "src\\routes\\trainingKnowledgeRoutes.js",
          "src\\routes\\trainingRoutes.js",
          "src\\services\\dms\\adapters\\TrainingDMSAdapter.js",
          "src\\services\\TrainingKnowledgeService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/training/",
          "file": "trainingRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/training/:id",
          "file": "trainingRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/training/",
          "file": "trainingRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/training/:id",
          "file": "trainingRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/training/:id",
          "file": "trainingRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/training/stats/dashboard",
          "file": "trainingRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "trainings",
          "model": "Training-postgresql",
          "file": "Training-postgresql.js"
        },
        {
          "table": "training_assignments",
          "model": "TrainingAssignment-postgresql",
          "file": "TrainingAssignment-postgresql.js"
        },
        {
          "table": "training_progress",
          "model": "TrainingProgress-postgresql",
          "file": "TrainingProgress-postgresql.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 2767,
      "lastModified": "2025-12-18T15:40:23.388Z",
      "complexity": "complex"
    },
    "transportFleet": {
      "name": "transportFleet",
      "generatedAt": "2026-01-08T00:26:12.767Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\transportFleetRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/transportFleet/",
          "file": "transportFleetRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/transportFleet/:vehicleId",
          "file": "transportFleetRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/transportFleet/",
          "file": "transportFleetRoutes.js"
        },
        {
          "method": "PATCH",
          "path": "/api/transportFleet/:vehicleId/status",
          "file": "transportFleetRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/transportFleet/:vehicleId/maintenance",
          "file": "transportFleetRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 234,
      "lastModified": "2025-09-23T17:47:54.806Z",
      "complexity": "moderate"
    },
    "transport": {
      "name": "transport",
      "generatedAt": "2026-01-08T00:26:13.500Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\transportFleetRoutes.js",
          "src\\routes\\transportRoutes.js",
          "src\\routes\\transportTripsRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/transport/dashboard",
          "file": "transportRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/transport/company/:companyId",
          "file": "transportRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/transport/modules/:companyId",
          "file": "transportRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/transport/health",
          "file": "transportRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 784,
      "lastModified": "2025-09-23T17:48:40.313Z",
      "complexity": "complex"
    },
    "transportTrips": {
      "name": "transportTrips",
      "generatedAt": "2026-01-08T00:26:14.225Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\transportTripsRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/transportTrips/",
          "file": "transportTripsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/transportTrips/:tripId",
          "file": "transportTripsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/transportTrips/",
          "file": "transportTripsRoutes.js"
        },
        {
          "method": "PATCH",
          "path": "/api/transportTrips/:tripId/status",
          "file": "transportTripsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/transportTrips/:tripId/position",
          "file": "transportTripsRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 397,
      "lastModified": "2025-09-23T17:48:40.313Z",
      "complexity": "moderate"
    },
    "trials": {
      "name": "trials",
      "generatedAt": "2026-01-08T00:26:14.944Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\trialsRoutes.js",
          "src\\services\\ModuleTrialService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "ModuleTrialService",
          "auth"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/trials/company/:companyId",
          "file": "trialsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/trials/reminders/:reminderType",
          "file": "trialsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/trials/reminders/:reminderType/send",
          "file": "trialsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/trials/:id/accept",
          "file": "trialsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/trials/:id/reject",
          "file": "trialsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/trials/company/:companyId/bulk-accept",
          "file": "trialsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/trials/process-expired",
          "file": "trialsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/trials/stats",
          "file": "trialsRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 698,
      "lastModified": "2025-12-16T13:34:18.931Z",
      "complexity": "complex"
    },
    "tutorial": {
      "name": "tutorial",
      "generatedAt": "2026-01-08T00:26:15.707Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\brain\\integrations\\TutorialGenerator.js",
          "src\\routes\\tutorialRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/tutorial/",
          "file": "tutorialRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/tutorial/stats",
          "file": "tutorialRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/tutorial/:moduleKey",
          "file": "tutorialRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/tutorial/:moduleKey/steps",
          "file": "tutorialRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/tutorial/:moduleKey/regenerate",
          "file": "tutorialRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/tutorial/workflow/:workflowId",
          "file": "tutorialRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 844,
      "lastModified": "2026-01-04T02:13:01.988Z",
      "complexity": "complex"
    },
    "ultimateTest": {
      "name": "ultimateTest",
      "generatedAt": "2026-01-08T00:26:16.535Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\auditor\\core\\UltimateTestingEngine.js",
          "src\\routes\\ultimateTestRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "Phase4TestOrchestrator",
          "IntelligentTestingOrchestrator",
          "EndpointCollector",
          "DatabaseCollector",
          "FrontendCollector",
          "IntegrationCollector",
          "E2ECollector",
          "RealUserExperienceCollector",
          "AdvancedUserSimulationCollector"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/ultimateTest/run",
          "file": "ultimateTestRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/ultimateTest/status",
          "file": "ultimateTestRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/ultimateTest/stop",
          "file": "ultimateTestRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/ultimateTest/results",
          "file": "ultimateTestRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/ultimateTest/results/:executionId",
          "file": "ultimateTestRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 1043,
      "lastModified": "2026-01-05T17:38:58.245Z",
      "complexity": "complex"
    },
    "unifiedHelp": {
      "name": "unifiedHelp",
      "generatedAt": "2026-01-08T00:26:17.515Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\unifiedHelpRoutes.js",
          "src\\services\\UnifiedHelpService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "UnifiedHelpService"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/unifiedHelp/ask",
          "file": "unifiedHelpRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/unifiedHelp/feedback/:id",
          "file": "unifiedHelpRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/unifiedHelp/ticket",
          "file": "unifiedHelpRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/unifiedHelp/tickets",
          "file": "unifiedHelpRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/unifiedHelp/tickets/:threadId",
          "file": "unifiedHelpRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/unifiedHelp/tickets/:threadId/reply",
          "file": "unifiedHelpRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/unifiedHelp/tickets/:threadId/close",
          "file": "unifiedHelpRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/unifiedHelp/module/:moduleKey",
          "file": "unifiedHelpRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/unifiedHelp/walkthrough/:moduleKey",
          "file": "unifiedHelpRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/unifiedHelp/stats",
          "file": "unifiedHelpRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/unifiedHelp/history",
          "file": "unifiedHelpRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/unifiedHelp/health",
          "file": "unifiedHelpRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 1538,
      "lastModified": "2026-01-04T02:13:03.253Z",
      "complexity": "complex"
    },
    "upload": {
      "name": "upload",
      "generatedAt": "2026-01-08T00:26:18.427Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\middleware\\supplierUpload.js",
          "src\\middleware\\upload.js",
          "src\\routes\\uploadRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/upload/single",
          "file": "uploadRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/upload/multiple",
          "file": "uploadRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/upload/:filename",
          "file": "uploadRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/upload/info/:filename",
          "file": "uploadRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 646,
      "lastModified": "2026-01-05T11:40:10.253Z",
      "complexity": "complex"
    },
    "user-calendar-": {
      "name": "user-calendar-",
      "generatedAt": "2026-01-08T00:26:19.446Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\user-calendar-routes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "auth",
          "ShiftCalculatorService",
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/user-calendar-/:userId/calendar",
          "file": "user-calendar-Routes.js"
        },
        {
          "method": "GET",
          "path": "/api/user-calendar-/:userId/calendar/summary",
          "file": "user-calendar-Routes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 406,
      "lastModified": "2025-12-16T13:34:18.846Z",
      "complexity": "moderate"
    },
    "userAdmin": {
      "name": "userAdmin",
      "generatedAt": "2026-01-08T00:26:20.398Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\userAdminRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "UserDocuments",
          "UserPermissionRequests",
          "UserDisciplinaryActions"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/userAdmin/:userId/documents",
          "file": "userAdminRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/userAdmin/:userId/documents",
          "file": "userAdminRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/userAdmin/:userId/documents/:id",
          "file": "userAdminRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/userAdmin/:userId/documents/:id",
          "file": "userAdminRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/userAdmin/:userId/permissions",
          "file": "userAdminRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/userAdmin/:userId/permissions",
          "file": "userAdminRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/userAdmin/:userId/permissions/:id",
          "file": "userAdminRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/userAdmin/:userId/permissions/:id/approve",
          "file": "userAdminRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/userAdmin/:userId/permissions/:id",
          "file": "userAdminRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/userAdmin/:userId/disciplinary",
          "file": "userAdminRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/userAdmin/:userId/disciplinary",
          "file": "userAdminRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/userAdmin/:userId/disciplinary/:id",
          "file": "userAdminRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/userAdmin/:userId/disciplinary/:id/acknowledge",
          "file": "userAdminRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/userAdmin/:userId/disciplinary/:id",
          "file": "userAdminRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 341,
      "lastModified": "2026-01-04T02:13:03.254Z",
      "complexity": "moderate"
    },
    "userAssignedTask": {
      "name": "userAssignedTask",
      "generatedAt": "2026-01-08T00:26:21.358Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\models\\UserAssignedTask.js",
          "src\\routes\\userAssignedTaskRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/userAssignedTask/:userId/assigned-tasks",
          "file": "userAssignedTaskRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/userAssignedTask/:userId/assigned-tasks/:taskId",
          "file": "userAssignedTaskRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/userAssignedTask/:userId/assigned-tasks",
          "file": "userAssignedTaskRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/userAssignedTask/:userId/assigned-tasks/:taskId",
          "file": "userAssignedTaskRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/userAssignedTask/:userId/assigned-tasks/:taskId/approve",
          "file": "userAssignedTaskRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/userAssignedTask/:userId/assigned-tasks/:taskId",
          "file": "userAssignedTaskRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "user_assigned_tasks",
          "model": "UserAssignedTask",
          "file": "UserAssignedTask.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 615,
      "lastModified": "2025-12-16T13:34:18.846Z",
      "complexity": "complex"
    },
    "userDocuments": {
      "name": "userDocuments",
      "generatedAt": "2026-01-08T00:26:22.248Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\models\\UserDocuments.js",
          "src\\routes\\userDocumentsRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/userDocuments/users/:userId/documents",
          "file": "userDocumentsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/userDocuments/users/:userId/documents/:documentId",
          "file": "userDocumentsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/userDocuments/users/:userId/documents",
          "file": "userDocumentsRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/userDocuments/users/:userId/documents/:documentId",
          "file": "userDocumentsRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/userDocuments/users/:userId/documents/:documentId",
          "file": "userDocumentsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/userDocuments/documents/expiring",
          "file": "userDocumentsRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "user_documents",
          "model": "UserDocuments",
          "file": "UserDocuments.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 354,
      "lastModified": "2026-01-04T02:13:03.254Z",
      "complexity": "moderate"
    },
    "userDriverLicense": {
      "name": "userDriverLicense",
      "generatedAt": "2026-01-08T00:26:23.266Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\models\\UserDriverLicense.js",
          "src\\routes\\userDriverLicenseRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/userDriverLicense/:userId/driver-licenses",
          "file": "userDriverLicenseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/userDriverLicense/:userId/driver-licenses/:licenseId",
          "file": "userDriverLicenseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/userDriverLicense/:userId/driver-licenses",
          "file": "userDriverLicenseRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/userDriverLicense/:userId/driver-licenses/:licenseId",
          "file": "userDriverLicenseRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/userDriverLicense/:userId/driver-licenses/:licenseId",
          "file": "userDriverLicenseRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "user_driver_licenses",
          "model": "UserDriverLicense",
          "file": "UserDriverLicense.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 397,
      "lastModified": "2025-12-16T13:34:18.848Z",
      "complexity": "moderate"
    },
    "userLegalIssue": {
      "name": "userLegalIssue",
      "generatedAt": "2026-01-08T00:26:24.190Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\models\\UserLegalIssue.js",
          "src\\routes\\userLegalIssueRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/userLegalIssue/:userId/legal-issues",
          "file": "userLegalIssueRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/userLegalIssue/:userId/legal-issues/:issueId",
          "file": "userLegalIssueRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/userLegalIssue/:userId/legal-issues",
          "file": "userLegalIssueRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/userLegalIssue/:userId/legal-issues/:issueId",
          "file": "userLegalIssueRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/userLegalIssue/:userId/legal-issues/:issueId",
          "file": "userLegalIssueRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "user_legal_issues",
          "model": "UserLegalIssue",
          "file": "UserLegalIssue.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 446,
      "lastModified": "2025-12-16T13:34:18.850Z",
      "complexity": "moderate"
    },
    "userMedicalExams": {
      "name": "userMedicalExams",
      "generatedAt": "2026-01-08T00:26:25.283Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\models\\UserMedicalExams.js",
          "src\\routes\\userMedicalExamsRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/userMedicalExams/users/:userId/medical-exams",
          "file": "userMedicalExamsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/userMedicalExams/users/:userId/medical-exams/:examId",
          "file": "userMedicalExamsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/userMedicalExams/users/:userId/medical-exams",
          "file": "userMedicalExamsRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/userMedicalExams/users/:userId/medical-exams/:examId",
          "file": "userMedicalExamsRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/userMedicalExams/users/:userId/medical-exams/:examId",
          "file": "userMedicalExamsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/userMedicalExams/medical-exams/expiring",
          "file": "userMedicalExamsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/userMedicalExams/users/:userId/medical-exams/latest",
          "file": "userMedicalExamsRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "user_medical_exams",
          "model": "UserMedicalExams",
          "file": "UserMedicalExams.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 405,
      "lastModified": "2026-01-04T02:13:03.254Z",
      "complexity": "moderate"
    },
    "userMedical": {
      "name": "userMedical",
      "generatedAt": "2026-01-08T00:26:26.191Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\models\\UserMedicalAdvanced.js",
          "src\\models\\UserMedicalDocuments.js",
          "src\\models\\UserMedicalExams.js",
          "src\\routes\\userMedicalExamsRoutes.js",
          "src\\routes\\userMedicalRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/userMedical/:userId/primary-physician",
          "file": "userMedicalRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/userMedical/:userId/primary-physician",
          "file": "userMedicalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/userMedical/:userId/chronic-conditions",
          "file": "userMedicalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/userMedical/:userId/chronic-conditions",
          "file": "userMedicalRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/userMedical/:userId/chronic-conditions/:id",
          "file": "userMedicalRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/userMedical/:userId/chronic-conditions/:id",
          "file": "userMedicalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/userMedical/:userId/medications",
          "file": "userMedicalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/userMedical/:userId/medications",
          "file": "userMedicalRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/userMedical/:userId/medications/:id",
          "file": "userMedicalRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/userMedical/:userId/medications/:id",
          "file": "userMedicalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/userMedical/:userId/allergies",
          "file": "userMedicalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/userMedical/:userId/allergies",
          "file": "userMedicalRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/userMedical/:userId/allergies/:id",
          "file": "userMedicalRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/userMedical/:userId/allergies/:id",
          "file": "userMedicalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/userMedical/:userId/activity-restrictions",
          "file": "userMedicalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/userMedical/:userId/activity-restrictions",
          "file": "userMedicalRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/userMedical/:userId/activity-restrictions/:id",
          "file": "userMedicalRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/userMedical/:userId/activity-restrictions/:id",
          "file": "userMedicalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/userMedical/:userId/work-restrictions",
          "file": "userMedicalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/userMedical/:userId/work-restrictions",
          "file": "userMedicalRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/userMedical/:userId/work-restrictions/:id",
          "file": "userMedicalRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/userMedical/:userId/work-restrictions/:id",
          "file": "userMedicalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/userMedical/:userId/vaccinations",
          "file": "userMedicalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/userMedical/:userId/vaccinations",
          "file": "userMedicalRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/userMedical/:userId/vaccinations/:id",
          "file": "userMedicalRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/userMedical/:userId/vaccinations/:id",
          "file": "userMedicalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/userMedical/:userId/medical-exams",
          "file": "userMedicalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/userMedical/:userId/medical-exams",
          "file": "userMedicalRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/userMedical/:userId/medical-exams/:id",
          "file": "userMedicalRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/userMedical/:userId/medical-exams/:id",
          "file": "userMedicalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/userMedical/:userId/medical-documents",
          "file": "userMedicalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/userMedical/:userId/medical-documents",
          "file": "userMedicalRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/userMedical/:userId/medical-documents/:id",
          "file": "userMedicalRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/userMedical/:userId/medical-documents/:id",
          "file": "userMedicalRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "user_anthropometric_data",
          "model": "UserMedicalAdvanced",
          "file": "UserMedicalAdvanced.js"
        },
        {
          "table": "user_medical_documents",
          "model": "UserMedicalDocuments",
          "file": "UserMedicalDocuments.js"
        },
        {
          "table": "user_medical_exams",
          "model": "UserMedicalExams",
          "file": "UserMedicalExams.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 1665,
      "lastModified": "2026-01-04T02:13:03.254Z",
      "complexity": "complex"
    },
    "userProfessionalLicense": {
      "name": "userProfessionalLicense",
      "generatedAt": "2026-01-08T00:26:27.072Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\models\\UserProfessionalLicense.js",
          "src\\routes\\userProfessionalLicenseRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/userProfessionalLicense/:userId/professional-licenses",
          "file": "userProfessionalLicenseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/userProfessionalLicense/:userId/professional-licenses/:licenseId",
          "file": "userProfessionalLicenseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/userProfessionalLicense/:userId/professional-licenses",
          "file": "userProfessionalLicenseRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/userProfessionalLicense/:userId/professional-licenses/:licenseId",
          "file": "userProfessionalLicenseRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/userProfessionalLicense/:userId/professional-licenses/:licenseId",
          "file": "userProfessionalLicenseRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "user_professional_licenses",
          "model": "UserProfessionalLicense",
          "file": "UserProfessionalLicense.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 435,
      "lastModified": "2025-12-16T13:34:18.851Z",
      "complexity": "moderate"
    },
    "userProfile": {
      "name": "userProfile",
      "generatedAt": "2026-01-08T00:26:28.085Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\userProfileRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "UserWorkHistory",
          "UserMaritalStatus",
          "UserChildren",
          "UserFamilyMembers",
          "UserEducation"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/userProfile/:userId/work-history",
          "file": "userProfileRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/userProfile/:userId/work-history",
          "file": "userProfileRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/userProfile/:userId/work-history/:id",
          "file": "userProfileRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/userProfile/:userId/work-history/:id",
          "file": "userProfileRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/userProfile/:userId/marital-status",
          "file": "userProfileRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/userProfile/:userId/marital-status",
          "file": "userProfileRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/userProfile/:userId/children",
          "file": "userProfileRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/userProfile/:userId/children",
          "file": "userProfileRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/userProfile/:userId/children/:id",
          "file": "userProfileRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/userProfile/:userId/children/:id",
          "file": "userProfileRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/userProfile/:userId/family-members",
          "file": "userProfileRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/userProfile/:userId/family-members",
          "file": "userProfileRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/userProfile/:userId/family-members/:id",
          "file": "userProfileRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/userProfile/:userId/family-members/:id",
          "file": "userProfileRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/userProfile/:userId/education",
          "file": "userProfileRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/userProfile/:userId/education",
          "file": "userProfileRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/userProfile/:userId/education/:id",
          "file": "userProfileRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/userProfile/:userId/education/:id",
          "file": "userProfileRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 430,
      "lastModified": "2026-01-04T02:13:03.254Z",
      "complexity": "moderate"
    },
    "user": {
      "name": "user",
      "generatedAt": "2026-01-08T00:26:28.834Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\auditor\\collectors\\AdvancedUserSimulationCollector.js",
          "src\\auditor\\collectors\\RealUserExperienceCollector.js",
          "src\\auditor\\collectors\\UsersCrudCollector.js",
          "src\\auditor\\collectors\\UsersModuleCollector.js",
          "src\\auditor\\tests\\users-crud-persistence.test.js",
          "src\\brain\\services\\NLUService.js",
          "src\\models\\User-postgresql.js",
          "src\\models\\UserActivityRestrictions.js",
          "src\\models\\UserAllergies.js",
          "src\\models\\UserAssignedTask.js",
          "src\\models\\UserAuditLog.js",
          "src\\models\\UserChildren.js",
          "src\\models\\UserChronicConditions.js",
          "src\\models\\UserConsent.js",
          "src\\models\\UserDisciplinaryActions.js",
          "src\\models\\UserDocuments.js",
          "src\\models\\UserDriverLicense.js",
          "src\\models\\UserEducation.js",
          "src\\models\\UserFamilyMembers.js",
          "src\\models\\UserLegalIssue.js",
          "src\\models\\UserMaritalStatus.js",
          "src\\models\\UserMedicalAdvanced.js",
          "src\\models\\UserMedicalDocuments.js",
          "src\\models\\UserMedicalExams.js",
          "src\\models\\UserMedications.js",
          "src\\models\\UserNotificationPreference.js",
          "src\\models\\UserPayrollAssignment.js",
          "src\\models\\UserPayrollBonus.js",
          "src\\models\\UserPayrollConceptOverride.js",
          "src\\models\\UserPermissionRequests.js",
          "src\\models\\UserPrimaryPhysician.js",
          "src\\models\\UserProfessionalLicense.js",
          "src\\models\\UserSalaryAdvanced.js",
          "src\\models\\UserSalaryConfig.js",
          "src\\models\\UserShiftAssignment.js",
          "src\\models\\UserUnionAffiliation.js",
          "src\\models\\UserVaccinations.js",
          "src\\models\\UserWorkHistory.js",
          "src\\models\\UserWorkRestrictions.js",
          "src\\routes\\user-calendar-routes.js",
          "src\\routes\\userAdminRoutes.js",
          "src\\routes\\userAssignedTaskRoutes.js",
          "src\\routes\\userDocumentsRoutes.js",
          "src\\routes\\userDriverLicenseRoutes.js",
          "src\\routes\\userLegalIssueRoutes.js",
          "src\\routes\\userMedicalExamsRoutes.js",
          "src\\routes\\userMedicalRoutes.js",
          "src\\routes\\userProfessionalLicenseRoutes.js",
          "src\\routes\\userProfileRoutes.js",
          "src\\routes\\userRoutes.js",
          "src\\routes\\userSalaryConfigRoutes.js",
          "src\\routes\\userSocioEnvironmentalRoutes.js",
          "src\\routes\\usersSimple.js",
          "src\\routes\\userUnionAffiliationRoutes.js",
          "src\\routes\\userWorkHistoryRoutes.js",
          "src\\routes\\warehouseRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/user/test",
          "file": "userRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/user/",
          "file": "userRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/user/:id",
          "file": "userRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/user/",
          "file": "userRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/user/:id",
          "file": "userRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/user/:id",
          "file": "userRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/user/:id/upload-photo",
          "file": "userRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/user/:id/reset-password",
          "file": "userRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/user/:id/access-config",
          "file": "userRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/user/:id/flexible-schedule",
          "file": "userRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/user/:id/check-leave-status",
          "file": "userRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/user/by-employee-id/:employeeId",
          "file": "userRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/user/:id/audit-logs",
          "file": "userRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/user/:id/audit-logs/stats",
          "file": "userRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/user/:id/hiring-status",
          "file": "userRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/user/:id/hiring-status",
          "file": "userRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/user/:id/hiring-status/approve/:type",
          "file": "userRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/user/:id/offboarding",
          "file": "userRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/user/:id/offboarding",
          "file": "userRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "users",
          "model": "User-postgresql",
          "file": "User-postgresql.js"
        },
        {
          "table": "user_activity_restrictions",
          "model": "UserActivityRestrictions",
          "file": "UserActivityRestrictions.js"
        },
        {
          "table": "user_allergies",
          "model": "UserAllergies",
          "file": "UserAllergies.js"
        },
        {
          "table": "user_assigned_tasks",
          "model": "UserAssignedTask",
          "file": "UserAssignedTask.js"
        },
        {
          "table": "user_audit_logs",
          "model": "UserAuditLog",
          "file": "UserAuditLog.js"
        },
        {
          "table": "user_children",
          "model": "UserChildren",
          "file": "UserChildren.js"
        },
        {
          "table": "user_chronic_conditions",
          "model": "UserChronicConditions",
          "file": "UserChronicConditions.js"
        },
        {
          "table": "user_consents",
          "model": "UserConsent",
          "file": "UserConsent.js"
        },
        {
          "table": "user_disciplinary_actions",
          "model": "UserDisciplinaryActions",
          "file": "UserDisciplinaryActions.js"
        },
        {
          "table": "user_documents",
          "model": "UserDocuments",
          "file": "UserDocuments.js"
        },
        {
          "table": "user_driver_licenses",
          "model": "UserDriverLicense",
          "file": "UserDriverLicense.js"
        },
        {
          "table": "user_education",
          "model": "UserEducation",
          "file": "UserEducation.js"
        },
        {
          "table": "user_family_members",
          "model": "UserFamilyMembers",
          "file": "UserFamilyMembers.js"
        },
        {
          "table": "user_legal_issues",
          "model": "UserLegalIssue",
          "file": "UserLegalIssue.js"
        },
        {
          "table": "user_marital_status",
          "model": "UserMaritalStatus",
          "file": "UserMaritalStatus.js"
        },
        {
          "table": "user_anthropometric_data",
          "model": "UserMedicalAdvanced",
          "file": "UserMedicalAdvanced.js"
        },
        {
          "table": "user_medical_documents",
          "model": "UserMedicalDocuments",
          "file": "UserMedicalDocuments.js"
        },
        {
          "table": "user_medical_exams",
          "model": "UserMedicalExams",
          "file": "UserMedicalExams.js"
        },
        {
          "table": "user_medications",
          "model": "UserMedications",
          "file": "UserMedications.js"
        },
        {
          "table": "user_notification_preferences",
          "model": "UserNotificationPreference",
          "file": "UserNotificationPreference.js"
        },
        {
          "table": "user_payroll_assignment",
          "model": "UserPayrollAssignment",
          "file": "UserPayrollAssignment.js"
        },
        {
          "table": "user_payroll_bonuses",
          "model": "UserPayrollBonus",
          "file": "UserPayrollBonus.js"
        },
        {
          "table": "user_payroll_concept_overrides",
          "model": "UserPayrollConceptOverride",
          "file": "UserPayrollConceptOverride.js"
        },
        {
          "table": "user_permission_requests",
          "model": "UserPermissionRequests",
          "file": "UserPermissionRequests.js"
        },
        {
          "table": "user_primary_physician",
          "model": "UserPrimaryPhysician",
          "file": "UserPrimaryPhysician.js"
        },
        {
          "table": "user_professional_licenses",
          "model": "UserProfessionalLicense",
          "file": "UserProfessionalLicense.js"
        },
        {
          "table": "labor_agreements_catalog",
          "model": "UserSalaryAdvanced",
          "file": "UserSalaryAdvanced.js"
        },
        {
          "table": "user_salary_config",
          "model": "UserSalaryConfig",
          "file": "UserSalaryConfig.js"
        },
        {
          "table": "user_shift_assignments",
          "model": "UserShiftAssignment",
          "file": "UserShiftAssignment.js"
        },
        {
          "table": "user_union_affiliation",
          "model": "UserUnionAffiliation",
          "file": "UserUnionAffiliation.js"
        },
        {
          "table": "user_vaccinations",
          "model": "UserVaccinations",
          "file": "UserVaccinations.js"
        },
        {
          "table": "user_work_history",
          "model": "UserWorkHistory",
          "file": "UserWorkHistory.js"
        },
        {
          "table": "user_work_restrictions",
          "model": "UserWorkRestrictions",
          "file": "UserWorkRestrictions.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 22348,
      "lastModified": "2026-01-06T14:29:06.666Z",
      "complexity": "complex"
    },
    "userSalaryConfig": {
      "name": "userSalaryConfig",
      "generatedAt": "2026-01-08T00:26:29.664Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\models\\UserSalaryConfig.js",
          "src\\routes\\userSalaryConfigRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/userSalaryConfig/:userId/salary-config",
          "file": "userSalaryConfigRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/userSalaryConfig/:userId/salary-config",
          "file": "userSalaryConfigRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/userSalaryConfig/:userId/salary-config",
          "file": "userSalaryConfigRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/userSalaryConfig/:userId/salary-config",
          "file": "userSalaryConfigRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "user_salary_config",
          "model": "UserSalaryConfig",
          "file": "UserSalaryConfig.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 680,
      "lastModified": "2025-12-16T13:34:18.857Z",
      "complexity": "complex"
    },
    "userSocioEnvironmental": {
      "name": "userSocioEnvironmental",
      "generatedAt": "2026-01-08T00:26:30.429Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\userSocioEnvironmentalRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "auth",
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/userSocioEnvironmental/:userId/household-members",
          "file": "userSocioEnvironmentalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/userSocioEnvironmental/:userId/household-members",
          "file": "userSocioEnvironmentalRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/userSocioEnvironmental/:userId/household-members/:memberId",
          "file": "userSocioEnvironmentalRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/userSocioEnvironmental/:userId/household-members/:memberId",
          "file": "userSocioEnvironmentalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/userSocioEnvironmental/:userId/emergency-contacts",
          "file": "userSocioEnvironmentalRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/userSocioEnvironmental/:userId/emergency-contacts",
          "file": "userSocioEnvironmentalRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/userSocioEnvironmental/:userId/emergency-contacts/:contactId",
          "file": "userSocioEnvironmentalRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/userSocioEnvironmental/:userId/emergency-contacts/:contactId",
          "file": "userSocioEnvironmentalRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/userSocioEnvironmental/:userId/socioeconomic-data",
          "file": "userSocioEnvironmentalRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 492,
      "lastModified": "2026-01-04T02:13:03.261Z",
      "complexity": "moderate"
    },
    "usersSimple": {
      "name": "usersSimple",
      "generatedAt": "2026-01-08T00:26:31.188Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\usersSimple.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/usersSimple/",
          "file": "usersSimple.js"
        },
        {
          "method": "GET",
          "path": "/api/usersSimple/:id",
          "file": "usersSimple.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 190,
      "lastModified": "2025-12-16T13:34:18.859Z",
      "complexity": "simple"
    },
    "userUnionAffiliation": {
      "name": "userUnionAffiliation",
      "generatedAt": "2026-01-08T00:26:31.855Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\models\\UserUnionAffiliation.js",
          "src\\routes\\userUnionAffiliationRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/userUnionAffiliation/:userId/union-affiliation",
          "file": "userUnionAffiliationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/userUnionAffiliation/:userId/union-affiliation/:affiliationId",
          "file": "userUnionAffiliationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/userUnionAffiliation/:userId/union-affiliation",
          "file": "userUnionAffiliationRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/userUnionAffiliation/:userId/union-affiliation/:affiliationId",
          "file": "userUnionAffiliationRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/userUnionAffiliation/:userId/union-affiliation/:affiliationId",
          "file": "userUnionAffiliationRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "user_union_affiliation",
          "model": "UserUnionAffiliation",
          "file": "UserUnionAffiliation.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 516,
      "lastModified": "2025-12-16T13:34:18.859Z",
      "complexity": "complex"
    },
    "userWorkHistory": {
      "name": "userWorkHistory",
      "generatedAt": "2026-01-08T00:26:32.461Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\models\\UserWorkHistory.js",
          "src\\routes\\userWorkHistoryRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/userWorkHistory/users/:userId/work-history",
          "file": "userWorkHistoryRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/userWorkHistory/users/:userId/work-history/:jobId",
          "file": "userWorkHistoryRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/userWorkHistory/users/:userId/work-history",
          "file": "userWorkHistoryRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/userWorkHistory/users/:userId/work-history/:jobId",
          "file": "userWorkHistoryRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/userWorkHistory/users/:userId/work-history/:jobId",
          "file": "userWorkHistoryRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/userWorkHistory/work-history/active-litigations",
          "file": "userWorkHistoryRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/userWorkHistory/work-history/termination-stats",
          "file": "userWorkHistoryRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/userWorkHistory/work-history/with-severance",
          "file": "userWorkHistoryRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/userWorkHistory/work-history/not-eligible-for-rehire",
          "file": "userWorkHistoryRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "user_work_history",
          "model": "UserWorkHistory",
          "file": "UserWorkHistory.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 682,
      "lastModified": "2026-01-04T02:13:03.261Z",
      "complexity": "complex"
    },
    "vacation": {
      "name": "vacation",
      "generatedAt": "2026-01-08T00:26:33.047Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\models\\VacationConfiguration.js",
          "src\\models\\VacationRequest.js",
          "src\\models\\VacationScale.js",
          "src\\routes\\vacationRoutes.js",
          "src\\services\\dms\\adapters\\VacationDMSAdapter.js",
          "src\\services\\VacationOptimizer.js",
          "src\\workflows\\generated\\VacationWorkflowGenerated.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/vacation/config",
          "file": "vacationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/vacation/config",
          "file": "vacationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/vacation/scales",
          "file": "vacationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/vacation/scales",
          "file": "vacationRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/vacation/scales/:id",
          "file": "vacationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/vacation/extraordinary-licenses",
          "file": "vacationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/vacation/extraordinary-licenses",
          "file": "vacationRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/vacation/extraordinary-licenses/:id",
          "file": "vacationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/vacation/requests",
          "file": "vacationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/vacation/requests",
          "file": "vacationRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/vacation/requests/:id/approval",
          "file": "vacationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/vacation/generate-schedule",
          "file": "vacationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/vacation/compatibility-matrix",
          "file": "vacationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/vacation/compatibility-matrix",
          "file": "vacationRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/vacation/compatibility-matrix/:id",
          "file": "vacationRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/vacation/compatibility-matrix/:id",
          "file": "vacationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/vacation/calculate-days/:userId",
          "file": "vacationRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "vacation_configurations",
          "model": "VacationConfiguration",
          "file": "VacationConfiguration.js"
        },
        {
          "table": "vacation_requests",
          "model": "VacationRequest",
          "file": "VacationRequest.js"
        },
        {
          "table": "vacation_scales",
          "model": "VacationScale",
          "file": "VacationScale.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 2691,
      "lastModified": "2025-12-16T13:34:19.055Z",
      "complexity": "complex"
    },
    "vendorAutomation": {
      "name": "vendorAutomation",
      "generatedAt": "2026-01-08T00:26:33.676Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\vendorAutomationRoutes.js",
          "src\\services\\vendorAutomationService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "vendorAutomationService",
          "notificationService",
          "vendorMetricsService",
          "vendorReferralService",
          "database",
          "PaymentService",
          "CommissionCalculationService"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/vendorAutomation/status",
          "file": "vendorAutomationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/vendorAutomation/check",
          "file": "vendorAutomationRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/vendorAutomation/config",
          "file": "vendorAutomationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/vendorAutomation/auctions",
          "file": "vendorAutomationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/vendorAutomation/auctions/:id",
          "file": "vendorAutomationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/vendorAutomation/auctions/:id/bid",
          "file": "vendorAutomationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/vendorAutomation/auctions/:id/select-winner",
          "file": "vendorAutomationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/vendorAutomation/low-ratings",
          "file": "vendorAutomationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/vendorAutomation/notify",
          "file": "vendorAutomationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/vendorAutomation/eligible-vendors",
          "file": "vendorAutomationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/vendorAutomation/dashboard",
          "file": "vendorAutomationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/vendorAutomation/vendors-metrics",
          "file": "vendorAutomationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/vendorAutomation/vendors/:id/metrics",
          "file": "vendorAutomationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/vendorAutomation/vendors/:id/recalculate",
          "file": "vendorAutomationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/vendorAutomation/vendors/recalculate-all",
          "file": "vendorAutomationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/vendorAutomation/referrals",
          "file": "vendorAutomationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/vendorAutomation/vendors/:id/referral-tree",
          "file": "vendorAutomationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/vendorAutomation/vendors/:id/referral-stats",
          "file": "vendorAutomationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/vendorAutomation/referrals/process-monthly",
          "file": "vendorAutomationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/vendorAutomation/system-performance",
          "file": "vendorAutomationRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/vendorAutomation/payments",
          "file": "vendorAutomationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/vendorAutomation/payments/:companyId",
          "file": "vendorAutomationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/vendorAutomation/payments/details/:paymentId",
          "file": "vendorAutomationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/vendorAutomation/invoices",
          "file": "vendorAutomationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/vendorAutomation/invoices/:id",
          "file": "vendorAutomationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/vendorAutomation/commissions/partner/:partnerId",
          "file": "vendorAutomationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/vendorAutomation/commissions/period/:year/:month",
          "file": "vendorAutomationRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/vendorAutomation/commissions/:id/mark-paid",
          "file": "vendorAutomationRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/vendorAutomation/commissions/pending/:partnerId",
          "file": "vendorAutomationRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 1535,
      "lastModified": "2025-12-16T13:34:18.861Z",
      "complexity": "complex"
    },
    "vendorCommissions": {
      "name": "vendorCommissions",
      "generatedAt": "2026-01-08T00:26:34.197Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\vendorCommissionsRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "database",
          "VendorHierarchyService"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/vendorCommissions/statistics/:vendorId",
          "file": "vendorCommissionsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/vendorCommissions/companies/:vendorId",
          "file": "vendorCommissionsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/vendorCommissions/subordinates/:vendorId",
          "file": "vendorCommissionsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/vendorCommissions/commission-summary/:vendorId",
          "file": "vendorCommissionsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/vendorCommissions/refresh-statistics/:vendorId",
          "file": "vendorCommissionsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/vendorCommissions/can-view-company/:vendorId/:companyId",
          "file": "vendorCommissionsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/vendorCommissions/stats",
          "file": "vendorCommissionsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/vendorCommissions/partners",
          "file": "vendorCommissionsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/vendorCommissions/quotes",
          "file": "vendorCommissionsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/vendorCommissions/contracts",
          "file": "vendorCommissionsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/vendorCommissions/invoices",
          "file": "vendorCommissionsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/vendorCommissions/payments",
          "file": "vendorCommissionsRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/vendorCommissions/commissions",
          "file": "vendorCommissionsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/vendorCommissions/quotes/:id/accept",
          "file": "vendorCommissionsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/vendorCommissions/quotes/:id/reject",
          "file": "vendorCommissionsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/vendorCommissions/quotes/:id/convert-to-contract",
          "file": "vendorCommissionsRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/vendorCommissions/invoices/generate-monthly",
          "file": "vendorCommissionsRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "commissions",
          "model": "Commission",
          "file": "Commission.js"
        },
        {
          "table": "vendor_commissions",
          "model": "VendorCommission",
          "file": "VendorCommission.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 713,
      "lastModified": "2025-12-16T13:34:18.864Z",
      "complexity": "complex"
    },
    "vendor": {
      "name": "vendor",
      "generatedAt": "2026-01-08T00:26:34.741Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\cron\\vendorCronJobs.js",
          "src\\models\\SupportVendorStats.js",
          "src\\models\\SupportVendorSupervisor.js",
          "src\\models\\VendorCommission.js",
          "src\\models\\VendorMemory.js",
          "src\\models\\VendorRating.js",
          "src\\models\\VendorReferral.js",
          "src\\models\\VendorStatistics.js",
          "src\\routes\\vendorAutomationRoutes.js",
          "src\\routes\\vendorCommissionsRoutes.js",
          "src\\routes\\vendorRoutes.js",
          "src\\services\\vendorAutomationService.js",
          "src\\services\\VendorHierarchyService.js",
          "src\\services\\vendorMetricsService.js",
          "src\\services\\vendorReferralService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "InvoiceGenerationService",
          "ScoringCalculationService",
          "ModuleTrialService"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/vendor/vendors-metrics",
          "file": "vendorRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/vendor/vendors-summary",
          "file": "vendorRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "support_vendor_stats",
          "model": "SupportVendorStats",
          "file": "SupportVendorStats.js"
        },
        {
          "table": "support_vendor_supervisors",
          "model": "SupportVendorSupervisor",
          "file": "SupportVendorSupervisor.js"
        },
        {
          "table": "vendor_commissions",
          "model": "VendorCommission",
          "file": "VendorCommission.js"
        },
        {
          "table": "vendormemorys",
          "model": "VendorMemory",
          "file": "VendorMemory.js",
          "inferred": true
        },
        {
          "table": "vendor_ratings",
          "model": "VendorRating",
          "file": "VendorRating.js"
        },
        {
          "table": "vendor_referrals",
          "model": "VendorReferral",
          "file": "VendorReferral.js"
        },
        {
          "table": "vendor_statistics",
          "model": "VendorStatistics",
          "file": "VendorStatistics.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 5339,
      "lastModified": "2025-12-16T13:34:18.984Z",
      "complexity": "complex"
    },
    "visitor": {
      "name": "visitor",
      "generatedAt": "2026-01-08T00:26:35.274Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\models\\Visitor-postgresql.js",
          "src\\models\\VisitorGpsTracking-postgresql.js",
          "src\\routes\\visitorRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/visitor/",
          "file": "visitorRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/visitor/:id",
          "file": "visitorRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/visitor/",
          "file": "visitorRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/visitor/:id/authorize",
          "file": "visitorRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/visitor/:id/check-in",
          "file": "visitorRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/visitor/:id/check-out",
          "file": "visitorRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/visitor/:id/gps-history",
          "file": "visitorRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/visitor/:id/gps-tracking",
          "file": "visitorRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/visitor/:id",
          "file": "visitorRoutes.js"
        }
      ],
      "databaseTables": [
        {
          "table": "visitors",
          "model": "Visitor-postgresql",
          "file": "Visitor-postgresql.js"
        },
        {
          "table": "visitor_gps_tracking",
          "model": "VisitorGpsTracking-postgresql",
          "file": "VisitorGpsTracking-postgresql.js"
        }
      ],
      "progress": 75,
      "uxTestResults": null,
      "linesOfCode": 1609,
      "lastModified": "2026-01-04T02:13:03.263Z",
      "complexity": "complex"
    },
    "voicePlatform": {
      "name": "voicePlatform",
      "generatedAt": "2026-01-08T00:26:35.847Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\voicePlatformRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "auth",
          "VoiceDeduplicationService",
          "VoiceGamificationService",
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "POST",
          "path": "/api/voicePlatform/experiences",
          "file": "voicePlatformRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/voicePlatform/experiences",
          "file": "voicePlatformRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/voicePlatform/experiences/:id",
          "file": "voicePlatformRoutes.js"
        },
        {
          "method": "PATCH",
          "path": "/api/voicePlatform/experiences/:id/status",
          "file": "voicePlatformRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/voicePlatform/experiences/my",
          "file": "voicePlatformRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/voicePlatform/experiences/:id/vote",
          "file": "voicePlatformRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/voicePlatform/experiences/:id/vote",
          "file": "voicePlatformRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/voicePlatform/experiences/:id/comments",
          "file": "voicePlatformRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/voicePlatform/experiences/:id/comments",
          "file": "voicePlatformRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/voicePlatform/gamification/leaderboard",
          "file": "voicePlatformRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/voicePlatform/gamification/my-stats",
          "file": "voicePlatformRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/voicePlatform/analytics/overview",
          "file": "voicePlatformRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/voicePlatform/analytics/sentiment-trends",
          "file": "voicePlatformRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/voicePlatform/clusters",
          "file": "voicePlatformRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/voicePlatform/clusters/:id",
          "file": "voicePlatformRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/voicePlatform/news",
          "file": "voicePlatformRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/voicePlatform/news/:id",
          "file": "voicePlatformRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 880,
      "lastModified": "2026-01-04T02:13:03.263Z",
      "complexity": "complex"
    },
    "warehouse": {
      "name": "warehouse",
      "generatedAt": "2026-01-08T00:26:36.366Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\warehouseRoutes.js",
          "src\\services\\logistics\\WarehouseService.js",
          "src\\services\\WarehouseService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "auth",
          "WarehouseService",
          "WMSAuthorizationService",
          "WMSDocumentService",
          "WMSRecallService",
          "WMSTransferService",
          "WMSExpiryMonitorService",
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/warehouse/branches",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/branches",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/warehouse/branches/:id",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/warehouse/branches/:id",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/warehouses",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/warehouses",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/warehouse/warehouses/:id",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/warehouse/warehouses/:id",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/categories",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/categories",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/warehouse/categories/:id",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/warehouse/categories/:id",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/brands",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/brands",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/warehouse/brands/:id",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/warehouse/brands/:id",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/suppliers",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/suppliers",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/warehouse/suppliers/:id",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/warehouse/suppliers/:id",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/products",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/products/:id",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/products",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/warehouse/products/:id",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/warehouse/products/:id",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/products/barcode/:barcode",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/products/:productId/barcodes",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/products/:productId/barcodes",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/warehouse/products/:productId/barcodes/:barcodeId",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/price-lists",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/price-lists/:id",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/price-lists",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/warehouse/price-lists/:id",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/warehouse/price-lists/:id",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/price-lists/:id/sync-mirror",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/products/:productId/prices",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/products/:productId/prices",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/price-lists/:listId/bulk-update",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/promotions",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/promotions/:id",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/promotions",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/warehouse/promotions/:id",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "DELETE",
          "path": "/api/warehouse/promotions/:id",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/promotions/calculate",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/products/:productId/stock",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/warehouses/:warehouseId/stock",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/stock/movement",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/stock/movements",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/stock/alerts",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/stock/expiry-alerts",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/products/:productId/batches",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/batches",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/warehouses/:warehouseId/zones",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/warehouses/:warehouseId/zones",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/zones/:zoneId/locations",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/zones/:zoneId/locations",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/locations/:locationId/assign",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/warehouses/:warehouseId/planogram",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/fiscal-templates",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/fiscal-templates/:id",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/currencies",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/currencies/exchange-rate",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/barcode-config",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "PUT",
          "path": "/api/warehouse/barcode-config",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/barcode/parse",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/reports/stock-valuation",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/export/products",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/import/products",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/dashboard/stats",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/transfers",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/transfers/:id",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/transfers",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/transfers/:id/approve",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/transfers/:id/ignore-fifo",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/transfers/:id/dispatch",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/transfers/:id/receive",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/transfers/:id/confirm",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/transfers/:id/cancel",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/stock/batches/:productId/:warehouseId",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/stock/availability/:warehouseId",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/expiry/alerts",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/expiry/alerts/:id/acknowledge",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/expiry/alerts/:id/resolve",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/expiry/report",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/traceability/:productId",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/sales/fifo",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/returns",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/expiry/check",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/authorizations",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/authorizations/pending",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/authorizations/can-approve",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/authorizations/:id/approve",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/authorizations/:id/reject",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/authorizations/:id/escalate",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/authorizations/:id/history",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/signatures/verify/:entityType/:entityId",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/authorizations/delegations",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/authorizations/delegations/:id/revoke",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/documents/types",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/documents",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/documents/link",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/documents/entity/:entityType/:entityId",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/documents/expiring",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/documents/search",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/documents/:id/version",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/documents/:id/archive",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/recalls",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/recalls",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/recalls/:id",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/recalls/:id/status",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/recalls/tracking/:trackingId/recover",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/recalls/:id/analysis",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/manager-dashboard/:warehouseId",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/material-requests",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/material-requests",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/material-requests/:id",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/material-requests/:id/approve",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/material-requests/:id/convert",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/material-requests/check-availability",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/warehouses/:id/staff",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/warehouses/:id/staff",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/material-requests/:id/generate-purchase-request",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/products/:id/pending-purchases",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/warehouse/warehouses/:id/reorder-alerts",
          "file": "warehouseRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/warehouse/warehouses/:id/auto-reorder",
          "file": "warehouseRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 6209,
      "lastModified": "2026-01-04T21:58:11.335Z",
      "complexity": "complex"
    },
    "workArrangement": {
      "name": "workArrangement",
      "generatedAt": "2026-01-08T00:26:36.939Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\workArrangementRoutes.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "auth",
          "database"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/workArrangement/types",
          "file": "workArrangementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/workArrangement/policies/:companyId",
          "file": "workArrangementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/workArrangement/policies",
          "file": "workArrangementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/workArrangement/users/:userId",
          "file": "workArrangementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/workArrangement/company/:companyId/users",
          "file": "workArrangementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/workArrangement/users/:userId/assign",
          "file": "workArrangementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/workArrangement/users/bulk-assign",
          "file": "workArrangementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/workArrangement/consents/:userId",
          "file": "workArrangementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/workArrangement/consents",
          "file": "workArrangementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/workArrangement/consents/:consentId/revoke",
          "file": "workArrangementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/workArrangement/presence/detect",
          "file": "workArrangementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/workArrangement/presence/:userId/today",
          "file": "workArrangementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/workArrangement/violations/:companyId",
          "file": "workArrangementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/workArrangement/violations/:violationId/justify",
          "file": "workArrangementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/workArrangement/contingency/:companyId",
          "file": "workArrangementRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/workArrangement/contingency/:planId/activate",
          "file": "workArrangementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/workArrangement/dashboard/:companyId",
          "file": "workArrangementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/workArrangement/history/:userId",
          "file": "workArrangementRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/workArrangement/check-remote/:userId/:date",
          "file": "workArrangementRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 996,
      "lastModified": "2026-01-04T02:13:03.265Z",
      "complexity": "complex"
    },
    "workflowIntrospection": {
      "name": "workflowIntrospection",
      "generatedAt": "2026-01-08T00:26:37.467Z",
      "source": "live-introspection",
      "files": {
        "backend": [
          "src\\routes\\workflowIntrospectionRoutes.js",
          "src\\services\\WorkflowIntrospectionService.js"
        ],
        "frontend": []
      },
      "dependencies": {
        "required": [
          "WorkflowIntrospectionService"
        ],
        "optional": [],
        "integrates_with": [],
        "provides_to": []
      },
      "apiEndpoints": [
        {
          "method": "GET",
          "path": "/api/workflowIntrospection/scan",
          "file": "workflowIntrospectionRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/workflowIntrospection/module/:moduleId",
          "file": "workflowIntrospectionRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/workflowIntrospection/module/:moduleId/action/:action",
          "file": "workflowIntrospectionRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/workflowIntrospection/tutorials",
          "file": "workflowIntrospectionRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/workflowIntrospection/tutorials/:moduleId",
          "file": "workflowIntrospectionRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/workflowIntrospection/search",
          "file": "workflowIntrospectionRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/workflowIntrospection/assistant-context/:moduleId",
          "file": "workflowIntrospectionRoutes.js"
        },
        {
          "method": "POST",
          "path": "/api/workflowIntrospection/help",
          "file": "workflowIntrospectionRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/workflowIntrospection/stats",
          "file": "workflowIntrospectionRoutes.js"
        },
        {
          "method": "GET",
          "path": "/api/workflowIntrospection/coverage",
          "file": "workflowIntrospectionRoutes.js"
        }
      ],
      "databaseTables": [],
      "progress": 50,
      "uxTestResults": null,
      "linesOfCode": 1577,
      "lastModified": "2025-12-18T15:40:23.396Z",
      "complexity": "complex"
    }
  },
  "stats": {
    "totalModules": 215,
    "averageProgress": 61,
    "totalLinesOfCode": 484846,
    "totalEndpoints": 2855,
    "totalTables": 324,
    "modulesByComplexity": {
      "simple": 9,
      "moderate": 42,
      "complex": 164
    }
  }
};

// Agregar timestamp de generación
engineeringMetadata.generated_at = '2026-01-08T00:26:38.142Z';
engineeringMetadata.auto_generated = true;
engineeringMetadata.update_count = 1206;

module.exports = engineeringMetadata;
