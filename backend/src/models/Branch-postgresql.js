const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Branch = sequelize.define('Branch', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    code: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: {
          msg: 'Debe ser un email válido'
        }
      },
      set(value) {
        // Si es string vacío, convertir a null para evitar validación
        this.setDataValue('email', value === '' ? null : value);
      }
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true
    },
    radius: {
      type: DataTypes.INTEGER,
      defaultValue: 50
    },
    isActive: {
      type: DataTypes.BOOLEAN,
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
    // ALIAS VIRTUAL PARA COMPATIBILIDAD FRONTEND (camelCase)
    companyId: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.getDataValue('company_id');
      },
      set(value) {
        this.setDataValue('company_id', value);
      }
    },
    // CAMPOS PARA SISTEMA DE FERIADOS POR PAÍS/PROVINCIA
    country: {
      type: DataTypes.STRING(5),
      allowNull: true,
      comment: 'Código de país ISO 3166-1 alpha-2 (AR, CL, BO, etc.)'
    },
    state_province: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Provincia/Estado para feriados provinciales'
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Ciudad de la sucursal'
    },
    // SUCURSAL PRINCIPAL (NO BORRABLE)
    is_main: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_main',
      comment: 'Si es TRUE, es la sucursal principal y NO puede ser borrada ni renombrada'
    }
  }, {
    tableName: 'branches',
    timestamps: true,
    indexes: [
      { fields: ['code'] },
      { fields: ['isActive'] },
      { fields: ['company_id'] },
      { unique: true, fields: ['code', 'company_id'] }
    ]
  });

  return Branch;
};