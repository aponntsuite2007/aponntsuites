const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CommunicationLog = sequelize.define('CommunicationLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'ID del empleado que recibe la comunicación'
    },
    senderId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'ID del usuario que envía la comunicación (médico/admin)'
    },
    communicationType: {
      type: DataTypes.ENUM('sms', 'whatsapp', 'email', 'internal_message'),
      allowNull: false,
      comment: 'Tipo de comunicación fehaciente'
    },
    communicationChannel: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Canal específico (número de teléfono, email, etc.)'
    },
    subject: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Asunto/título de la comunicación'
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Contenido completo del mensaje'
    },
    relatedRequestId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'ID de la solicitud médica relacionada'
    },
    relatedRequestType: {
      type: DataTypes.ENUM('certificate', 'recipe', 'study', 'photo'),
      allowNull: true,
      comment: 'Tipo de solicitud relacionada'
    },
    status: {
      type: DataTypes.ENUM('sent', 'delivered', 'read', 'acknowledged', 'failed'),
      defaultValue: 'sent',
      comment: 'Estado de la comunicación'
    },
    deliveryConfirmation: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Datos de confirmación de entrega del proveedor'
    },
    readConfirmationDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha de confirmación de lectura por parte del empleado'
    },
    acknowledgmentDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha de acuse de recibo por parte del empleado'
    },
    complianceDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha de cumplimiento de la solicitud'
    },
    isLegallyValid: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Si la comunicación es legalmente válida como fehaciente'
    },
    legalValidityReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Justificación de validez legal o motivo de invalidez'
    }
  }, {
    tableName: 'communication_logs',
    indexes: [
      { fields: ['userId'] },
      { fields: ['senderId'] },
      { fields: ['relatedRequestId'] },
      { fields: ['status'] },
      { fields: ['communicationType'] },
      { fields: ['createdAt'] }
    ]
  });

  return CommunicationLog;
};