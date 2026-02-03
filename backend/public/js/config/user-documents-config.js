/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                    CONFIGURACIÓN DE DOCUMENTOS DE USUARIO                      ║
 * ║                                                                                ║
 * ║  ⚠️  CRÍTICO: NO MODIFICAR SIN LEER COMPLETAMENTE                             ║
 * ║                                                                                ║
 * ║  Este archivo define los valores válidos para las APIs de documentos.          ║
 * ║  Los valores están definidos por CHECK CONSTRAINTS en PostgreSQL.              ║
 * ║  Si usas valores incorrectos, la BD rechazará con Error 500.                  ║
 * ║                                                                                ║
 * ║  ÚLTIMA ACTUALIZACIÓN: 2026-02-03                                             ║
 * ║  VERIFICADO CON TEST E2E: test-final-100-corregido.e2e.spec.js                ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

const USER_DOCUMENTS_CONFIG = {

    // ═══════════════════════════════════════════════════════════════════════════
    // API: POST /api/v1/users/:userId/documents
    // Tabla: user_documents
    // Constraint: user_documents_document_type_check
    // ═══════════════════════════════════════════════════════════════════════════

    DOCUMENT_TYPES: {
        // ✅ VALORES VÁLIDOS - Definidos en BD PostgreSQL
        DNI: 'dni',                              // Documento Nacional de Identidad
        PASAPORTE: 'pasaporte',                  // ⚠️ NO usar 'passport' (inglés)
        LICENCIA_CONDUCIR: 'licencia_conducir',  // ⚠️ NO usar 'driver_license'
        VISA: 'visa',                            // ⚠️ NO usar 'work_visa'
        CERTIFICADO_ANTECEDENTES: 'certificado_antecedentes',
        OTRO: 'otro'                             // Para cualquier otro tipo

        // ❌ VALORES INVÁLIDOS - Causan Error 500:
        // 'passport'        → usar 'pasaporte'
        // 'driver_license'  → usar 'licencia_conducir'
        // 'work_visa'       → usar 'visa'
        // 'medical'         → usar 'otro'
        // 'medical_event'   → usar 'otro'
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // API: POST /api/v1/users/:userId/driver-licenses
    // Tabla: user_driver_licenses
    // ═══════════════════════════════════════════════════════════════════════════

    DRIVER_LICENSE_TYPES: {
        NACIONAL: 'nacional',
        INTERNACIONAL: 'internacional',
        PASAJEROS: 'pasajeros'
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // CAMPOS - Naming Convention por API
    // ═══════════════════════════════════════════════════════════════════════════

    FIELD_NAMING: {
        // user_documents API → snake_case
        USER_DOCUMENTS: {
            type: 'document_type',       // NO 'documentType'
            number: 'document_number',   // NO 'documentNumber'
            expiry: 'expiration_date',   // NO 'expiryDate'
            issue: 'issue_date',         // NO 'issueDate'
            authority: 'issuing_authority',
            notes: 'notes',
            verified: 'is_verified'
        },

        // driver_licenses API → camelCase
        DRIVER_LICENSES: {
            type: 'licenseType',
            number: 'licenseNumber',
            class: 'licenseClass',
            expiry: 'expiryDate',        // SÍ camelCase aquí
            authority: 'issuingAuthority'
        },

        // professional_licenses API → camelCase
        PROFESSIONAL_LICENSES: {
            name: 'licenseName',
            number: 'licenseNumber',
            body: 'issuingBody',
            expiry: 'expiryDate',        // SÍ camelCase aquí
            issue: 'issueDate'
        }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // UPLOAD API
    // ═══════════════════════════════════════════════════════════════════════════

    UPLOAD: {
        ENDPOINT: '/api/v1/upload/single',
        ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx'],

        // La respuesta tiene esta estructura:
        RESPONSE_STRUCTURE: {
            success: true,
            file: {
                filename: 'uuid-timestamp.ext',
                url: '/uploads/...'
            },
            dms: {
                documentId: 'uuid'  // ⚠️ NO es 'document_id' ni 'id'
            }
        }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // ENDPOINTS COMPLETOS
    // ═══════════════════════════════════════════════════════════════════════════

    ENDPOINTS: {
        DOCUMENTS: '/api/v1/users/{userId}/documents',
        DRIVER_LICENSES: '/api/v1/users/{userId}/driver-licenses',
        PROFESSIONAL_LICENSES: '/api/v1/users/{userId}/professional-licenses',
        UPLOAD: '/api/v1/upload/single',
        LOGIN: '/api/v1/auth/login'
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS - Usar estas en lugar de strings hardcodeados
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Obtiene el tipo de documento válido para la API
 * @param {string} friendlyName - Nombre amigable (ej: 'passport', 'dni')
 * @returns {string} - Valor válido para la BD
 */
function getValidDocumentType(friendlyName) {
    const mapping = {
        'dni': 'dni',
        'passport': 'pasaporte',
        'pasaporte': 'pasaporte',
        'driver_license': 'licencia_conducir',
        'licencia': 'licencia_conducir',
        'visa': 'visa',
        'work_visa': 'visa',
        'antecedentes': 'certificado_antecedentes',
        'medical': 'otro',
        'other': 'otro'
    };
    return mapping[friendlyName.toLowerCase()] || 'otro';
}

/**
 * Construye objeto de documento con campos correctos
 */
function buildDocumentPayload(data) {
    return {
        document_type: getValidDocumentType(data.type || data.documentType || 'otro'),
        document_number: data.number || data.documentNumber || null,
        expiration_date: data.expiry || data.expiryDate || data.expiration_date || null,
        issue_date: data.issue || data.issueDate || data.issue_date || null,
        issuing_authority: data.authority || data.issuingAuthority || data.issuing_authority || null,
        notes: data.notes || data.description || null
    };
}

/**
 * Extrae document ID de respuesta de upload
 */
function extractUploadDocumentId(uploadResponse) {
    return uploadResponse?.dms?.documentId ||
           uploadResponse?.file?.filename ||
           null;
}

// Exportar para uso en módulos
if (typeof window !== 'undefined') {
    window.USER_DOCUMENTS_CONFIG = USER_DOCUMENTS_CONFIG;
    window.getValidDocumentType = getValidDocumentType;
    window.buildDocumentPayload = buildDocumentPayload;
    window.extractUploadDocumentId = extractUploadDocumentId;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        USER_DOCUMENTS_CONFIG,
        getValidDocumentType,
        buildDocumentPayload,
        extractUploadDocumentId
    };
}

console.log('✅ [CONFIG] user-documents-config.js cargado - Tipos válidos:', Object.values(USER_DOCUMENTS_CONFIG.DOCUMENT_TYPES));
