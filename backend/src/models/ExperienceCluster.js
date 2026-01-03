const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ExperienceCluster = sequelize.define('ExperienceCluster', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'companies', key: 'id' }
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    auto_generated: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    centroid_embedding: {
      type: DataTypes.TEXT,  // Vector serializado
      allowNull: true,
      get() {
        const raw = this.getDataValue('centroid_embedding');
        return raw ? JSON.parse(raw) : null;
      },
      set(value) {
        this.setDataValue('centroid_embedding', value ? JSON.stringify(value) : null);
      }
    },
    type: DataTypes.STRING(50),
    area: DataTypes.STRING(50),
    priority: DataTypes.STRING(20),
    dominant_topics: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    member_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    total_upvotes: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    total_downvotes: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    avg_sentiment: DataTypes.FLOAT,
    status: {
      type: DataTypes.ENUM('PENDING', 'IN_REVIEW', 'APPROVED', 'IMPLEMENTED', 'REJECTED', 'MERGED'),
      defaultValue: 'PENDING'
    },
    merged_into_cluster_id: {
      type: DataTypes.UUID,
      allowNull: true
    }
  }, {
    tableName: 'experience_clusters',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  ExperienceCluster.associate = (models) => {
    ExperienceCluster.belongsTo(models.Company, { foreignKey: 'company_id', as: 'company' });
    ExperienceCluster.hasMany(models.EmployeeExperience, { foreignKey: 'cluster_id', as: 'members' });
  };

  return ExperienceCluster;
};
