const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ExperienceRecognition = sequelize.define('ExperienceRecognition', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    experience_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'employee_experiences', key: 'id' } },
    user_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'user_id' } },
    company_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'companies', key: 'id' } },
    recognition_type: {
      type: DataTypes.ENUM('QUICK_WIN', 'IMPACT_SAVER', 'SAFETY_STAR', 'INNOVATION_AWARD',
                          'TEAM_BOOSTER', 'CLUSTER_CONTRIBUTOR', 'FIRST_SUGGESTION', 'SERIAL_CONTRIBUTOR'),
      allowNull: false
    },
    points_awarded: { type: DataTypes.INTEGER, allowNull: false },
    badge_name: DataTypes.STRING(50),
    monetary_reward: DataTypes.DECIMAL(10, 2),
    awarded_by: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'user_id' } },
    awarded_date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    notes: DataTypes.TEXT
  }, {
    tableName: 'experience_recognitions',
    timestamps: false
  });

  ExperienceRecognition.associate = (models) => {
    ExperienceRecognition.belongsTo(models.EmployeeExperience, { foreignKey: 'experience_id', as: 'experience' });
    ExperienceRecognition.belongsTo(models.User, { foreignKey: 'user_id', as: 'recipient' });
    ExperienceRecognition.belongsTo(models.User, { foreignKey: 'awarded_by', as: 'awarder' });
    ExperienceRecognition.belongsTo(models.Company, { foreignKey: 'company_id', as: 'company' });
  };

  return ExperienceRecognition;
};
