/**
 * ========================================================================
 * MODELO: ART Incident (Incidente Laboral)
 * ========================================================================
 * Modelo para registro de incidentes/accidentes laborales que deben
 * reportarse a la ART (Aseguradora de Riesgos del Trabajo) en Argentina
 *
 * Normativa: Ley 24.557 - Riesgos del Trabajo
 * Autoridad: SRT (Superintendencia de Riesgos del Trabajo)
 *
 * @version 1.0.0
 * ========================================================================
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ArtIncident = sequelize.define('ArtIncident', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    // ====================================================================
    // INFORMACIÓN BÁSICA
    // ====================================================================

    incident_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: 'Número único de incidente (formato: ART-{company_id}-{seq}-{year})'
    },

    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'companies',
        key: 'id'
      },
      comment: 'Empresa donde ocurrió el incidente'
    },

    employee_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      },
      comment: 'Empleado afectado'
    },

    reported_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      },
      comment: 'Usuario que reportó el incidente'
    },

    // ====================================================================
    // CLASIFICACIÓN DEL INCIDENTE
    // ====================================================================

    incident_type: {
      type: DataTypes.ENUM(
        'accident',              // Accidente de trabajo
        'in_itinere',            // Accidente in itinere (camino al trabajo)
        'occupational_disease',  // Enfermedad profesional
        'near_miss',             // Casi accidente
        'unsafe_condition',      // Condición insegura
        'unsafe_act'             // Acto inseguro
      ),
      allowNull: false,
      comment: 'Tipo de incidente según normativa argentina'
    },

    severity: {
      type: DataTypes.ENUM(
        'fatal',       // Fatal
        'serious',     // Grave (hospitalización, amputación)
        'moderate',    // Moderado (requiere atención médica)
        'minor',       // Leve (primeros auxilios)
        'no_injury'    // Sin lesión (casi accidente)
      ),
      allowNull: false,
      comment: 'Severidad del incidente'
    },

    requires_art_notification: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Si requiere notificación a la ART'
    },

    requires_srt_notification: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Si requiere notificación a la SRT (casos graves/fatales)'
    },

    // ====================================================================
    // DETALLES DEL INCIDENTE
    // ====================================================================

    incident_date: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Fecha y hora del incidente'
    },

    location: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: 'Ubicación donde ocurrió (departamento, área, dirección)'
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Descripción detallada del incidente'
    },

    immediate_cause: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Causa inmediata del incidente'
    },

    root_cause: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Causa raíz del incidente (análisis posterior)'
    },

    // ====================================================================
    // LESIONES Y ATENCIÓN MÉDICA
    // ====================================================================

    injury_type: {
      type: DataTypes.ENUM(
        'none',
        'contusion',          // Contusión
        'cut',                // Corte
        'fracture',           // Fractura
        'burn',               // Quemadura
        'sprain',             // Esguince
        'amputation',         // Amputación
        'intoxication',       // Intoxicación
        'respiratory',        // Problema respiratorio
        'multiple',           // Múltiples lesiones
        'other'
      ),
      defaultValue: 'none',
      comment: 'Tipo de lesión'
    },

    body_part_affected: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: 'Parte(s) del cuerpo afectada(s)'
    },

    medical_attention_required: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Si requirió atención médica'
    },

    medical_facility: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: 'Centro médico donde fue atendido'
    },

    medical_record_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'medical_records',
        key: 'id'
      },
      comment: 'Ficha médica asociada'
    },

    hospitalization_required: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Si requirió hospitalización'
    },

    days_off_work: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Días de baja laboral'
    },

    // ====================================================================
    // REPORTES Y NOTIFICACIONES
    // ====================================================================

    art_notified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Si se notificó a la ART'
    },

    art_notification_date: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha de notificación a la ART'
    },

    art_case_number: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Número de caso asignado por la ART'
    },

    srt_notified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Si se notificó a la SRT'
    },

    srt_notification_date: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha de notificación a la SRT'
    },

    srt_case_number: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Número de caso asignado por la SRT'
    },

    // ====================================================================
    // INVESTIGACIÓN
    // ====================================================================

    investigation_status: {
      type: DataTypes.ENUM(
        'pending',         // Pendiente
        'in_progress',     // En investigación
        'completed',       // Completada
        'closed'           // Cerrada
      ),
      defaultValue: 'pending',
      comment: 'Estado de la investigación'
    },

    investigation_assigned_to: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      },
      comment: 'Responsable de la investigación'
    },

    investigation_findings: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Hallazgos de la investigación'
    },

    corrective_actions: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: 'Acciones correctivas tomadas/planificadas'
    },

    preventive_actions: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: 'Acciones preventivas implementadas'
    },

    // ====================================================================
    // TESTIGOS Y EVIDENCIA
    // ====================================================================

    witnesses: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: 'Lista de testigos del incidente'
    },

    photos: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: 'URLs de fotos de evidencia'
    },

    documents: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: 'URLs de documentos relacionados'
    },

    // ====================================================================
    // COSTOS
    // ====================================================================

    estimated_cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Costo estimado del incidente (ARS)'
    },

    actual_cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Costo real del incidente (ARS)'
    },

    cost_breakdown: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Desglose de costos (médico, equipo dañado, productividad, etc.)'
    },

    // ====================================================================
    // WORKFLOW
    // ====================================================================

    status: {
      type: DataTypes.ENUM(
        'draft',           // Borrador
        'reported',        // Reportado
        'under_review',    // En revisión
        'art_pending',     // Pendiente respuesta ART
        'in_treatment',    // En tratamiento
        'resolved',        // Resuelto
        'closed'           // Cerrado
      ),
      defaultValue: 'draft',
      comment: 'Estado del incidente'
    },

    closed_date: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha de cierre del caso'
    },

    closed_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      },
      comment: 'Usuario que cerró el caso'
    },

    // ====================================================================
    // METADATA
    // ====================================================================

    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Metadata adicional del incidente'
    },

    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notas adicionales'
    },

    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      comment: 'Fecha de creación del registro'
    },

    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      comment: 'Fecha de última actualización'
    }

  }, {
    tableName: 'art_incidents',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['incident_number'],
        unique: true
      },
      {
        fields: ['company_id']
      },
      {
        fields: ['employee_id']
      },
      {
        fields: ['incident_date']
      },
      {
        fields: ['incident_type']
      },
      {
        fields: ['severity']
      },
      {
        fields: ['status']
      },
      {
        fields: ['art_notified']
      },
      {
        fields: ['srt_notified']
      },
      {
        fields: ['investigation_status']
      }
    ]
  });

  // ====================================================================
  // ASOCIACIONES
  // ====================================================================
  ArtIncident.associate = (models) => {
    // Empresa
    ArtIncident.belongsTo(models.Company, {
      foreignKey: 'company_id',
      as: 'company'
    });

    // Empleado afectado
    ArtIncident.belongsTo(models.User, {
      foreignKey: 'employee_id',
      as: 'employee'
    });

    // Reportado por
    ArtIncident.belongsTo(models.User, {
      foreignKey: 'reported_by',
      as: 'reporter'
    });

    // Investigador
    ArtIncident.belongsTo(models.User, {
      foreignKey: 'investigation_assigned_to',
      as: 'investigator'
    });

    // Cerrado por
    ArtIncident.belongsTo(models.User, {
      foreignKey: 'closed_by',
      as: 'closer'
    });

    // Ficha médica asociada
    if (models.MedicalRecord) {
      ArtIncident.belongsTo(models.MedicalRecord, {
        foreignKey: 'medical_record_id',
        as: 'medical_record'
      });
    }
  };

  return ArtIncident;
};
