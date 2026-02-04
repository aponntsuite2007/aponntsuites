const { sequelize } = require('../src/config/database');

(async () => {
  const trackingId = '9ff1932e-20e0-48ac-a0d1-28ef36c2b039';

  const [email] = await sequelize.query(`
    SELECT
      tracking_id,
      recipient_email,
      subject,
      body_html,
      status,
      opened_at,
      clicked_at
    FROM email_logs
    WHERE tracking_id = :trackingId
  `, {
    replacements: { trackingId },
    type: sequelize.QueryTypes.SELECT
  });

  if (!email) {
    console.log('❌ Email no encontrado');
    process.exit(1);
  }

  console.log('📧 EMAIL DETAILS:\n');
  console.log(`Destinatario: ${email.recipient_email}`);
  console.log(`Subject: ${email.subject}`);
  console.log(`Status: ${email.status}`);
  console.log(`Opened: ${email.opened_at || 'No'}`);
  console.log(`Clicked: ${email.clicked_at || 'No'}\n`);

  // Buscar el tracking pixel en el HTML
  if (email.body_html) {
    const hasPixel = email.body_html.includes('/api/email/track/') ||
                     email.body_html.includes('tracking pixel');

    console.log('🔍 TRACKING PIXEL:\n');
    console.log(`Pixel presente: ${hasPixel ? '✅ SÍ' : '❌ NO'}`);

    if (hasPixel) {
      // Extraer la URL del pixel
      const pixelMatch = email.body_html.match(/src="([^"]*\/api\/email\/track\/[^"]*)"/);
      if (pixelMatch) {
        console.log(`URL del pixel: ${pixelMatch[1]}`);
      }
    } else {
      console.log('\n⚠️ EL TRACKING PIXEL NO ESTÁ EN EL HTML');
      console.log('Esto explica por qué no se registra cuando Pablo abre el email\n');

      // Mostrar primeros 500 caracteres del HTML
      console.log('📄 PREVIEW HTML (primeros 500 chars):');
      console.log(email.body_html.substring(0, 500) + '...\n');
    }
  } else {
    console.log('❌ No hay body_html registrado');
  }

  process.exit(0);
})();
