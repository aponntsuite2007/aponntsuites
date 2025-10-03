const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const VisitorGpsTracking = sequelize.define('VisitorGpsTracking', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    // Relación con visitante
    visitor_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'visitors',
        key: 'id'
      },
      comment: 'Visitante siendo rastreado'
    },

    // Coordenadas GPS
    gps_lat: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: false,
      validate: {
        min: -90,
        max: 90
      },
      comment: 'Latitud GPS del visitante'
    },
    gps_lng: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: false,
      validate: {
        min: -180,
        max: 180
      },
      comment: 'Longitud GPS del visitante'
    },

    // Precisión y calidad de señal
    accuracy: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true,
      comment: 'Precisión de la lectura GPS en metros'
    },
    altitude: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true,
      comment: 'Altitud en metros sobre el nivel del mar'
    },
    speed: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
      comment: 'Velocidad en metros por segundo'
    },

    // Estado del dispositivo GPS
    battery_level: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 100
      },
      comment: 'Nivel de batería del llavero GPS (0-100%)'
    },
    signal_strength: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 100
      },
      comment: 'Fuerza de señal GPS (0-100%)'
    },

    // Ubicación relativa a las instalaciones
    is_inside_facility: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      comment: 'TRUE si está dentro del perímetro de la empresa'
    },
    distance_from_facility: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Distancia en metros desde el centro de las instalaciones'
    },

    // Alertas y eventos
    alert_generated: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'TRUE si esta lectura generó una alerta de seguridad'
    },
    alert_type: {
      type: DataTypes.ENUM('outside_facility', 'low_battery', 'signal_lost', 'unauthorized_area', 'overstay'),
      allowNull: true,
      comment: 'Tipo de alerta generada si aplica'
    },
    alert_message: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Mensaje descriptivo de la alerta'
    },

    // Zona/área dentro de las instalaciones
    area_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID del área/zona donde se encuentra (futuro: tabla areas)'
    },
    area_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Nombre del área/zona donde se encuentra'
    },

    // Timestamp de captura
    tracked_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Fecha/hora de captura de esta lectura GPS'
    },

    // Metadata del dispositivo
    device_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'ID único del llavero GPS'
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
    tableName: 'visitor_gps_tracking',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false, // No necesitamos updated_at para datos de tracking
    indexes: [
      {
        fields: ['visitor_id', 'tracked_at']
      },
      {
        fields: ['company_id']
      },
      {
        fields: ['tracked_at']
      },
      {
        fields: ['is_inside_facility']
      },
      {
        fields: ['alert_generated']
      },
      {
        fields: ['device_id']
      },
      {
        fields: ['visitor_id', 'company_id']
      }
    ]
  });

  // Métodos de instancia

  /**
   * Obtener coordenadas GPS como objeto
   */
  VisitorGpsTracking.prototype.getGpsLocation = function() {
    return {
      lat: parseFloat(this.gps_lat),
      lng: parseFloat(this.gps_lng)
    };
  };

  /**
   * Verificar si la batería está baja (< 20%)
   */
  VisitorGpsTracking.prototype.hasLowBattery = function() {
    return this.battery_level !== null && this.battery_level < 20;
  };

  /**
   * Verificar si la señal es débil (< 30%)
   */
  VisitorGpsTracking.prototype.hasWeakSignal = function() {
    return this.signal_strength !== null && this.signal_strength < 30;
  };

  /**
   * Método auxiliar para convertir grados a radianes
   */
  VisitorGpsTracking.prototype.toRad = function(deg) {
    return deg * (Math.PI/180);
  };

  /**
   * Calcular distancia a una coordenada GPS (Haversine)
   */
  VisitorGpsTracking.prototype.getDistanceToLocation = function(lat, lng) {
    if (!lat || !lng) return null;

    const R = 6371000; // Radio de la Tierra en metros
    const dLat = this.toRad(lat - this.gps_lat);
    const dLng = this.toRad(lng - this.gps_lng);
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRad(this.gps_lat)) * Math.cos(this.toRad(lat)) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    return Math.round(distance);
  };

  /**
   * Determinar si está en movimiento (velocidad > 0.5 m/s)
   */
  VisitorGpsTracking.prototype.isMoving = function() {
    return this.speed !== null && this.speed > 0.5;
  };

  /**
   * Obtener edad de la lectura en segundos
   */
  VisitorGpsTracking.prototype.getAgeSeconds = function() {
    const now = new Date();
    const tracked = new Date(this.tracked_at);
    return Math.round((now - tracked) / 1000);
  };

  /**
   * Verificar si la lectura es reciente (< 5 minutos)
   */
  VisitorGpsTracking.prototype.isRecent = function() {
    return this.getAgeSeconds() < 300; // 5 minutos
  };

  // Métodos estáticos de clase

  /**
   * Obtener última ubicación de un visitante
   */
  VisitorGpsTracking.getLastLocation = async function(visitorId, companyId) {
    return await this.findOne({
      where: {
        visitor_id: visitorId,
        company_id: companyId
      },
      order: [['tracked_at', 'DESC']]
    });
  };

  /**
   * Obtener historial de ubicaciones de un visitante
   */
  VisitorGpsTracking.getLocationHistory = async function(visitorId, companyId, limit = 100) {
    return await this.findAll({
      where: {
        visitor_id: visitorId,
        company_id: companyId
      },
      order: [['tracked_at', 'DESC']],
      limit: limit
    });
  };

  /**
   * Obtener visitantes actualmente fuera del perímetro
   */
  VisitorGpsTracking.getVisitorsOutsideFacility = async function(companyId) {
    return await this.findAll({
      where: {
        company_id: companyId,
        is_inside_facility: false
      },
      order: [['tracked_at', 'DESC']],
      // Obtener solo la última lectura de cada visitante
      distinct: true,
      include: [{
        model: sequelize.models.Visitor,
        as: 'visitor',
        required: true
      }]
    });
  };

  /**
   * Obtener alertas generadas en las últimas N horas
   */
  VisitorGpsTracking.getRecentAlerts = async function(companyId, hours = 24) {
    const since = new Date();
    since.setHours(since.getHours() - hours);

    return await this.findAll({
      where: {
        company_id: companyId,
        alert_generated: true,
        tracked_at: {
          [sequelize.Sequelize.Op.gte]: since
        }
      },
      order: [['tracked_at', 'DESC']]
    });
  };

  // Hooks

  /**
   * Antes de crear, validar y generar alertas si es necesario
   */
  VisitorGpsTracking.beforeCreate(async (tracking) => {
    // Generar alerta si batería baja
    if (tracking.hasLowBattery() && !tracking.alert_generated) {
      tracking.alert_generated = true;
      tracking.alert_type = 'low_battery';
      tracking.alert_message = `Batería baja (${tracking.battery_level}%) en llavero GPS`;
    }

    // Generar alerta si señal débil
    if (tracking.hasWeakSignal() && !tracking.alert_generated) {
      tracking.alert_generated = true;
      tracking.alert_type = 'signal_lost';
      tracking.alert_message = `Señal GPS débil (${tracking.signal_strength}%)`;
    }

    // Generar alerta si está fuera del perímetro
    if (tracking.is_inside_facility === false && !tracking.alert_generated) {
      tracking.alert_generated = true;
      tracking.alert_type = 'outside_facility';
      tracking.alert_message = `Visitante fuera del perímetro (${tracking.distance_from_facility}m de distancia)`;
    }
  });

  return VisitorGpsTracking;
};
