const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Kiosk = sequelize.define('Kiosk', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: ''
    },
    location: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Ubicación física descriptiva del kiosko (ej: Nave norte sobre calle Leguizamón)'
    },
    device_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
      comment: 'Identificador único del dispositivo kiosko (MAC, serial, etc.)'
    },
    gps_lat: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
      validate: {
        min: -90,
        max: 90
      }
    },
    gps_lng: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
      validate: {
        min: -180,
        max: 180
      }
    },
    is_configured: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Indica si el kiosko ya fue configurado con GPS y nombre'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    // CAMPO MULTI-TENANT
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'companies',
        key: 'id'
      }
    }
  }, {
    tableName: 'kiosks',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true, // Para soft delete
    deletedAt: 'deleted_at',
    indexes: [
      {
        unique: true,
        fields: ['name', 'company_id'],
        where: {
          deleted_at: null
        },
        name: 'kiosks_unique_name_per_company'
      },
      {
        unique: true,
        fields: ['device_id'],
        where: {
          deleted_at: null,
          device_id: {
            [sequelize.Sequelize.Op.ne]: null
          }
        },
        name: 'kiosks_unique_device_id'
      },
      {
        unique: true,
        fields: ['gps_lat', 'gps_lng', 'company_id'],
        where: {
          deleted_at: null,
          gps_lat: {
            [sequelize.Sequelize.Op.ne]: null
          },
          gps_lng: {
            [sequelize.Sequelize.Op.ne]: null
          }
        },
        name: 'kiosks_unique_gps_per_company'
      },
      {
        fields: ['is_active']
      },
      {
        fields: ['is_configured']
      },
      {
        fields: ['company_id']
      }
    ]
  });

  // Método para obtener ubicación GPS como objeto
  Kiosk.prototype.getGpsLocation = function() {
    if (this.gps_lat && this.gps_lng) {
      return {
        lat: parseFloat(this.gps_lat),
        lng: parseFloat(this.gps_lng)
      };
    }
    return { lat: null, lng: null };
  };

  // Método para verificar si está configurado
  Kiosk.prototype.isFullyConfigured = function() {
    return this.name && this.gps_lat && this.gps_lng && this.is_configured;
  };

  // Método auxiliar para convertir grados a radianes
  Kiosk.prototype.toRad = function(deg) {
    return deg * (Math.PI/180);
  };

  // Método para calcular distancia a otra coordenada GPS (Haversine)
  Kiosk.prototype.getDistanceToLocation = function(lat, lng) {
    if (!this.gps_lat || !this.gps_lng || !lat || !lng) {
      return null;
    }

    const R = 6371000; // Radio de la Tierra en metros
    const dLat = this.toRad(lat - this.gps_lat);
    const dLng = this.toRad(lng - this.gps_lng);
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRad(this.gps_lat)) * Math.cos(this.toRad(lat)) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distancia en metros

    return Math.round(distance);
  };

  // Hook para validar coordenadas GPS
  Kiosk.beforeSave((kiosk) => {
    // Si se proporciona una coordenada, ambas deben estar presentes
    if ((kiosk.gps_lat && !kiosk.gps_lng) || (!kiosk.gps_lat && kiosk.gps_lng)) {
      throw new Error('Ambas coordenadas GPS (latitud y longitud) deben ser proporcionadas juntas');
    }

    // Si tiene GPS y nombre, marcar como configurado
    if (kiosk.name && kiosk.gps_lat && kiosk.gps_lng && !kiosk.is_configured) {
      kiosk.is_configured = true;
    }
  });

  return Kiosk;
};
