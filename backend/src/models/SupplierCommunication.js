const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SupplierCommunication = sequelize.define('SupplierCommunication', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    // MULTI-TENANT
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'companies',
        key: 'company_id'
      }
    },
    supplier_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'wms_suppliers',
        key: 'supplier_id'
      }
    },

    // CONTEXTO
    context_type: {
      type: DataTypes.ENUM('rfq', 'purchase_order', 'invoice', 'claim', 'general'),
      allowNull: false
    },
    context_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },

    // MENSAJE
    message_type: {
      type: DataTypes.ENUM('notification', 'message', 'alert', 'reminder'),
      allowNull: false
    },
    subject: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },

    // REMITENTE
    sender_type: {
      type: DataTypes.ENUM('company', 'supplier'),
      allowNull: false
    },
    sender_user_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    sender_name: {
      type: DataTypes.STRING(100),
      allowNull: true
    },

    // DESTINATARIO
    recipient_type: {
      type: DataTypes.ENUM('company', 'supplier'),
      allowNull: false
    },

    // ESTADO
    is_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    read_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    priority: {
      type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
      defaultValue: 'normal'
    },

    // ADJUNTOS
    has_attachments: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    attachments_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },

    // METADATA
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },

    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'supplier_communications',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['company_id'] },
      { fields: ['supplier_id'] },
      { fields: ['context_type', 'context_id'] },
      { fields: ['is_read', 'recipient_type'] },
      { fields: ['created_at'] },
      { fields: ['company_id', 'supplier_id', 'is_read', 'created_at'] }
    ]
  });

  // Métodos de instancia
  SupplierCommunication.prototype.markAsRead = async function() {
    this.is_read = true;
    this.read_at = new Date();
    await this.save();
    return this;
  };

  // Métodos estáticos
  SupplierCommunication.getUnreadCount = async function(supplierId) {
    return await this.count({
      where: {
        supplier_id: supplierId,
        recipient_type: 'supplier',
        is_read: false
      }
    });
  };

  SupplierCommunication.getUnreadForSupplier = async function(supplierId, limit = 10) {
    return await this.findAll({
      where: {
        supplier_id: supplierId,
        recipient_type: 'supplier',
        is_read: false
      },
      order: [
        [sequelize.literal(`CASE priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'normal' THEN 3
          WHEN 'low' THEN 4
        END`)],
        ['created_at', 'DESC']
      ],
      limit
    });
  };

  SupplierCommunication.getConversation = async function(companyId, supplierId, contextType = null, contextId = null) {
    const where = {
      company_id: companyId,
      supplier_id: supplierId
    };

    if (contextType && contextId) {
      where.context_type = contextType;
      where.context_id = contextId;
    }

    return await this.findAll({
      where,
      order: [['created_at', 'ASC']],
      include: ['attachments']
    });
  };

  return SupplierCommunication;
};
