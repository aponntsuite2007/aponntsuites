const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserWorkHistory = sequelize.define('UserWorkHistory', {
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
    company_name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    position: {
        type: DataTypes.STRING(255),
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
    currently_working: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    reason_for_leaving: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    responsibilities: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    supervisor_name: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    supervisor_contact: {
        type: DataTypes.STRING(100),
        allowNull: true
    }
    // ============================================================================
    // CAMPOS ADICIONALES COMENTADOS (no existen en la tabla actual)
    // Descomentar cuando se ejecute la migración correspondiente
    // ============================================================================
    /* DESACTIVADO TEMPORALMENTE
    // CAMPOS DE DESVINCULACIÓN DETALLADA
    // ============================================================================
    termination_type: {
        type: DataTypes.ENUM(
            'renuncia_voluntaria',
            'despido_con_causa',
            'despido_sin_causa',
            'jubilacion',
            'mutual_agreement',
            'fin_contrato',
            'abandono',
            'fallecimiento',
            'otro'
        ),
        allowNull: true
    },
    termination_subcategory: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    termination_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    notice_period_days: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    notice_period_completed: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    notice_period_notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    // ============================================================================
    // INFORMACIÓN DE INDEMNIZACIÓN / LIQUIDACIÓN
    // ============================================================================
    received_severance: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    severance_amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true
    },
    severance_currency: {
        type: DataTypes.STRING(10),
        defaultValue: 'ARS'
    },
    severance_payment_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    severance_payment_method: {
        type: DataTypes.ENUM('transferencia', 'cheque', 'efectivo', 'compensacion', 'otro'),
        allowNull: true
    },
    severance_breakdown: {
        type: DataTypes.JSON,
        allowNull: true
    },
    severance_receipt_url: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    // ============================================================================
    // ACUERDOS EXTRAJUDICIALES
    // ============================================================================
    has_settlement_agreement: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    settlement_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    settlement_type: {
        type: DataTypes.ENUM('conciliatorio', 'transaccional', 'homologacion_ministerial', 'privado', 'otro'),
        allowNull: true
    },
    settlement_amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true
    },
    settlement_terms: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    settlement_document_url: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    settlement_authority: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    settlement_file_number: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    // ============================================================================
    // INFORMACIÓN DE LITIGIOS
    // ============================================================================
    has_litigation: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    litigation_status: {
        type: DataTypes.ENUM(
            'en_tramite',
            'mediacion',
            'conciliacion',
            'sentencia_favorable',
            'sentencia_desfavorable',
            'apelacion',
            'finalizado',
            'desistido'
        ),
        allowNull: true
    },
    litigation_start_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    litigation_end_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    litigation_court: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    litigation_case_number: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    litigation_subject: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    litigation_claimed_amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true
    },
    litigation_awarded_amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true
    },
    litigation_outcome_summary: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    company_legal_representative: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    employee_legal_representative: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    // ============================================================================
    // DOCUMENTACIÓN Y EVIDENCIA
    // ============================================================================
    termination_letter_url: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    work_certificate_url: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    salary_certification_url: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    additional_documents: {
        type: DataTypes.JSON,
        allowNull: true
    },
    // ============================================================================
    // NOTAS Y SEGUIMIENTO INTERNO
    // ============================================================================
    internal_notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    eligible_for_rehire: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    rehire_ineligibility_reason: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    recommendation_letter_sent: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    recommendation_letter_url: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    last_updated_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
            key: 'user_id'
        }
    }
    */ // FIN DESACTIVADO TEMPORALMENTE
    // Timestamps - estos SÍ existen en la tabla
    // (no se definen aquí porque timestamps: false más abajo)
}, {
    tableName: 'user_work_history',
    timestamps: false
});

module.exports = UserWorkHistory;
