const { Sequelize } = require('sequelize');
require('dotenv').config();

const db = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

(async () => {
  try {
    await db.authenticate();
    console.log('✅ Conectado a PostgreSQL\n');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🧠 KNOWLEDGE BASE - CONOCIMIENTO APRENDIDO');
    console.log('═══════════════════════════════════════════════════════════\n');

    const [knowledgeRows] = await db.query('SELECT * FROM auditor_knowledge_base ORDER BY last_updated DESC LIMIT 10');
    console.log('📊 Total de registros en knowledge_base:', knowledgeRows.length);
    console.log('');

    if (knowledgeRows.length > 0) {
      knowledgeRows.forEach((row, i) => {
        console.log(`${i+1}. ${row.knowledge_type.toUpperCase()}: ${row.key}`);
        console.log(`   - Confidence: ${row.confidence_score}`);
        console.log(`   - Occurrences: ${row.occurrences}`);
        console.log(`   - Priority: ${row.priority}`);
        console.log(`   - Status: ${row.status}`);
        if (row.success_rate !== null) {
          console.log(`   - Success Rate: ${row.success_rate}`);
        }
        console.log('');
      });
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('📜 LEARNING HISTORY - HISTORIAL DE APRENDIZAJE');
    console.log('═══════════════════════════════════════════════════════════\n');

    const [historyRows] = await db.query('SELECT * FROM auditor_learning_history ORDER BY created_at DESC LIMIT 5');
    console.log('📊 Total de registros en learning_history:', historyRows.length);
    console.log('');

    if (historyRows.length > 0) {
      historyRows.forEach((row, i) => {
        console.log(`${i+1}. ${row.action}`);
        console.log(`   - Key: ${row.knowledge_key || 'N/A'}`);
        console.log(`   - Created: ${row.created_at}`);
        console.log('');
      });
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('💡 SUGGESTIONS - SUGERENCIAS PARA REVISIÓN MANUAL');
    console.log('═══════════════════════════════════════════════════════════\n');

    const [suggestionsRows] = await db.query('SELECT * FROM auditor_suggestions ORDER BY created_at DESC LIMIT 5');
    console.log('📊 Total de sugerencias:', suggestionsRows.length);
    console.log('');

    if (suggestionsRows.length > 0) {
      suggestionsRows.forEach((row, i) => {
        console.log(`${i+1}. ${row.title}`);
        console.log(`   - Type: ${row.suggestion_type}`);
        console.log(`   - Priority: ${row.priority}`);
        console.log(`   - Status: ${row.status}`);
        console.log('');
      });
    } else {
      console.log('   (No hay sugerencias pendientes)');
      console.log('');
    }

    await db.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
