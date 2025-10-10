const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Sanction = sequelize.define('Sanction', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'companies',
        key: 'company_id'
      }
    },
    employee_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    employee_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    employee_department: {
      type: DataTypes.STRING,
      allowNull: true
    },
    sanction_type: {
      type: DataTypes.ENUM('attendance', 'training', 'behavior', 'performance', 'safety', 'other'),
      allowNull: false,
      defaultValue: 'other'
    },
    severity: {
      type: DataTypes.ENUM('warning', 'minor', 'major', 'suspension', 'termination'),
      allowNull: false,
      defaultValue: 'warning'
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    sanction_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    expiration_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('active', 'appealed', 'expired', 'revoked'),
      allowNull: false,
      defaultValue: 'active'
    },
    points_deducted: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    is_automatic: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'sanctions',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Sanction;
};
