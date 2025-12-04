/**
 * Script para agregar CertificationAlertService a server.js
 * OH-V6-9: Integración del cron job
 */

const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, '..', 'server.js');

console.log('📝 [CERT ALERTS] Agregando CertificationAlertService a server.js...\n');

// Leer server.js
let serverContent = fs.readFileSync(serverPath, 'utf8');

// Código a insertar
const certAlertCode = `
    // ✅ INICIALIZAR CERTIFICATION ALERT SERVICE (OH-V6-9)
    console.log('📜 [CERT ALERTS] Inicializando Certification Alert Service...');
    try {
      const CertificationAlertService = require('./src/services/CertificationAlertService');
      const { Pool } = require('pg');

      // Crear pool de PostgreSQL para el servicio
      const certAlertPool = new Pool({
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        database: process.env.POSTGRES_DB || 'attendance_system',
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD
      });

      const certAlertService = new CertificationAlertService(certAlertPool);
      certAlertService.startCronJob();

      // Hacer disponible en toda la aplicación
      app.locals.certAlertService = certAlertService;
      global.certAlertService = certAlertService;

      console.log('✅ [CERT ALERTS] Certification Alert Service iniciado correctamente');
      console.log('   • Frecuencia: Diario a las 9:00 AM');
      console.log('   • Alertas multi-idioma: EN, ES');
      console.log('   • Destinatarios: Empleados, Supervisores, RRHH');
      console.log('   • Zona horaria: America/Buenos_Aires\\n');
    } catch (certAlertError) {
      console.warn('⚠️  [CERT ALERTS] Error iniciando Certification Alert Service:', certAlertError.message);
      console.warn('⚠️  [CERT ALERTS] El servidor continuará sin alertas automáticas de certificaciones.\\n');
    }
`;

// Verificar si ya existe
if (serverContent.includes('INICIALIZAR CERTIFICATION ALERT SERVICE')) {
  console.log('✅ CertificationAlertService ya está integrado en server.js\n');
  process.exit(0);
}

// Buscar el punto de inserción (después del scheduler de exámenes médicos)
const insertionPoint = "// Iniciar servidor HTTP";

if (!serverContent.includes(insertionPoint)) {
  console.error('❌ No se encontró el punto de inserción en server.js');
  process.exit(1);
}

// Insertar el código
serverContent = serverContent.replace(
  insertionPoint,
  certAlertCode + '\n    ' + insertionPoint
);

// Guardar
fs.writeFileSync(serverPath, serverContent, 'utf8');

console.log('✅ CertificationAlertService agregado exitosamente a server.js');
console.log('   Ubicación: Antes de "// Iniciar servidor HTTP"\n');
console.log('📋 PRÓXIMO PASO: Reiniciar el servidor para activar el cron job\n');
