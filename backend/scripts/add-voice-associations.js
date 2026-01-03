/**
 * Script para agregar asociaciones de Voice Platform a database.js
 * Ejecutar UNA SOLA VEZ después de detener el servidor
 */

const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../src/config/database.js');

console.log('📝 Agregando asociaciones de Voice Platform...\n');

// Leer archivo
let content = fs.readFileSync(dbPath, 'utf8');

// Buscar la línea "module.exports = {" después de las asociaciones HSE
const searchPattern = /\/\/ User -> EppInspection \(inspector\)[\s\S]*?EppInspection\.belongsTo\(User[^;]+;\s*\n\nmodule\.exports = \{/;

const associations = `// User -> EppInspection (inspector)
User.hasMany(EppInspection, { foreignKey: 'inspector_id', sourceKey: 'user_id', as: 'eppInspections' });
EppInspection.belongsTo(User, { foreignKey: 'inspector_id', targetKey: 'user_id', as: 'inspector' });

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

module.exports = {`;

// Verificar si ya existen las asociaciones
if (content.includes('ASOCIACIONES - Employee Voice Platform')) {
  console.log('✅ Las asociaciones de Voice Platform ya existen');
  process.exit(0);
}

// Reemplazar
const newContent = content.replace(searchPattern, associations);

if (newContent === content) {
  console.log('❌ No se pudo encontrar el patrón para insertar las asociaciones');
  console.log('   Por favor agregar manualmente después de las asociaciones HSE');
  process.exit(1);
}

// Guardar
fs.writeFileSync(dbPath, newContent, 'utf8');

console.log('✅ Asociaciones agregadas exitosamente');
console.log('\n📝 SIGUIENTE PASO:');
console.log('   1. Reiniciar el servidor: PORT=9998 npm start');
console.log('   2. Ejecutar test: node scripts/test-voice-platform-api.js\n');

process.exit(0);
