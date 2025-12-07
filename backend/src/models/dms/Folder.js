'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Folder extends Model {
    static associate(models) {
      Folder.belongsTo(Folder, {
        foreignKey: 'parent_id',
        as: 'parent'
      });

      Folder.hasMany(Folder, {
        foreignKey: 'parent_id',
        as: 'children'
      });

      Folder.hasMany(models.Document, {
        foreignKey: 'folder_id',
        as: 'documents'
      });

      Folder.belongsTo(models.User, {
        foreignKey: 'created_by',
        as: 'creator'
      });

      Folder.belongsTo(models.Company, {
        foreignKey: 'company_id',
        as: 'company'
      });
    }

    // Obtener path completo
    async getFullPath() {
      let path = this.name;
      let current = this;

      while (current.parent_id) {
        current = await Folder.findByPk(current.parent_id);
        if (current) {
          path = `${current.name}/${path}`;
        } else {
          break;
        }
      }

      return `/${path}`;
    }

    // Obtener todos los ancestros
    async getAncestors() {
      const ancestors = [];
      let current = this;

      while (current.parent_id) {
        current = await Folder.findByPk(current.parent_id);
        if (current) {
          ancestors.unshift(current);
        } else {
          break;
        }
      }

      return ancestors;
    }

    // Obtener todos los descendientes
    async getDescendants() {
      const descendants = [];
      const children = await Folder.findAll({
        where: { parent_id: this.id, is_active: true }
      });

      for (const child of children) {
        descendants.push(child);
        const childDescendants = await child.getDescendants();
        descendants.push(...childDescendants);
      }

      return descendants;
    }
  }

  Folder.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    parent_id: {
      type: DataTypes.UUID,
      references: {
        model: 'dms_folders',
        key: 'id'
      }
    },

    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    full_path: {
      type: DataTypes.STRING(1000)
    },
    depth: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },

    // Propietario
    owner_type: {
      type: DataTypes.STRING(50),
      defaultValue: 'company'
    },
    owner_id: {
      type: DataTypes.UUID
    },

    // Configuración
    inherit_permissions: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    default_visibility: {
      type: DataTypes.STRING(20),
      defaultValue: 'private'
    },
    color: {
      type: DataTypes.STRING(7)
    },
    icon: {
      type: DataTypes.STRING(10)
    },

    // Sistema
    is_system: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    folder_type: {
      type: DataTypes.STRING(50)
    },

    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    created_by: {
      type: DataTypes.UUID
    }
  }, {
    sequelize,
    modelName: 'Folder',
    tableName: 'dms_folders',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['company_id'] },
      { fields: ['parent_id'] },
      { fields: ['owner_type', 'owner_id'] },
      {
        unique: true,
        fields: ['company_id', 'full_path']
      }
    ],
    hooks: {
      beforeCreate: async (folder) => {
        // Calcular profundidad y path
        if (folder.parent_id) {
          const parent = await Folder.findByPk(folder.parent_id);
          if (parent) {
            folder.depth = parent.depth + 1;
            folder.full_path = `${parent.full_path}/${folder.name}`;
          }
        } else {
          folder.depth = 0;
          folder.full_path = `/${folder.name}`;
        }
      },
      beforeUpdate: async (folder) => {
        if (folder.changed('name') || folder.changed('parent_id')) {
          if (folder.parent_id) {
            const parent = await Folder.findByPk(folder.parent_id);
            if (parent) {
              folder.depth = parent.depth + 1;
              folder.full_path = `${parent.full_path}/${folder.name}`;
            }
          } else {
            folder.depth = 0;
            folder.full_path = `/${folder.name}`;
          }
        }
      }
    }
  });

  return Folder;
};
