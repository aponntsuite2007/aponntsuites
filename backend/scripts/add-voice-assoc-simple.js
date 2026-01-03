/**
 * Script SIMPLE para agregar asociaciones de Voice Platform
 */

const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../src/config/database.js');

console.log('📝 Agregando asociaciones de Voice Platform...\n');

let content = fs.readFileSync(dbPath, 'utf8');

// Verificar si ya existen
if (content.includes('ASOCIACIONES - Employee Voice Platform')) {
  console.log('✅ Las asociaciones ya existen');
  process.exit(0);
}

const voiceAssociations = `
// =========================================================================
// ✅ ASOCIACIONES - Employee Voice Platform (Sistema de Experiencias)
// =========================================================================

// EmployeeExperience -> Company
EmployeeExperience.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });
Company.hasMany(EmployeeExperience, { foreignKey: 'company_id', as: 'experiences' });

// EmployeeExperience -> User (employee/author)
EmployeeExperience.belongsTo(User, { foreignKey: 'employee_id', targetKey: 'user_id', as: 'employee' });
User.hasMany(EmployeeExperience, { foreignKey: 'employee_id', sourceKey: 'user_id', as: 'experiences' });

// EmployeeExperience -> User (approver)
EmployeeExperience.belongsTo(User, { foreignKey: 'approved_by', targetKey: 'user_id', as: 'approver' });
User.hasMany(EmployeeExperience, { foreignKey: 'approved_by', sourceKey: 'user_id', as: 'approvedExperiences' });

// EmployeeExperience -> ExperienceCluster
EmployeeExperience.belongsTo(ExperienceCluster, { foreignKey: 'cluster_id', as: 'cluster' });
ExperienceCluster.hasMany(EmployeeExperience, { foreignKey: 'cluster_id', as: 'experiences' });

// EmployeeExperience -> ExperienceVote
EmployeeExperience.hasMany(ExperienceVote, { foreignKey: 'experience_id', as: 'votes' });
ExperienceVote.belongsTo(EmployeeExperience, { foreignKey: 'experience_id', as: 'experience' });

// EmployeeExperience -> ExperienceComment
EmployeeExperience.hasMany(ExperienceComment, { foreignKey: 'experience_id', as: 'comments' });
ExperienceComment.belongsTo(EmployeeExperience, { foreignKey: 'experience_id', as: 'experience' });

// EmployeeExperience -> ExperienceRecognition
EmployeeExperience.hasMany(ExperienceRecognition, { foreignKey: 'experience_id', as: 'recognitions' });
ExperienceRecognition.belongsTo(EmployeeExperience, { foreignKey: 'experience_id', as: 'experience' });

// ExperienceVote -> User (voter)
ExperienceVote.belongsTo(User, { foreignKey: 'user_id', targetKey: 'user_id', as: 'voter' });
User.hasMany(ExperienceVote, { foreignKey: 'user_id', sourceKey: 'user_id', as: 'experienceVotes' });

// ExperienceComment -> User (author)
ExperienceComment.belongsTo(User, { foreignKey: 'user_id', targetKey: 'user_id', as: 'author' });
User.hasMany(ExperienceComment, { foreignKey: 'user_id', sourceKey: 'user_id', as: 'experienceComments' });

// ExperienceRecognition -> User (giver and receiver)
ExperienceRecognition.belongsTo(User, { foreignKey: 'given_by', targetKey: 'user_id', as: 'giver' });
User.hasMany(ExperienceRecognition, { foreignKey: 'given_by', sourceKey: 'user_id', as: 'recognitionsGiven' });

ExperienceRecognition.belongsTo(User, { foreignKey: 'user_id', targetKey: 'user_id', as: 'receiver' });
User.hasMany(ExperienceRecognition, { foreignKey: 'user_id', sourceKey: 'user_id', as: 'recognitionsReceived' });

// ExperienceCluster -> Company
ExperienceCluster.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });
Company.hasMany(ExperienceCluster, { foreignKey: 'company_id', as: 'clusters' });

`;

// Insertar antes de module.exports
const newContent = content.replace('\nmodule.exports = {', voiceAssociations + '\nmodule.exports = {');

if (newContent === content) {
  console.log('❌ No se pudo insertar');
  process.exit(1);
}

fs.writeFileSync(dbPath, newContent, 'utf8');
console.log('✅ Asociaciones agregadas');
console.log('\n🚀 REINICIAR SERVIDOR: PORT=9998 npm start\n');
