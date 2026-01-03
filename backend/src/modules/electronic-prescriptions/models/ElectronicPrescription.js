/**
 * ElectronicPrescription Model
 *
 * Recetas electrónicas con normativas multi-país:
 * - Argentina: Resolución 1560/2011 (ANMAT)
 * - Brasil: Portaria 344/1998 (ANVISA)
 * - México: NOM-072-SSA1-2012 (COFEPRIS)
 * - USA: e-Prescribing (DEA)
 *
 * @version 1.0.0
 */

module.exports = (sequelize, DataTypes) => {
  const ElectronicPrescription = sequelize.define('ElectronicPrescription', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    // Relaciones
    employee_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },

    doctor_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'partners', // Médico del marketplace
        key: 'id'
      }
    },

    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'companies',
        key: 'id'
      }
    },

    medical_case_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'medical_cases',
        key: 'id'
      }
    },

    // Información del medicamento
    medication_name: {
      type: DataTypes.STRING,
      allowNull: false
    },

    medication_type: {
      type: DataTypes.ENUM('brand', 'generic'),
      defaultValue: 'generic'
    },

    active_ingredient: {
      type: DataTypes.STRING,
      allowNull: true
    },

    dosage: {
      type: DataTypes.STRING,
      allowNull: false
    },

    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    duration_days: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    instructions: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    // Clasificación
    is_controlled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },

    control_level: {
      type: DataTypes.ENUM('none', 'level_1', 'level_2', 'level_3', 'level_4', 'level_5'),
      defaultValue: 'none',
      comment: 'Argentina: Lista I-V, Brasil: Portaria 344, USA: DEA Schedule'
    },

    // Normativa por país
    country: {
      type: DataTypes.STRING(2),
      allowNull: false,
      comment: 'AR, BR, MX, US, etc.'
    },

    regulation: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Resolución/Portaria/NOM aplicable'
    },

    // Número de receta (formato país)
    prescription_number: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },

    // Firma digital
    digital_signature: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Hash de firma digital (AFIP, ICP-Brasil, FIEL)'
    },

    signature_type: {
      type: DataTypes.ENUM('afip', 'icp_brasil', 'fiel_mexico', 'dea_usa', 'none'),
      defaultValue: 'none'
    },

    signature_timestamp: {
      type: DataTypes.DATE,
      allowNull: true
    },

    // QR Code y Barcode
    qr_code: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'QR Code data URL (base64)'
    },

    barcode: {
      type: DataTypes.STRING,
      allowNull: true
    },

    // Validez
    valid_from: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },

    valid_until: {
      type: DataTypes.DATE,
      allowNull: false
    },

    // Estado
    status: {
      type: DataTypes.ENUM('pending', 'signed', 'dispensed', 'expired', 'cancelled'),
      defaultValue: 'pending'
    },

    // Específicos por país

    // Argentina: ANMAT
    anmat_registration: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Registro en ANMAT para medicamentos controlados'
    },

    // Brasil: ANVISA
    anvisa_registration: {
      type: DataTypes.STRING,
      allowNull: true
    },

    notification_b: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Requiere Notificação de Receita B (Brasil)'
    },

    // México: COFEPRIS
    cofepris_registration: {
      type: DataTypes.STRING,
      allowNull: true
    },

    // USA: DEA
    dea_number: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'DEA number del médico (USA controlled substances)'
    },

    // Farmacia que dispensó
    pharmacy_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID de farmacia que dispensó la receta'
    },

    dispensed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },

    dispensed_by: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Nombre del farmacéutico'
    },

    // Metadata
    pdf_url: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'URL del PDF almacenado en DMS'
    },

    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Metadata adicional específica del país'
    },

    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },

    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'electronic_prescriptions',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',

    indexes: [
      {
        fields: ['employee_id']
      },
      {
        fields: ['doctor_id']
      },
      {
        fields: ['company_id']
      },
      {
        fields: ['prescription_number'],
        unique: true
      },
      {
        fields: ['status']
      },
      {
        fields: ['country']
      },
      {
        fields: ['valid_until']
      },
      {
        fields: ['is_controlled']
      }
    ]
  });

  ElectronicPrescription.associate = (models) => {
    ElectronicPrescription.belongsTo(models.User, {
      foreignKey: 'employee_id',
      as: 'employee'
    });

    ElectronicPrescription.belongsTo(models.Partner, {
      foreignKey: 'doctor_id',
      as: 'doctor'
    });

    ElectronicPrescription.belongsTo(models.Company, {
      foreignKey: 'company_id',
      as: 'company'
    });

    if (models.MedicalCase) {
      ElectronicPrescription.belongsTo(models.MedicalCase, {
        foreignKey: 'medical_case_id',
        as: 'medicalCase'
      });
    }
  };

  return ElectronicPrescription;
};
