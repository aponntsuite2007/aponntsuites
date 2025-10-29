const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PartnerRole = sequelize.define('PartnerRole', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    role_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    requires_license: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    requires_insurance: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'partner_roles',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  return PartnerRole;
};
