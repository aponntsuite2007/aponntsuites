/**
 * Clustering simple usando similitud de coseno (sin Faiss/DBSCAN)
 * Agrupa experiencias con similitud > threshold
 */

const { sequelize } = require('../src/config/database');
const { EmployeeExperience, ExperienceCluster } = sequelize.models;
const axios = require('axios');

const NLP_SERVICE = 'http://localhost:5000/api/nlp';

// Calcular similitud de coseno entre dos vectores
function cosineSimilarity(vec1, vec2) {
  const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
  const mag1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
  const mag2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (mag1 * mag2);
}

async function generateEmbedding(text) {
  try {
    const response = await axios.post(`${NLP_SERVICE}/embed`, { text });
    return response.data.embedding;
  } catch (error) {
    console.error('❌ Error generando embedding:', error.message);
    return null;
  }
}

async function runSimpleClustering() {
  try {
    console.log('🎯 Clustering simple por similitud de coseno...\n');

    const companyId = 1;
    const SIMILARITY_THRESHOLD = 0.75;

    // 1. Obtener experiencias con embeddings
    console.log('📊 Obteniendo experiencias con embeddings...');
    const experiences = await EmployeeExperience.findAll({
      where: {
        company_id: companyId
      },
      order: [['created_at', 'ASC']]
    });

    const expsWithEmbeddings = experiences
      .filter(e => e.embedding)
      .map(e => ({
        id: e.id,
        title: e.title,
        description: e.description,
        type: e.type,
        area: e.area,
        embedding: typeof e.embedding === 'string' ? JSON.parse(e.embedding) : e.embedding,
        cluster_id: e.cluster_id
      }));

    console.log(`   ✅ ${expsWithEmbeddings.length} experiencias con embeddings\n`);

    if (expsWithEmbeddings.length < 2) {
      console.log('ℹ️  Se necesitan al menos 2 experiencias');
      return;
    }

    // 2. Calcular matriz de similitudes
    console.log('🔍 Calculando similitudes (threshold=0.85)...');

    const clusters = [];
    const assigned = new Set();

    for (let i = 0; i < expsWithEmbeddings.length; i++) {
      if (assigned.has(i)) continue;

      const exp1 = expsWithEmbeddings[i];
      const clusterMembers = [i];

      for (let j = i + 1; j < expsWithEmbeddings.length; j++) {
        if (assigned.has(j)) continue;

        const exp2 = expsWithEmbeddings[j];
        const similarity = cosineSimilarity(exp1.embedding, exp2.embedding);

        if (similarity >= SIMILARITY_THRESHOLD) {
          clusterMembers.push(j);
          assigned.add(j);
          console.log(`   ✅ Similar (${(similarity*100).toFixed(1)}%): "${exp1.title}" <-> "${exp2.title}"`);
        }
      }

      if (clusterMembers.length >= 2) {
        assigned.add(i);
        clusters.push(clusterMembers);
      }
    }

    console.log(`\n   📊 ${clusters.length} clusters encontrados\n`);

    // 3. Crear clusters en BD
    console.log('💾 Creando clusters en base de datos...\n');

    for (let clusterIdx = 0; clusterIdx < clusters.length; clusterIdx++) {
      const memberIndices = clusters[clusterIdx];
      const members = memberIndices.map(i => expsWithEmbeddings[i]);

      // Calcular centroide
      const centroid = members[0].embedding.map((_, dim) => {
        const sum = members.reduce((acc, m) => acc + m.embedding[dim], 0);
        return sum / members.length;
      });

      // Estadísticas del cluster
      const types = [...new Set(members.map(m => m.type))];
      const areas = [...new Set(members.map(m => m.area))];
      const name = `Cluster ${clusterIdx + 1}: ${areas[0]} - ${types[0]}`;

      // Crear cluster
      const cluster = await ExperienceCluster.create({
        company_id: companyId,
        name,
        description: `Agrupa ${members.length} experiencias similares sobre ${areas.join(', ')}`,
        auto_generated: true,
        type: types[0],
        area: areas[0],
        centroid_embedding: JSON.stringify(centroid),
        member_count: members.length,
        status: 'PENDING',
        dominant_topics: []
      });

      // Asignar experiencias al cluster
      for (const member of members) {
        await EmployeeExperience.update(
          { cluster_id: cluster.id },
          { where: { id: member.id } }
        );
      }

      console.log(`   ✅ ${name}:`);
      console.log(`      ${members.length} miembros`);
      console.log(`      ${members.map(m => `"${m.title.substring(0, 50)}"`).join('\n      ')}\n`);
    }

    console.log(`\n🎉 Clustering completado:`);
    console.log(`   - ${expsWithEmbeddings.length} experiencias procesadas`);
    console.log(`   - ${clusters.length} clusters creados`);
    console.log(`   - ${expsWithEmbeddings.length - assigned.size} experiencias únicas (outliers)\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

runSimpleClustering();
