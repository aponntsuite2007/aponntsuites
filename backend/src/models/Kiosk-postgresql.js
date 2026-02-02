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
    },
    // Departamentos autorizados para fichar en este kiosko (JSONB array de IDs)
    // Migration: 20251009_kiosk_department_authorization.sql
    authorized_departments: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Array de department_id autorizados. Si vacío, permite todos los departamentos de la empresa.'
    },
    // Campos de lector externo y configuración de red
    has_external_reader: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      comment: 'Indica si el kiosko tiene lector externo conectado'
    },
    reader_model: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Modelo del lector externo (ej: ZK4500, DigitalPersona, etc.)'
    },
    reader_config: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Configuración específica del lector externo'
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: 'Dirección IP del kiosko en la red local'
    },
    port: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Puerto de comunicación del kiosko'
    },
    last_seen: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Última conexión del kiosko al servidor'
    },
    apk_version: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Versión de la APK instalada en el kiosko'
    },
    // ========================================================================
    // CAMPOS DE PERFILES DE HARDWARE (Migración: 20260201)
    // ========================================================================
    hardware_profile: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'ID del perfil de hardware facial seleccionado (ej: ipad_pro_12, galaxy_tab_s9)'
    },
    hardware_category: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Categoría del hardware (enterprise, tablet_ios, tablet_android, phone_ios, phone_android)'
    },
    detection_method_facial: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Tecnología de detección facial (TrueDepth, ML Kit, etc.)'
    },
    detection_method_fingerprint: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'ID del perfil de lector de huella (opcional)'
    },
    performance_score: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Score de rendimiento del hardware (0-100)'
    },
    supports_walkthrough: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      comment: 'Si el hardware soporta detección walk-through'
    },
    supports_liveness: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      comment: 'Si el hardware soporta detección de vida (anti-spoofing)'
    },
    biometric_modes: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Array de modos biométricos habilitados (facial, fingerprint)'
    },
    hardware_specs: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Especificaciones técnicas del hardware seleccionado'
    },
  }, {
    tableName: 'kiosks',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    // Disable paranoid mode as deleted_at column may not exist in all DBs
    paranoid: false,
    // Note: Indexes are handled by database, not by Sequelize model
    // This prevents issues when DB schema differs from model expectations
    indexes: []
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
