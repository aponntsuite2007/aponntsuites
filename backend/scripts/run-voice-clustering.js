/**
 * Script para ejecutar clustering semántico en Voice Platform
 * Genera embeddings y agrupa sugerencias similares
 */

const { sequelize } = require('../src/config/database');
const { EmployeeExperience, ExperienceCluster } = sequelize.models;
const axios = require('axios');

const NLP_SERVICE = 'http://localhost:5000/api/nlp';

async function generateEmbedding(text) {
  try {
    const response = await axios.post(`${NLP_SERVICE}/embed`, { text });
    return response.data.embedding;
  } catch (error) {
    console.error('❌ Error generando embedding:', error.message);
    return null;
  }
}

async function clusterExperiences(embeddings, threshold = 0.85) {
  try {
    const response = await axios.post(`${NLP_SERVICE}/cluster`, {
      embeddings,
      threshold,
      min_cluster_size: 2
    });
    return response.data.clusters;
  } catch (error) {
    console.error('❌ Error en clustering:', error.message);
    return null;
  }
}

async function runClustering() {
  try {
    console.log('🎯 Iniciando clustering semántico de Voice Platform...\n');

    const companyId = 1;

    // 1. Obtener todas las experiencias sin cluster
    console.log('📊 Obteniendo experiencias...');
    const experiences = await EmployeeExperience.findAll({
      where: { company_id: companyId, cluster_id: null },
      order: [['created_at', 'ASC']]
    });

    console.log(`   ✅ ${experiences.length} experiencias encontradas\n`);

    if (experiences.length === 0) {
      console.log('ℹ️  No hay experiencias sin cluster');
      return;
    }

    // 2. Generar embeddings
    console.log('🧠 Generando embeddings con S-BERT...');
    const experiencesWithEmbeddings = [];

    for (let i = 0; i < experiences.length; i++) {
      const exp = experiences[i];
      const text = `${exp.title}. ${exp.description}`;

      process.stdout.write(`   Procesando ${i+1}/${experiences.length}: ${exp.title.substring(0, 40)}...\r`);

      const embedding = await generateEmbedding(text);

      if (embedding) {
        experiencesWithEmbeddings.push({
          id: exp.id,
          title: exp.title,
          description: exp.description,
          type: exp.type,
          area: exp.area,
          embedding
        });

        // Guardar embedding en BD
        await exp.update({ embedding: JSON.stringify(embedding) });
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n   ✅ ${experiencesWithEmbeddings.length} embeddings generados\n`);

    // 3. Ejecutar clustering DBSCAN
    console.log('🔍 Ejecutando clustering DBSCAN (threshold=0.85)...');

    const embeddings = experiencesWithEmbeddings.map(e => e.embedding);
    const clusterLabels = await clusterExperiences(embeddings, 0.85);

    if (!clusterLabels) {
      console.error('❌ Error ejecutando clustering');
      return;
    }

    console.log(`   ✅ Clustering completado\n`);

    // 4. Crear clusters en BD
    console.log('💾 Creando clusters en base de datos...');

    const clusterMap = new Map();

    for (let i = 0; i < clusterLabels.length; i++) {
      const label = clusterLabels[i];

      if (label === -1) continue; // Outliers (no pertenecen a ningún cluster)

      if (!clusterMap.has(label)) {
        clusterMap.set(label, []);
      }

      clusterMap.get(label).push(experiencesWithEmbeddings[i]);
    }

    console.log(`   📊 ${clusterMap.size} clusters identificados\n`);

    let clustersCreated = 0;

    for (const [label, members] of clusterMap.entries()) {
      if (members.length < 2) continue; // Skip clusters con 1 solo miembro

      // Calcular centroide (promedio de embeddings)
      const centroid = members[0].embedding.map((_, dim) => {
        const sum = members.reduce((acc, m) => acc + m.embedding[dim], 0);
        return sum / members.length;
      });

      // Generar nombre descriptivo
      const types = [...new Set(members.map(m => m.type))];
      const areas = [...new Set(members.map(m => m.area))];
      const name = `Cluster ${label + 1}: ${areas[0]} - ${types[0]}`;

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
        status: 'PENDING'
      });

      // Asignar experiencias al cluster
      for (const member of members) {
        await EmployeeExperience.update(
          { cluster_id: cluster.id },
          { where: { id: member.id } }
        );
      }

      console.log(`   ✅ Cluster "${name}": ${members.length} miembros`);
      console.log(`      Títulos: ${members.map(m => m.title.substring(0, 30)).join(', ')}...\n`);

      clustersCreated++;
    }

    console.log(`\n🎉 Clustering completado:`);
    console.log(`   - ${experiencesWithEmbeddings.length} experiencias procesadas`);
    console.log(`   - ${clustersCreated} clusters creados`);
    console.log(`   - ${clusterLabels.filter(l => l === -1).length} outliers (experiencias únicas)\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error en clustering:', error);
    process.exit(1);
  }
}

// Ejecutar
runClustering();
