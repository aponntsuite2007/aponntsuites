/**
 * GENERADOR DE MODELOS SEQUELIZE - SISTEMA DE PERFIL DE EMPLEADO
 * Crea todos los modelos necesarios para el modal 100% funcional
 */

const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'src', 'models');

// ============================================================================
// PLANTILLA BASE PARA MODELOS
// ============================================================================

const models = {
    // Grupo Familiar - Estado Civil
    UserMaritalStatus: {
        tableName: 'user_marital_status',
        fields: `
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: {
            model: 'users',
            key: 'user_id'
        }
    },
    company_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'companies',
            key: 'company_id'
        }
    },
    marital_status: {
        type: DataTypes.ENUM('soltero', 'casado', 'divorciado', 'viudo', 'union_libre'),
        allowNull: false
    },
    spouse_name: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    spouse_dni: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    spouse_phone: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    spouse_occupation: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    marriage_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }`
    },

    // Grupo Familiar - Hijos
    UserChildren: {
        tableName: 'user_children',
        fields: `
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'user_id'
        }
    },
    company_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'companies',
            key: 'company_id'
        }
    },
    full_name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    dni: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    birth_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    gender: {
        type: DataTypes.ENUM('masculino', 'femenino', 'otro'),
        allowNull: true
    },
    lives_with_employee: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    is_dependent: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    health_insurance_coverage: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    special_needs: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    school_name: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    grade_level: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }`
    },

    // Grupo Familiar - Otros Miembros
    UserFamilyMembers: {
        tableName: 'user_family_members',
        fields: `
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'user_id'
        }
    },
    company_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'companies',
            key: 'company_id'
        }
    },
    full_name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    relationship: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    dni: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    birth_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    phone: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    lives_with_employee: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    is_dependent: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    is_emergency_contact: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    health_insurance_coverage: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }`
    },

    // Educación
    UserEducation: {
        tableName: 'user_education',
        fields: `
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'user_id'
        }
    },
    company_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'companies',
            key: 'company_id'
        }
    },
    education_level: {
        type: DataTypes.ENUM('primaria', 'secundaria', 'terciaria', 'universitaria', 'posgrado', 'doctorado'),
        allowNull: false
    },
    institution_name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    degree_title: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    field_of_study: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    start_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    end_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    graduated: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    certificate_file_url: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }`
    },

    // Médico de Cabecera
    UserPrimaryPhysician: {
        tableName: 'user_primary_physician',
        fields: `
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: {
            model: 'users',
            key: 'user_id'
        }
    },
    company_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'companies',
            key: 'company_id'
        }
    },
    physician_name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    specialty: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    phone: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    clinic_name: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    clinic_address: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }`
    },

    // Enfermedades Crónicas
    UserChronicConditions: {
        tableName: 'user_chronic_conditions',
        fields: `
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'user_id'
        }
    },
    company_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'companies',
            key: 'company_id'
        }
    },
    condition_name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    diagnosis_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    severity: {
        type: DataTypes.ENUM('leve', 'moderada', 'grave'),
        allowNull: true
    },
    requires_treatment: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    requires_monitoring: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }`
    },

    // Medicamentos
    UserMedications: {
        tableName: 'user_medications',
        fields: `
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'user_id'
        }
    },
    company_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'companies',
            key: 'company_id'
        }
    },
    medication_name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    dosage: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    frequency: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    route: {
        type: DataTypes.ENUM('oral', 'inyectable', 'topico', 'inhalado', 'otro'),
        allowNull: true
    },
    start_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    end_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    is_continuous: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    prescribing_doctor: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    purpose: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }`
    },

    // Alergias
    UserAllergies: {
        tableName: 'user_allergies',
        fields: `
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'user_id'
        }
    },
    company_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'companies',
            key: 'company_id'
        }
    },
    allergen: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    allergy_type: {
        type: DataTypes.ENUM('medicamento', 'alimento', 'ambiental', 'insecto', 'contacto', 'otro'),
        allowNull: true
    },
    severity: {
        type: DataTypes.ENUM('leve', 'moderada', 'grave', 'anafilaxia'),
        allowNull: true
    },
    symptoms: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    diagnosed_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    requires_epipen: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }`
    },

    // Restricciones de Actividad
    UserActivityRestrictions: {
        tableName: 'user_activity_restrictions',
        fields: `
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'user_id'
        }
    },
    company_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'companies',
            key: 'company_id'
        }
    },
    restriction_type: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    start_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    end_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    is_permanent: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    medical_certificate_url: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    issuing_doctor: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }`
    },

    // Restricciones Laborales
    UserWorkRestrictions: {
        tableName: 'user_work_restrictions',
        fields: `
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'user_id'
        }
    },
    company_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'companies',
            key: 'company_id'
        }
    },
    restriction_type: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    start_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    end_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    is_permanent: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    medical_certificate_url: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    issuing_doctor: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    affects_current_role: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    accommodation_needed: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }`
    },

    // Vacunas
    UserVaccinations: {
        tableName: 'user_vaccinations',
        fields: `
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'user_id'
        }
    },
    company_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'companies',
            key: 'company_id'
        }
    },
    vaccine_name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    vaccine_type: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    dose_number: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    total_doses: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    date_administered: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    next_dose_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    administering_institution: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    lot_number: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    certificate_url: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }`
    },

    // Exámenes Médicos
    UserMedicalExams: {
        tableName: 'user_medical_exams',
        fields: `
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'user_id'
        }
    },
    company_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'companies',
            key: 'company_id'
        }
    },
    exam_type: {
        type: DataTypes.ENUM('preocupacional', 'periodico', 'reingreso', 'retiro', 'especial'),
        allowNull: false
    },
    exam_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    result: {
        type: DataTypes.ENUM('apto', 'apto_con_observaciones', 'no_apto', 'pendiente'),
        allowNull: true
    },
    observations: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    next_exam_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    medical_center: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    examining_doctor: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    certificate_url: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }`
    },

    // Documentos Médicos
    UserMedicalDocuments: {
        tableName: 'user_medical_documents',
        fields: `
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'user_id'
        }
    },
    company_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'companies',
            key: 'company_id'
        }
    },
    document_type: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    document_name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    file_url: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    upload_date: {
        type: DataTypes.DATEONLY,
        defaultValue: DataTypes.NOW
    },
    expiration_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }`
    },

    // Documentos Personales
    UserDocuments: {
        tableName: 'user_documents',
        fields: `
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'user_id'
        }
    },
    company_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'companies',
            key: 'company_id'
        }
    },
    document_type: {
        type: DataTypes.ENUM('dni', 'pasaporte', 'licencia_conducir', 'visa', 'certificado_antecedentes', 'otro'),
        allowNull: false
    },
    document_number: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    issue_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    expiration_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    issuing_authority: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    file_url: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    is_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }`
    },

    // Permisos y Ausencias
    UserPermissionRequests: {
        tableName: 'user_permission_requests',
        fields: `
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'user_id'
        }
    },
    company_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'companies',
            key: 'company_id'
        }
    },
    request_type: {
        type: DataTypes.ENUM('vacaciones', 'licencia_medica', 'permiso_personal', 'estudio', 'duelo', 'maternidad', 'paternidad', 'otro'),
        allowNull: false
    },
    start_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    end_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    total_days: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    reason: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('pendiente', 'aprobado', 'rechazado', 'cancelado'),
        defaultValue: 'pendiente'
    },
    requested_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    approved_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
            key: 'user_id'
        }
    },
    approval_date: {
        type: DataTypes.DATE,
        allowNull: true
    },
    rejection_reason: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    supporting_document_url: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }`
    },

    // Acciones Disciplinarias
    UserDisciplinaryActions: {
        tableName: 'user_disciplinary_actions',
        fields: `
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'user_id'
        }
    },
    company_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'companies',
            key: 'company_id'
        }
    },
    action_type: {
        type: DataTypes.ENUM('advertencia_verbal', 'advertencia_escrita', 'suspension', 'descuento', 'despido', 'otro'),
        allowNull: false
    },
    severity: {
        type: DataTypes.ENUM('leve', 'moderada', 'grave', 'muy_grave'),
        allowNull: true
    },
    date_occurred: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    action_taken: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    issued_by: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'user_id'
        }
    },
    issued_date: {
        type: DataTypes.DATEONLY,
        defaultValue: DataTypes.NOW
    },
    follow_up_required: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    follow_up_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    employee_acknowledgement: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    employee_comments: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    supporting_document_url: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }`
    }
};

// ============================================================================
// GENERAR ARCHIVOS
// ============================================================================

function generateModelFile(modelName, config) {
    const template = `const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ${modelName} = sequelize.define('${modelName}', {${config.fields}
}, {
    tableName: '${config.tableName}',
    timestamps: false
});

module.exports = ${modelName};
`;
    return template;
}

console.log('🔧 Generando modelos Sequelize para sistema de perfil de empleado...\n');

let count = 0;
for (const [modelName, config] of Object.entries(models)) {
    const filePath = path.join(modelsDir, `${modelName}.js`);
    const content = generateModelFile(modelName, config);

    fs.writeFileSync(filePath, content, 'utf-8');
    count++;
    console.log(`✅ ${count}. ${modelName}.js creado`);
}

console.log(`\n🎉 ${count} modelos creados exitosamente!`);
console.log('\n📌 Archivos creados en: src/models/\n');
