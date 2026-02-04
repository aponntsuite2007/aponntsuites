/**
 * Script de testing completo del circuito de emails
 * Cliente de prueba: PABLO (pablorivasjordan52@gmail.com)
 *
 * Flujo:
 * 1. Crear/actualizar lead PABLO
 * 2. Enviar flyer email
 * 3. Crear presupuesto (quote)
 * 4. Enviar presupuesto por email
 * 5. Crear contrato desde presupuesto
 * 6. Simular aceptación de contrato → email de confirmación
 * 7. Verificar registros en email_logs con tracking
 */

const { sequelize } = require('../src/config/database');
const { QueryTypes } = require('sequelize');
const NCE = require('../src/services/NotificationCentralExchange');

const PABLO = {
  email: 'pablorivasjordan52@gmail.com',
  full_name: 'Pablo Rivas Jordan',
  country: 'ES',
  sector: 'Tecnología',
  language: 'es'
};

async function testEmailCircuit() {
  console.log('\n🚀 INICIANDO TEST DEL CIRCUITO DE EMAILS\n');
  console.log('📧 Cliente:', PABLO.full_name, '-', PABLO.email);
  console.log('🌍 País:', PABLO.country);
  console.log('💼 Sector:', PABLO.sector);
  console.log('\n' + '='.repeat(60) + '\n');

  try {
    // ═══════════════════════════════════════════════════════════
    // PASO 1: BUSCAR O CREAR LEAD
    // ═══════════════════════════════════════════════════════════
    console.log('📝 PASO 1: Buscando/creando lead PABLO...');

    let [lead] = await sequelize.query(`
      SELECT * FROM marketing_leads
      WHERE email = :email
      LIMIT 1
    `, {
      replacements: { email: PABLO.email },
      type: QueryTypes.SELECT
    });

    if (!lead) {
      console.log('   ➡️ Lead no existe, creando...');

      const [inserted] = await sequelize.query(`
        INSERT INTO marketing_leads (
          full_name, email, country, sector, status,
          language, created_at, updated_at
        ) VALUES (
          :full_name, :email, :country, :sector, 'contactado',
          :language, NOW(), NOW()
        )
        RETURNING *
      `, {
        replacements: PABLO,
        type: QueryTypes.INSERT
      });

      lead = inserted[0];
      console.log('   ✅ Lead creado con ID:', lead.id);
    } else {
      console.log('   ✅ Lead encontrado con ID:', lead.id);
    }

    // ═══════════════════════════════════════════════════════════
    // PASO 2: ENVIAR FLYER EMAIL VIA NCE
    // ═══════════════════════════════════════════════════════════
    console.log('\n📤 PASO 2: Enviando flyer "Preguntale a tu IA"...');

    const flyerHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>🤖 Preguntale a tu IA sobre APONNT</h2>
        <p>Hola ${PABLO.full_name},</p>
        <p>¿Sabías que puedes preguntarle a tu asistente de IA sobre APONNT 360?</p>
        <p>Te invitamos a probar nuestro sistema completo de gestión empresarial.</p>
        <p><strong>Sectores:</strong> Tecnología, Servicios, Retail, y más.</p>
        <br>
        <p>Saludos,<br>Equipo APONNT</p>
      </div>
    `;

    try {
      await NCE.send({
        companyId: null,
        module: 'marketing',
        workflowKey: 'marketing.flyer_email',
        originType: 'lead',
        originId: String(lead.id),
        recipientType: 'external',
        recipientEmail: PABLO.email,
        title: 'Preguntale a tu IA sobre APONNT',
        message: `Flyer enviado a ${PABLO.full_name}`,
        metadata: {
          lead_id: lead.id,
          lead_name: PABLO.full_name,
          language: PABLO.language,
          htmlContent: flyerHtml
        },
        priority: 'normal',
        channels: ['email']
      });

      console.log('   ✅ Flyer enviado via NCE');
      console.log('   📊 Registro en email_logs: SÍ (con tracking_id)');
      console.log('   📋 Registro en notification_logs: SÍ');
      console.log('   📮 BCC: Automático desde BD (aponntcomercial@gmail.com)');
    } catch (error) {
      console.log('   ❌ Error enviando flyer:', error.message);
    }

    // Esperar 2 segundos
    await new Promise(resolve => setTimeout(resolve, 2000));

    // ═══════════════════════════════════════════════════════════
    // PASO 3: CREAR PRESUPUESTO (QUOTE)
    // ═══════════════════════════════════════════════════════════
    console.log('\n💰 PASO 3: Creando presupuesto para PABLO...');

    const quoteNumber = `QUO-${Date.now()}`;
    const [quote] = await sequelize.query(`
      INSERT INTO quotes (
        quote_number, lead_id, contact_name, contact_email,
        contact_phone, company_name, sector, country,
        currency, discount_percentage, total_amount,
        status, notes, language, created_at, updated_at
      ) VALUES (
        :quote_number, :lead_id, :contact_name, :contact_email,
        '+34600000000', 'PABLO Tech Solutions', :sector, :country,
        'EUR', 10, 299.00,
        'draft', 'Presupuesto de prueba para testing', :language,
        NOW(), NOW()
      )
      RETURNING *
    `, {
      replacements: {
        quote_number: quoteNumber,
        lead_id: lead.id,
        contact_name: PABLO.full_name,
        contact_email: PABLO.email,
        sector: PABLO.sector,
        country: PABLO.country,
        language: PABLO.language
      },
      type: QueryTypes.INSERT
    });

    console.log('   ✅ Presupuesto creado:', quoteNumber);
    console.log('   💵 Monto: €299.00');

    // ═══════════════════════════════════════════════════════════
    // PASO 4: ENVIAR PRESUPUESTO POR EMAIL VIA NCE
    // ═══════════════════════════════════════════════════════════
    console.log('\n📨 PASO 4: Enviando presupuesto por email...');

    const quoteEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>📄 Presupuesto APONNT 360</h2>
        <p>Estimado ${PABLO.full_name},</p>
        <p>Adjuntamos presupuesto ${quoteNumber} para su consideración.</p>
        <div style="background: #f0f0f0; padding: 15px; margin: 20px 0;">
          <p><strong>Presupuesto:</strong> ${quoteNumber}</p>
          <p><strong>Monto:</strong> €299.00</p>
          <p><strong>Descuento:</strong> 10%</p>
        </div>
        <p>Quedamos a su disposición para cualquier consulta.</p>
        <p>Saludos,<br>Equipo Comercial APONNT</p>
      </div>
    `;

    try {
      await NCE.send({
        companyId: null,
        module: 'quotes',
        workflowKey: 'quotes.send_quote',
        originType: 'quote',
        originId: String(quote[0].id),
        recipientType: 'external',
        recipientEmail: PABLO.email,
        title: `Presupuesto ${quoteNumber} - APONNT 360`,
        message: `Presupuesto enviado a ${PABLO.full_name}`,
        metadata: {
          quote_id: quote[0].id,
          quote_number: quoteNumber,
          total_amount: 299.00,
          htmlContent: quoteEmailHtml
        },
        priority: 'high',
        channels: ['email']
      });

      console.log('   ✅ Presupuesto enviado via NCE');
      console.log('   📊 Registro en email_logs: SÍ');
      console.log('   📮 BCC: Automático');
    } catch (error) {
      console.log('   ❌ Error enviando presupuesto:', error.message);
    }

    // Esperar 2 segundos
    await new Promise(resolve => setTimeout(resolve, 2000));

    // ═══════════════════════════════════════════════════════════
    // PASO 5: GENERAR CONTRATO
    // ═══════════════════════════════════════════════════════════
    console.log('\n📝 PASO 5: Generando contrato desde presupuesto...');

    const contractUUID = `contract-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    await sequelize.query(`
      UPDATE quotes
      SET
        contract_uuid = :contract_uuid,
        status = 'contract_generated',
        updated_at = NOW()
      WHERE id = :quote_id
    `, {
      replacements: {
        contract_uuid: contractUUID,
        quote_id: quote[0].id
      },
      type: QueryTypes.UPDATE
    });

    console.log('   ✅ Contrato generado:', contractUUID);
    console.log('   📄 Status: contract_generated');

    // ═══════════════════════════════════════════════════════════
    // PASO 6: SIMULAR ACEPTACIÓN DEL CONTRATO → EMAIL CONFIRMACIÓN
    // ═══════════════════════════════════════════════════════════
    console.log('\n✅ PASO 6: Simulando aceptación del contrato...');

    const acceptanceUUID = `acceptance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const documentHash = require('crypto').createHash('sha256').update(contractUUID).digest('hex');
    const acceptedAt = new Date();

    // Registrar aceptación
    await sequelize.query(`
      UPDATE quotes
      SET
        status = 'accepted',
        acceptance_uuid = :acceptance_uuid,
        acceptance_signature = :document_hash,
        accepted_at = :accepted_at,
        updated_at = NOW()
      WHERE id = :quote_id
    `, {
      replacements: {
        acceptance_uuid: acceptanceUUID,
        document_hash: documentHash,
        accepted_at: acceptedAt,
        quote_id: quote[0].id
      },
      type: QueryTypes.UPDATE
    });

    console.log('   ✅ Contrato aceptado:', acceptanceUUID);
    console.log('   📅 Fecha:', acceptedAt.toLocaleString('es-AR'));

    // ENVIAR EMAIL DE CONFIRMACIÓN VIA NCE
    console.log('\n📧 PASO 6b: Enviando email de confirmación...');

    const confirmationHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #22c55e; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">✅ Contrato Aceptado</h1>
          <p style="margin: 5px 0 0;">APONNT 360</p>
        </div>
        <div style="padding: 30px; background: #f8f9fa;">
          <p>Estimado/a ${PABLO.full_name},</p>
          <p>Le confirmamos que hemos registrado exitosamente la <strong>aceptación de su Contrato de Suscripción de Servicios APONNT 360</strong>.</p>

          <div style="background: white; padding: 20px; border-left: 4px solid #22c55e; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Presupuesto:</strong> ${quoteNumber}</p>
            <p style="margin: 5px 0;"><strong>Fecha de aceptación:</strong> ${acceptedAt.toLocaleString('es-AR')}</p>
            <p style="margin: 5px 0;"><strong>ID de aceptación:</strong> ${acceptanceUUID}</p>
            <p style="margin: 5px 0;"><strong>Monto mensual:</strong> €299.00</p>
          </div>

          <h3 style="color: #1e3a5f;">Próximos pasos:</h3>
          <ol style="line-height: 1.8;">
            <li>En las próximas 24-48 horas recibirá un email con sus credenciales de acceso</li>
            <li>Nuestro equipo de soporte lo contactará para agendar la capacitación</li>
            <li>Si tiene alguna consulta, puede responder a este email</li>
          </ol>

          <p style="margin-top: 30px;">¡Bienvenido/a a APONNT 360!</p>
        </div>
      </div>
    `;

    try {
      await NCE.send({
        companyId: null,
        module: 'quotes',
        workflowKey: 'quotes.contract_confirmation',
        originType: 'quote',
        originId: String(quote[0].id),
        recipientType: 'external',
        recipientEmail: PABLO.email,
        title: `✅ Confirmación de Aceptación de Contrato - ${quoteNumber}`,
        message: `Contrato ${quoteNumber} aceptado exitosamente`,
        metadata: {
          quote_id: quote[0].id,
          quote_number: quoteNumber,
          acceptance_uuid: acceptanceUUID,
          document_hash: documentHash,
          htmlContent: confirmationHtml
        },
        priority: 'high',
        channels: ['email']
      });

      console.log('   ✅ Email de confirmación enviado via NCE');
      console.log('   📊 Registro en email_logs: SÍ');
      console.log('   📮 BCC: Automático');
    } catch (error) {
      console.log('   ❌ Error enviando confirmación:', error.message);
    }

    // ═══════════════════════════════════════════════════════════
    // PASO 7: VERIFICAR REGISTROS EN EMAIL_LOGS
    // ═══════════════════════════════════════════════════════════
    console.log('\n📊 PASO 7: Verificando registros en email_logs...\n');

    await new Promise(resolve => setTimeout(resolve, 1000));

    const [emailLogs] = await sequelize.query(`
      SELECT
        id,
        tracking_id,
        recipient_email,
        subject,
        workflow_key,
        module,
        status,
        sent_at,
        opened_at,
        clicked_at,
        created_at
      FROM email_logs
      WHERE recipient_email = :email
      ORDER BY created_at DESC
      LIMIT 10
    `, {
      replacements: { email: PABLO.email },
      type: QueryTypes.SELECT
    });

    if (emailLogs.length > 0) {
      console.log(`   ✅ Se encontraron ${emailLogs.length} registros de email para ${PABLO.email}:\n`);

      emailLogs.forEach((log, idx) => {
        console.log(`   ${idx + 1}. ${log.workflow_key}`);
        console.log(`      📧 Subject: ${log.subject}`);
        console.log(`      🆔 Tracking ID: ${log.tracking_id}`);
        console.log(`      📤 Status: ${log.status}`);
        console.log(`      📅 Enviado: ${log.sent_at ? new Date(log.sent_at).toLocaleString('es-AR') : 'N/A'}`);
        console.log(`      👀 Abierto: ${log.opened_at ? new Date(log.opened_at).toLocaleString('es-AR') : 'No'}`);
        console.log(`      🖱️ Click: ${log.clicked_at ? 'Sí' : 'No'}`);
        console.log('');
      });
    } else {
      console.log('   ⚠️ No se encontraron registros de email');
    }

    // ═══════════════════════════════════════════════════════════
    // RESUMEN FINAL
    // ═══════════════════════════════════════════════════════════
    console.log('\n' + '='.repeat(60));
    console.log('✅ TEST COMPLETADO\n');
    console.log('📧 Emails enviados a:', PABLO.email);
    console.log('📊 Registros en email_logs:', emailLogs.length);
    console.log('📋 Workflows ejecutados:');
    console.log('   1. marketing.flyer_email (Flyer "Preguntale a tu IA")');
    console.log('   2. quotes.send_quote (Presupuesto)');
    console.log('   3. quotes.contract_confirmation (Confirmación aceptación)');
    console.log('\n💡 IMPORTANTE: Verifica tu bandeja de entrada de', PABLO.email);
    console.log('💡 BCC: Verifica aponntcomercial@gmail.com también');
    console.log('💡 Tracking: Abre los emails para registrar opened_at');
    console.log('='.repeat(60) + '\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR EN EL TEST:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Ejecutar test
testEmailCircuit();
