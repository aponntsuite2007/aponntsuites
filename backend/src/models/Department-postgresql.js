const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Department = sequelize.define('Department', {
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
    address: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: ''
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
    coverage_radius: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 50,
      validate: {
        min: 10,
        max: 1000
      }
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
    tableName: 'departments',
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
        }
      },
      {
        fields: ['is_active']
      },
      {
        fields: ['gps_lat', 'gps_lng']
      },
      {
        fields: ['company_id']
      }
    ]
  });

  // Método para obtener ubicación GPS como objeto
  Department.prototype.getGpsLocation = function() {
    if (this.gps_lat && this.gps_lng) {
      return {
        lat: parseFloat(this.gps_lat),
        lng: parseFloat(this.gps_lng)
      };
    }
    return { lat: null, lng: null };
  };

  // Método para verificar si está dentro del radio de cobertura
  Department.prototype.isWithinCoverage = function(lat, lng) {
    if (!this.gps_lat || !this.gps_lng || !lat || !lng) {
      return false;
    }

    // Calcular distancia usando fórmula de Haversine
    const R = 6371000; // Radio de la Tierra en metros
    const dLat = this.toRad(lat - this.gps_lat);
    const dLng = this.toRad(lng - this.gps_lng);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRad(this.gps_lat)) * Math.cos(this.toRad(lat)) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distancia en metros

    return distance <= this.coverage_radius;
  };

  // Método auxiliar para convertir grados a radianes
  Department.prototype.toRad = function(deg) {
    return deg * (Math.PI/180);
  };

  // Hook para validar coordenadas GPS
  Department.beforeSave((department) => {
    // Si se proporciona una coordenada, ambas deben estar presentes
    if ((department.gps_lat && !department.gps_lng) || (!department.gps_lat && department.gps_lng)) {
      throw new Error('Ambas coordenadas GPS (latitud y longitud) deben ser proporcionadas juntas');
    }
  });

  return Department;
};