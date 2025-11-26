const { DataTypes } = require('sequelize');

/**
 * ComparativeAnalytics Model
 * Cubos OLAP pre-calculados para comparaciones multi-dimensionales
 */
module.exports = (sequelize) => {
  const ComparativeAnalytics = sequelize.define('ComparativeAnalytics', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    cube_id: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    dimension_time: {
      type: DataTypes.STRING(50)
    },
    dimension_time_value: {
      type: DataTypes.STRING(50)
    },
    dimension_org: {
      type: DataTypes.STRING(50)
    },
    dimension_org_value: {
      type: DataTypes.STRING(255)
    },
    dimension_geo: {
      type: DataTypes.STRING(50)
    },
    dimension_geo_value: {
      type: DataTypes.STRING(255)
    },
    measure_name: {
      type: DataTypes.STRING(50)
    },
    measure_value: {
      type: DataTypes.DECIMAL(15, 4)
    },
    measure_unit: {
      type: DataTypes.STRING(20)
    },
    comparison_baseline_value: {
      type: DataTypes.DECIMAL(15, 4)
    },
    comparison_diff_absolute: {
      type: DataTypes.DECIMAL(15, 4)
    },
    comparison_diff_percent: {
      type: DataTypes.DECIMAL(7, 2)
    },
    sample_size: {
      type: DataTypes.INTEGER
    },
    confidence_level: {
      type: DataTypes.DECIMAL(5, 2)
    },
    calculated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'comparative_analytics',
    underscored: true,
    timestamps: false
  });

  return ComparativeAnalytics;
};
