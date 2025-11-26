const { DataTypes } = require('sequelize');

/**
 * ScoringHistory Model
 * Historial temporal de scoring (snapshots semanales)
 */
module.exports = (sequelize) => {
  const ScoringHistory = sequelize.define('ScoringHistory', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    snapshot_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    scoring_total: {
      type: DataTypes.DECIMAL(5, 2)
    },
    scoring_punctuality: {
      type: DataTypes.DECIMAL(5, 2)
    },
    scoring_absence: {
      type: DataTypes.DECIMAL(5, 2)
    },
    scoring_late_arrival: {
      type: DataTypes.DECIMAL(5, 2)
    },
    scoring_early_departure: {
      type: DataTypes.DECIMAL(5, 2)
    },
    change_from_previous: {
      type: DataTypes.DECIMAL(6, 2)
    },
    change_reason: {
      type: DataTypes.STRING(255)
    },
    trend: {
      type: DataTypes.STRING(20),
      validate: {
        isIn: [['improving', 'stable', 'declining']]
      }
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'scoring_history',
    underscored: true,
    timestamps: false
  });

  return ScoringHistory;
};
