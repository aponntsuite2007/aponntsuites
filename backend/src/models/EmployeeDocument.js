/**
 * Modelo para documentación personal de empleados
 * Maneja DNI, pasaportes, visas, licencias de conducir, etc.
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EmployeeDocument = sequelize.define('EmployeeDocument', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    
    // Relación con empleado
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'ID del usuario/empleado'
    },
    
    // Tipo de documento
    documentType: {
      type: DataTypes.ENUM(
        'dni', 'passport', 'work_visa', 
        'national_license', 'international_license', 
        'professional_passenger', 'professional_cargo', 'professional_heavy'
      ),
      allowNull: false,
      comment: 'Tipo de documento'
    },
    
    // Información básica del documento
    documentNumber: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Número del documento'
    },
    
    issuingAuthority: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Autoridad emisora del documento'
    },
    
    issuingCountry: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'País emisor'
    },
    
    issueDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha de emisión'
    },
    
    expiryDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha de vencimiento'
    },
    
    // Información específica por tipo de documento
    documentData: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Datos específicos del documento (categorías de licencia, tipo de visa, etc.)'
    },
    
    // Archivos asociados
    frontPhotoPath: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Ruta del archivo de foto frontal'
    },
    
    backPhotoPath: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Ruta del archivo de foto trasera/segunda página'
    },
    
    additionalFiles: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Array de rutas de archivos adicionales'
    },
    
    // Estado del documento
    status: {
      type: DataTypes.ENUM('valid', 'expired', 'about_to_expire', 'pending_renewal'),
      defaultValue: 'valid',
      comment: 'Estado actual del documento'
    },
    
    // Alertas y notificaciones
    alertDays: {
      type: DataTypes.INTEGER,
      defaultValue: 30,
      comment: 'Días antes del vencimiento para alertar'
    },
    
    lastAlertSent: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Última vez que se envió una alerta'
    },
    
    // Notas y observaciones
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notas adicionales sobre el documento'
    },
    
    // Estado activo/inactivo
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Si el documento está activo'
    }
    
  }, {
    tableName: 'employee_documents',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
      {
        name: 'idx_employee_doc_user_type',
        fields: ['userId', 'documentType', 'isActive']
      },
      {
        name: 'idx_employee_doc_expiry',
        fields: ['expiryDate', 'status']
      },
      {
        name: 'idx_employee_doc_alerts',
        fields: ['expiryDate', 'alertDays', 'lastAlertSent']
      },
      {
        name: 'idx_employee_doc_number',
        fields: ['documentNumber', 'documentType']
      }
    ]
  });

  return EmployeeDocument;
};