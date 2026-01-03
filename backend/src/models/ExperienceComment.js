const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ExperienceComment = sequelize.define('ExperienceComment', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    experience_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'employee_experiences', key: 'id' } },
    user_id: { type: DataTypes.UUID, allowNull: true, references: { model: 'users', key: 'user_id' } },
    company_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'companies', key: 'company_id' } },
    parent_comment_id: { type: DataTypes.UUID, allowNull: true, references: { model: 'experience_comments', key: 'id' } },
    content: { type: DataTypes.TEXT, allowNull: false },
    visibility: { type: DataTypes.STRING(20), defaultValue: 'PUBLIC' },
    upvotes: { type: DataTypes.INTEGER, defaultValue: 0 }
  }, {
    tableName: 'experience_comments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  ExperienceComment.associate = (models) => {
    ExperienceComment.belongsTo(models.EmployeeExperience, { foreignKey: 'experience_id', as: 'experience' });
    ExperienceComment.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    ExperienceComment.belongsTo(models.ExperienceComment, { foreignKey: 'parent_comment_id', as: 'parentComment' });
    ExperienceComment.hasMany(models.ExperienceComment, { foreignKey: 'parent_comment_id', as: 'replies' });
  };

  return ExperienceComment;
};
