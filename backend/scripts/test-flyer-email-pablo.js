/**
 * Test simple: enviar flyer a PABLO usando NCE directamente
 * Esto prueba la migración de marketingRoutes.js a NCE
 */

const { sequelize } = require('../src/config/database');
const { QueryTypes } = require('sequelize');
const salesOrchestrationService = require('../src/services/SalesOrchestrationService');
const NCE = require('../src/services/NotificationCentralExchange');

const PABLO = {
  email: 'pablorivasjordan52@gmail.com',
  full_name: 'Pablo Rivas Jordan',
  country: 'ES',
  language: 'es'
};

async function testFlyerEmail() {
  console.log('\n🚀 TEST: Envío de Flyer a PABLO\n');
  console.log('📧 Destinatario:', PABLO.email);
  console.log('👤 Nombre:', PABLO.full_name);
  console.log('🇪🇸 País:', PABLO.country);
  console.log('='.repeat(60) + '\n');

  try {
    // 1. Buscar o crear lead
    console.log('📝 1. Buscando/creando lead...');
    let [lead] = await sequelize.query(`
      SELECT * FROM marketing_leads WHERE email = :email LIMIT 1
    `, {
      replacements: { email: PABLO.email },
      type: QueryTypes.SELECT
    });

    if (!lead) {
      console.log('   ➡️ Creando lead...');
      const [inserted] = await sequelize.query(`
        INSERT INTO marketing_leads (
          full_name, email, country, sector, status,
          language, created_at, updated_at
        ) VALUES (
          :full_name, :email, :country, 'Tecnología', 'contactado',
          :language, NOW(), NOW()
        )
        RETURNING *
      `, {
        replacements: PABLO,
        type: QueryTypes.INSERT
      });
      lead = inserted[0];
    }

    console.log('   ✅ Lead ID:', lead.id);

    // 2. Generar tracking token
    console.log('\n🔗 2. Generando tracking token...');
    let trackingToken = lead.tracking_token;
    if (!trackingToken) {
      const [tokenResult] = await sequelize.query(`
        UPDATE marketing_leads
        SET tracking_token = gen_random_uuid()
        WHERE id = $1
        RETURNING tracking_token
      `, {
        bind: [lead.id],
        type: QueryTypes.UPDATE
      });
      trackingToken = tokenResult[0]?.tracking_token;
    }
    console.log('   ✅ Tracking token:', trackingToken);

    // 3. Generar HTML del flyer
    console.log('\n📄 3. Generando HTML del flyer...');
    const flyerHtml = salesOrchestrationService.generateAskYourAIFlyer(
      PABLO.full_name,
      PABLO.language,
      trackingToken
    );
    console.log('   ✅ HTML generado (',flyerHtml.length, 'chars)');

    // 4. Enviar via NCE
    console.log('\n📧 4. Enviando email via NCE...');
    console.log('   📮 Método: NCE.send()');
    console.log('   🎯 Workflow: marketing.flyer_email');
    console.log('   📨 Canal: email');
    console.log('   🔒 BCC: Automático desde BD');
    console.log('   📊 Tracking: Automático en email_logs');

    const result = await NCE.send({
      companyId: null, // Email externo pre-venta
      module: 'marketing',
      workflowKey: 'marketing.flyer_email',
      originType: 'lead',
      originId: String(lead.id),
      recipientType: 'external',
      recipientId: lead.id, // Lead ID
      recipientEmail: PABLO.email,
      recipientName: PABLO.full_name,
      title: 'Preguntale a tu IA sobre APONNT',
      message: `Flyer "Preguntale a tu IA" enviado a ${PABLO.full_name}`,
      metadata: {
        lead_id: lead.id,
        lead_name: PABLO.full_name,
        language: PABLO.language,
        tracking_token: trackingToken,
        htmlContent: flyerHtml
      },
      priority: 'normal',
      channels: ['email']
    });

    console.log('\n   ✅ EMAIL ENVIADO VIA NCE');
    console.log('   📊 Resultado:', result);

    // 5. Verificar registro en email_logs
    console.log('\n📊 5. Verificando registro en email_logs...');

    await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar 1s

    const [emailLogs] = await sequelize.query(`
      SELECT
        id,
        tracking_id,
        recipient_email,
        subject,
        workflow_key,
        status,
        sent_at,
        created_at
      FROM email_logs
      WHERE recipient_email = :email
      ORDER BY created_at DESC
      LIMIT 3
    `, {
      replacements: { email: PABLO.email },
      type: QueryTypes.SELECT
    });

    if (emailLogs.length > 0) {
      console.log(`   ✅ ${emailLogs.length} registros encontrados:\n`);
      emailLogs.forEach((log, idx) => {
        console.log(`   ${idx + 1}. Workflow: ${log.workflow_key}`);
        console.log(`      Subject: ${log.subject}`);
        console.log(`      Tracking ID: ${log.tracking_id}`);
        console.log(`      Status: ${log.status}`);
        console.log(`      Enviado: ${log.sent_at ? new Date(log.sent_at).toLocaleString('es-AR') : 'Pendiente'}`);
        console.log('');
      });
    } else {
      console.log('   ⚠️ No se encontraron registros (puede tardar unos segundos)');
    }

    // 6. Resumen
    console.log('='.repeat(60));
    console.log('✅ TEST COMPLETADO\n');
    console.log('📧 Email enviado a:', PABLO.email);
    console.log('📋 Workflow ejecutado: marketing.flyer_email');
    console.log('📊 Registrado en: email_logs + notification_logs');
    console.log('📮 BCC: Automático (aponntcomercial@gmail.com)');
    console.log('🔍 Tracking: Pixel 1x1 insertado');
    console.log('\n💡 IMPORTANTE:');
    console.log('   - Verifica tu bandeja:', PABLO.email);
    console.log('   - Verifica BCC: aponntcomercial@gmail.com');
    console.log('   - Abre el email para registrar opened_at');
    console.log('='.repeat(60) + '\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testFlyerEmail();
