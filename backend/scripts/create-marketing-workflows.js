const { sequelize } = require('../src/config/database');

(async () => {
  console.log('🔧 Creando workflows NCE para marketing y quotes...\n');

  const workflows = [
    {
      process_key: 'marketing.flyer_email',
      process_name: 'Envío Flyer Marketing',
      module: 'marketing',
      description: 'Email flyer leads',
      scope: 'aponnt',
      channels: JSON.stringify(['email']),
      primary_channel: 'email',
      priority: 'medium',
      email_config_source: 'database',
      email_type: 'commercial',
      recipient_type: 'external'
    },
    {
      process_key: 'quotes.send_quote',
      process_name: 'Envío Presupuesto',
      module: 'quotes',
      description: 'Email presupuesto',
      scope: 'aponnt',
      channels: JSON.stringify(['email']),
      primary_channel: 'email',
      priority: 'high',
      email_config_source: 'database',
      email_type: 'commercial',
      recipient_type: 'external'
    },
    {
      process_key: 'quotes.contract_confirmation',
      process_name: 'Confirmación Contrato',
      module: 'quotes',
      description: 'Email confirmación contrato',
      scope: 'aponnt',
      channels: JSON.stringify(['email']),
      primary_channel: 'email',
      priority: 'high',
      email_config_source: 'database',
      email_type: 'commercial',
      recipient_type: 'external'
    }
  ];

  for (const wf of workflows) {
    try {
      const [existing] = await sequelize.query(
        'SELECT process_key FROM notification_workflows WHERE process_key = $1',
        { bind: [wf.process_key] }
      );

      if (existing && existing.length > 0) {
        console.log('   ⏭️ ', wf.process_key, '- Ya existe');
      } else {
        await sequelize.query(`
          INSERT INTO notification_workflows (
            process_key, process_name, module, description, scope,
            company_id, channels, primary_channel, priority,
            requires_response, email_config_source, email_type,
            recipient_type, is_active, created_at
          ) VALUES (
            $1, $2, $3, $4, $5, NULL, $6::jsonb, $7, $8,
            false, $9, $10, $11, true, NOW()
          )
        `, {
          bind: [
            wf.process_key, wf.process_name, wf.module, wf.description,
            wf.scope, wf.channels, wf.primary_channel, wf.priority,
            wf.email_config_source, wf.email_type, wf.recipient_type
          ]
        });
        console.log('   ✅', wf.process_key, '- Creado');
      }
    } catch (err) {
      console.log('   ❌', wf.process_key, '- Error:', err.message);
    }
  }

  console.log('\n✅ Workflows listos para NCE\n');
  process.exit(0);
})();
