const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const VendorStatistics = sequelize.define('VendorStatistics', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    vendor_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'aponnt_staff',
        key: 'id'
      }
    },
    total_companies: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    sales_companies: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    support_companies: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    total_users: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    sales_users: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    support_users: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    sales_commission_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 10.00
    },
    total_sales_commission_usd: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00
    },
    monthly_sales_commission_usd: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00
    },
    support_commission_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0.00
    },
    total_support_commission_usd: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00
    },
    monthly_support_commission_usd: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00
    },
    total_referrals: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    referral_commission_usd: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00
    },
    grand_total_commission_usd: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00
    },
    total_modules_value_usd: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00
    },
    rating: {
      type: DataTypes.DECIMAL(3, 1),
      defaultValue: 0.0
    },
    total_ratings: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    cbu: {
      type: DataTypes.STRING(22),
      allowNull: true
    },
    last_updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'vendor_statistics',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  VendorStatistics.associate = function(models) {
    VendorStatistics.belongsTo(models.AponntStaff, {
      foreignKey: 'vendor_id',
      as: 'vendor'
    });
  };

  return VendorStatistics;
};
