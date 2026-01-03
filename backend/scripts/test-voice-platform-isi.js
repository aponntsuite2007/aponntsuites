/**
 * Test Voice Platform para ISI (company_id = 11)
 */

const axios = require('axios');

async function testVoicePlatformISI() {
  try {
    console.log('🎯 TESTING VOICE PLATFORM - ISI (company_id = 11)\n');
    console.log('==========================================\n');

    // 1. Login
    console.log('1️⃣ Login con ISI...');
    const loginRes = await axios.post('http://localhost:9998/api/v1/auth/login', {
      companySlug: 'isi',
      identifier: 'admin',
      password: 'admin123'  // Probar contraseña estándar
    });
    const token = loginRes.data.token;
    console.log('   ✅ Token obtenido\n');

    const headers = { Authorization: `Bearer ${token}` };

    // 2. Experiencias de ISI
    console.log('2️⃣ GET /api/voice-platform/experiences (ISI)');
    const expRes = await axios.get('http://localhost:9998/api/voice-platform/experiences', { headers });
    console.log(`   ✅ Total experiencias ISI: ${expRes.data.experiences.length}`);

    if (expRes.data.experiences.length > 0) {
      console.log(`   📊 Primera: "${expRes.data.experiences[0].title.substring(0, 50)}..."`);
      console.log(`   📊 Tipo: ${expRes.data.experiences[0].type}`);
      console.log(`   📊 Área: ${expRes.data.experiences[0].area}\n`);
    } else {
      console.log('   ⚠️ No hay experiencias para ISI\n');
    }

    // 3. Clusters de ISI
    console.log('3️⃣ GET /api/voice-platform/clusters (ISI)');
    const clusterRes = await axios.get('http://localhost:9998/api/voice-platform/clusters', { headers });
    console.log(`   ✅ Total clusters ISI: ${clusterRes.data.clusters.length}`);

    clusterRes.data.clusters.forEach(c => {
      console.log(`   📊 ${c.name}: ${c.member_count} miembros`);
    });
    console.log('');

    // 4. My Stats (ISI)
    console.log('4️⃣ GET /api/voice-platform/gamification/my-stats (ISI)');
    const statsRes = await axios.get('http://localhost:9998/api/voice-platform/gamification/my-stats', { headers });
    console.log(`   📊 Puntos totales: ${statsRes.data.total_points || 0}`);
    console.log(`   📊 Nivel: ${statsRes.data.current_level || 1}`);
    console.log(`   📊 Experiencias enviadas: ${statsRes.data.suggestions_submitted || 0}\n`);

    // 5. Leaderboard (ISI)
    console.log('5️⃣ GET /api/voice-platform/gamification/leaderboard (ISI)');
    const leaderRes = await axios.get('http://localhost:9998/api/voice-platform/gamification/leaderboard', { headers });
    console.log(`   ✅ Usuarios en leaderboard: ${leaderRes.data.leaderboard.length}`);

    if (leaderRes.data.leaderboard.length > 0) {
      const top = leaderRes.data.leaderboard[0];
      console.log(`   🏆 Top 1: ${top.total_points} puntos\n`);
    }

    // 6. Crear nueva sugerencia para ISI
    console.log('6️⃣ POST /api/voice-platform/experiences (crear para ISI)');
    const newExpRes = await axios.post('http://localhost:9998/api/voice-platform/experiences', {
      title: '[TEST ISI] Implementar sistema de tickets interno',
      description: 'Crear un sistema de tickets para que los empleados reporten problemas técnicos, de infraestructura, etc. Actualmente todo se reporta por WhatsApp y se pierde.',
      type: 'SUGGESTION',
      area: 'IT',
      priority: 'MEDIUM',
      visibility: 'PUBLIC'
    }, { headers });
    console.log(`   ✅ Experiencia creada: ${newExpRes.data.experience.id}`);
    console.log(`   📊 Título: "${newExpRes.data.experience.title}"\n`);

    // 7. Votar experiencia de ISI
    console.log('7️⃣ POST /api/voice-platform/experiences/:id/vote');
    const firstExpId = expRes.data.experiences[0]?.id;

    if (firstExpId) {
      try {
        await axios.post(
          `http://localhost:9998/api/voice-platform/experiences/${firstExpId}/vote`,
          { vote_type: 'UPVOTE' },
          { headers }
        );
        console.log('   ✅ Voto registrado\n');
      } catch (voteError) {
        if (voteError.response?.data?.error?.includes('Ya votaste')) {
          console.log('   ⚠️ Usuario ya había votado (esperado)\n');
        } else {
          throw voteError;
        }
      }
    } else {
      console.log('   ⚠️ No hay experiencias para votar\n');
    }

    // 8. Comentar experiencia
    console.log('8️⃣ POST /api/voice-platform/experiences/:id/comments');
    if (firstExpId) {
      await axios.post(
        `http://localhost:9998/api/voice-platform/experiences/${firstExpId}/comments`,
        {
          content: '[TEST ISI] Excelente idea, esto nos ayudaría mucho en el día a día.',
          visibility: 'PUBLIC'
        },
        { headers }
      );
      console.log('   ✅ Comentario creado\n');
    }

    console.log('==========================================');
    console.log('✅ VOICE PLATFORM FUNCIONANDO PARA ISI\n');
    console.log('📊 RESUMEN ISI:');
    console.log(`   - Empresa: ISI (company_id: 11)`);
    console.log(`   - Slug: isi`);
    console.log(`   - Experiencias: ${expRes.data.experiences.length}`);
    console.log(`   - Clusters: ${clusterRes.data.clusters.length}`);
    console.log(`   - Usuarios en leaderboard: ${leaderRes.data.leaderboard.length}\n`);

    console.log('🌐 URL Panel Empresa:');
    console.log('   http://localhost:9998/panel-empresa.html');
    console.log('   Login → EMPRESA: isi | EMAIL: admin@isi.com | PASS: admin123\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

testVoicePlatformISI();
