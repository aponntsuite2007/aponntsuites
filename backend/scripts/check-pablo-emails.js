const { sequelize } = require('../src/config/database');

(async () => {
  console.log('📧 EMAILS ENVIADOS A PABLO:\n');

  const [emails] = await sequelize.query(`
    SELECT
      id,
      tracking_id,
      recipient_email,
      subject,
      category,
      status,
      sent_at,
      opened_at,
      message_id,
      created_at
    FROM email_logs
    WHERE recipient_email = 'pablorivasjordan52@gmail.com'
    ORDER BY created_at DESC
    LIMIT 10
  `);

  if (emails.length > 0) {
    emails.forEach((e, idx) => {
      console.log(`${idx+1}. Subject: ${e.subject}`);
      console.log(`   Category: ${e.category}`);
      console.log(`   Status: ${e.status}`);
      console.log(`   Enviado: ${e.sent_at ? new Date(e.sent_at).toLocaleString('es-AR') : 'Pendiente'}`);
      console.log(`   Tracking ID: ${e.tracking_id}`);
      console.log(`   Message ID: ${e.message_id}`);
      console.log('');
    });
    console.log(`✅ Total: ${emails.length} emails registrados para Pablo\n`);
    console.log('💡 Verificar en:');
    console.log('   - pablorivasjordan52@gmail.com (destinatario)');
    console.log('   - aponntcomercial@gmail.com (BCC)');
  } else {
    console.log('⚠️ No se encontraron emails registrados');
  }

  process.exit(0);
})();
