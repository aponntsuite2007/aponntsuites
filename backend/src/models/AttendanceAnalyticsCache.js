const { DataTypes } = require('sequelize');

/**
 * AttendanceAnalyticsCache Model
 * Cache de métricas agregadas para performance
 */
module.exports = (sequelize) => {
  const AttendanceAnalyticsCache = sequelize.define('AttendanceAnalyticsCache', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    cache_key: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    cache_type: {
      type: DataTypes.STRING(50)
    },
    dimension_1: {
      type: DataTypes.STRING(50)
    },
    dimension_1_value: {
      type: DataTypes.STRING(255)
    },
    dimension_2: {
      type: DataTypes.STRING(50)
    },
    dimension_2_value: {
      type: DataTypes.STRING(255)
    },
    period_start: {
      type: DataTypes.DATEONLY
    },
    period_end: {
      type: DataTypes.DATEONLY
    },
    cached_data: {
      type: DataTypes.JSONB,
      allowNull: false
    },
    calculated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    expires_at: {
      type: DataTypes.DATE
    },
    hit_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    last_hit_at: {
      type: DataTypes.DATE
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'attendance_analytics_cache',
    underscored: true,
    timestamps: false
  });

  // Métodos útiles
  AttendanceAnalyticsCache.getCached = async function(companyId, cacheKey) {
    const cached = await this.findOne({
      where: {
        company_id: companyId,
        cache_key: cacheKey,
        expires_at: {
          [sequelize.Sequelize.Op.gt]: new Date()
        }
      }
    });

    if (cached) {
      // Incrementar hit count
      await cached.increment('hit_count');
      await cached.update({ last_hit_at: new Date() });
      return cached.cached_data;
    }

    return null;
  };

  AttendanceAnalyticsCache.setCached = async function(companyId, cacheKey, data, ttlHours = 24) {
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

    return await this.upsert({
      company_id: companyId,
      cache_key: cacheKey,
      cached_data: data,
      calculated_at: new Date(),
      expires_at: expiresAt
    });
  };

  return AttendanceAnalyticsCache;
};
