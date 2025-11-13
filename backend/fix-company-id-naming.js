const fs = require('fs');
const path = require('path');

// Archivos que necesitan cambiar company_id → companyId
const files = [
  'src/routes/emailVerificationRoutes.js',
  'src/routes/supportRoutesV2.js',
  'src/routes/userProfileRoutes.js',
  'src/routes/userAdminRoutes.js',
  'src/routes/userMedicalRoutes.js',
  'src/routes/attendanceRoutes.js',
  'src/routes/notificationsEnterprise.js',
  'src/routes/biometricConsentRoutes.js',
  'src/routes/kioskRoutes.js',
  'src/routes/departmentRoutes.js',
  'src/routes/biometric-hub.js',
  'src/routes/biometric-attendance-api.js',
  'src/routes/real-biometric-api.js'
];

let changedCount = 0;
let totalOccurrences = 0;

files.forEach(file => {
  const filePath = path.join(__dirname, file);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Archivo no encontrado: ${file}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const occurrences = (content.match(/req\.user\.company_id/g) || []).length;

  if (occurrences > 0) {
    // Reemplazar req.user.company_id → req.user.companyId
    content = content.replace(/req\.user\.company_id/g, 'req.user.companyId');

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${file}: ${occurrences} ocurrencias reemplazadas`);
    changedCount++;
    totalOccurrences += occurrences;
  } else {
    console.log(`ℹ️  ${file}: Sin cambios necesarios`);
  }
});

console.log(`\n📊 Resumen:`);
console.log(`   Archivos modificados: ${changedCount}`);
console.log(`   Total de ocurrencias cambiadas: ${totalOccurrences}`);
console.log(`   ✅ req.user.company_id → req.user.companyId`);
