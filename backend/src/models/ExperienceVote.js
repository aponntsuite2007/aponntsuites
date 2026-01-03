const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ExperienceVote = sequelize.define('ExperienceVote', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    experience_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'employee_experiences', key: 'id' }
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'user_id' }
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'companies', key: 'id' }
    },
    vote_type: {
      type: DataTypes.ENUM('UPVOTE', 'DOWNVOTE'),
      allowNull: false
    }
  }, {
    tableName: 'experience_votes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      { unique: true, fields: ['experience_id', 'user_id'] }
    ]
  });

  ExperienceVote.associate = (models) => {
    ExperienceVote.belongsTo(models.EmployeeExperience, { foreignKey: 'experience_id', as: 'experience' });
    ExperienceVote.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    ExperienceVote.belongsTo(models.Company, { foreignKey: 'company_id', as: 'company' });
  };

  return ExperienceVote;
};
