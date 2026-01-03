/**
 * ============================================================================
 * VOICE DEDUPLICATION SERVICE
 * ============================================================================
 *
 * Servicio para detectar sugerencias duplicadas o similares usando:
 * - S-BERT embeddings (semantic similarity)
 * - Faiss vector search
 * - Clustering automático
 *
 * Ejemplo: "Envolver pallets con film" == "Usar cinta para pallets" (0.87 similarity)
 *
 * @version 1.0.0
 * @date 2025-12-22
 * ============================================================================
 */

const nlpClient = require('../nlp/nlpClient');
const { EmployeeExperience, ExperienceCluster } = require('../config/database');
const { Op } = require('sequelize');

class VoiceDeduplicationService {
  constructor() {
    this.similarityThreshold = parseFloat(process.env.CLUSTERING_THRESHOLD || '0.85');
  }

  /**
   * Procesar nueva experiencia: generar embedding, buscar similares, asignar cluster
   * @param {Object} experience - Instancia de EmployeeExperience
   */
  async processNewExperience(experience) {
    console.log(`\n🔍 [DEDUP] Procesando experiencia: ${experience.id}`);

    try {
      // 1. Generar embedding y sentiment
      const fullText = `${experience.title} ${experience.description}`;
      const { embedding, sentiment } = await nlpClient.processExperience(fullText);

      // 2. Actualizar experience con embedding y sentiment
      experience.embedding = embedding;
      experience.sentiment_score = sentiment.score;
      experience.sentiment_label = sentiment.label;
      await experience.save();

      console.log(`   ✅ Embedding generado (384 dims)`);
      console.log(`   📊 Sentiment: ${sentiment.label} (${sentiment.score})`);

      // 3. Buscar similares en la misma empresa
      const similars = await this.findSimilarExperiences(
        experience.id,
        embedding,
        experience.company_id
      );

      console.log(`   🔎 Similares encontrados: ${similars.length}`);

      // 4. Si hay similares, asignar a cluster existente o crear nuevo
      if (similars.length > 0) {
        await this.assignToCluster(experience, similars);
      } else {
        console.log(`   ℹ️ No hay similares → Experiencia única`);
      }

      // 5. Agregar embedding al índice Faiss
      await nlpClient.addToIndex(experience.company_id, [embedding]);

      return {
        processed: true,
        embedding_dimensions: embedding.length,
        sentiment: sentiment,
        similars_count: similars.length,
        cluster_assigned: experience.cluster_id !== null
      };

    } catch (error) {
      console.error('❌ [DEDUP] Error procesando experiencia:', error.message);
      throw error;
    }
  }

  /**
   * Buscar experiencias similares en la BD
   * @param {UUID} experienceId - ID de la experiencia a comparar
   * @param {Array<number>} embedding - Embedding de 384 dims
   * @param {number} companyId
   * @returns {Promise<Array>} - Experiencias similares
   */
  async findSimilarExperiences(experienceId, embedding, companyId) {
    try {
      // Opción 1: Usar Faiss (rápido para muchas experiencias)
      // const faissResults = await nlpClient.findSimilar(
      //   embedding,
      //   companyId,
      //   this.similarityThreshold
      // );

      // Opción 2: Comparar con todas las experiencias de la empresa (OK para < 10k)
      const allExperiences = await EmployeeExperience.findAll({
        where: {
          company_id: companyId,
          id: { [Op.ne]: experienceId },
          embedding: { [Op.ne]: null },
          status: { [Op.notIn]: ['REJECTED', 'DUPLICATE'] }
        },
        attributes: ['id', 'title', 'description', 'embedding', 'cluster_id'],
        limit: 1000  // Limitar para performance
      });

      if (allExperiences.length === 0) return [];

      // Calcular cosine similarity con cada una
      const similarities = [];

      for (const exp of allExperiences) {
        const otherEmbedding = exp.embedding;
        if (!otherEmbedding) continue;

        const similarity = this.cosineSimilarity(embedding, otherEmbedding);

        if (similarity >= this.similarityThreshold) {
          similarities.push({
            experience: exp,
            similarity
          });
        }
      }

      // Ordenar por similarity descendente
      similarities.sort((a, b) => b.similarity - a.similarity);

      return similarities;

    } catch (error) {
      console.error('❌ [DEDUP] Error buscando similares:', error.message);
      return [];
    }
  }

  /**
   * Asignar experiencia a cluster (existente o nuevo)
   * @param {Object} experience - Nueva experiencia
   * @param {Array} similars - Array de {experience, similarity}
   */
  async assignToCluster(experience, similars) {
    try {
      // Tomar la más similar
      const mostSimilar = similars[0];

      console.log(`   🎯 Más similar: "${mostSimilar.experience.title}" (${mostSimilar.similarity.toFixed(2)})`);

      // ¿La más similar ya tiene cluster?
      if (mostSimilar.experience.cluster_id) {
        // Agregar a cluster existente
        const cluster = await ExperienceCluster.findByPk(mostSimilar.experience.cluster_id);

        experience.cluster_id = cluster.id;
        experience.similarity_to_cluster = mostSimilar.similarity;
        experience.is_cluster_original = false;
        await experience.save();

        // Actualizar stats del cluster
        cluster.member_count += 1;
        cluster.total_upvotes += experience.upvotes;
        cluster.total_downvotes += experience.downvotes;

        // Recalcular avg_sentiment
        const members = await EmployeeExperience.findAll({
          where: { cluster_id: cluster.id }
        });
        const avgSentiment = members.reduce((sum, m) => sum + (m.sentiment_score || 0), 0) / members.length;
        cluster.avg_sentiment = avgSentiment;

        await cluster.save();

        console.log(`   ✅ Agregada a cluster existente: "${cluster.name}"`);
        console.log(`      Miembros totales: ${cluster.member_count}`);

      } else {
        // Crear nuevo cluster con estas dos experiencias
        const clusterName = this.generateClusterName(experience, mostSimilar.experience);

        const cluster = await ExperienceCluster.create({
          company_id: experience.company_id,
          name: clusterName,
          description: `Cluster generado automáticamente con ${similars.length + 1} experiencias similares`,
          auto_generated: true,
          type: experience.type || mostSimilar.experience.type,
          area: experience.area || mostSimilar.experience.area,
          priority: experience.priority || mostSimilar.experience.priority,
          member_count: 2,
          avg_sentiment: (experience.sentiment_score + mostSimilar.experience.sentiment_score) / 2
        });

        // Asignar ambas experiencias al nuevo cluster
        experience.cluster_id = cluster.id;
        experience.similarity_to_cluster = mostSimilar.similarity;
        experience.is_cluster_original = false;
        await experience.save();

        mostSimilar.experience.cluster_id = cluster.id;
        mostSimilar.experience.is_cluster_original = true;  // La primera es el original
        mostSimilar.experience.similarity_to_cluster = 1.0;
        await mostSimilar.experience.save();

        console.log(`   ✅ Nuevo cluster creado: "${clusterName}"`);
        console.log(`      Miembros iniciales: 2`);
      }

    } catch (error) {
      console.error('❌ [DEDUP] Error asignando a cluster:', error.message);
      throw error;
    }
  }

  /**
   * Generar nombre de cluster basado en contenido
   * @param {Object} exp1
   * @param {Object} exp2
   * @returns {string}
   */
  generateClusterName(exp1, exp2) {
    // Opción simple: tomar título de la primera
    const title = exp1.title || exp2.title;

    // Limitar a 50 caracteres
    if (title.length > 50) {
      return title.substring(0, 47) + '...';
    }

    return title;
  }

  /**
   * Cosine similarity entre dos embeddings
   * @param {Array<number>} vecA
   * @param {Array<number>} vecB
   * @returns {number} - Similarity 0-1
   */
  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (normA * normB);
  }

  /**
   * Re-clustering de todas las experiencias de una empresa (background job)
   * @param {number} companyId
   */
  async reclusterCompany(companyId) {
    console.log(`\n🔄 [DEDUP] Re-clustering empresa ${companyId}...`);

    try {
      // 1. Obtener todas las experiencias con embedding
      const experiences = await EmployeeExperience.findAll({
        where: {
          company_id: companyId,
          embedding: { [Op.ne]: null },
          status: { [Op.notIn]: ['REJECTED', 'DUPLICATE'] }
        },
        order: [['created_at', 'ASC']]
      });

      console.log(`   📊 Experiencias a procesar: ${experiences.length}`);

      if (experiences.length < 2) {
        console.log(`   ℹ️ Menos de 2 experiencias, no se puede clusterizar`);
        return { clustered: 0 };
      }

      // 2. Extraer embeddings
      const embeddings = experiences.map(e => e.embedding);

      // 3. Ejecutar DBSCAN
      const clusteringResult = await nlpClient.cluster(embeddings, 0.3, 2);

      console.log(`   🎯 Clusters detectados: ${clusteringResult.n_clusters}`);
      console.log(`   🔍 Outliers: ${clusteringResult.outliers.length}`);

      // 4. Crear/actualizar clusters
      const clusterMap = {};  // label -> cluster

      for (let i = 0; i < experiences.length; i++) {
        const exp = experiences[i];
        const label = clusteringResult.labels[i];

        if (label === -1) {
          // Outlier → no pertenece a ningún cluster
          exp.cluster_id = null;
          exp.is_cluster_original = false;
          await exp.save();
          continue;
        }

        // ¿Ya existe cluster para este label?
        if (!clusterMap[label]) {
          // Crear nuevo cluster
          const membersInCluster = experiences.filter((_, idx) => clusteringResult.labels[idx] === label);

          const cluster = await ExperienceCluster.create({
            company_id: companyId,
            name: `Cluster ${label}: ${membersInCluster[0].title.substring(0, 40)}`,
            auto_generated: true,
            member_count: membersInCluster.length,
            type: membersInCluster[0].type,
            area: membersInCluster[0].area
          });

          clusterMap[label] = cluster;
        }

        // Asignar experiencia a cluster
        exp.cluster_id = clusterMap[label].id;
        exp.is_cluster_original = (i === 0);  // Primera del cluster es original
        await exp.save();
      }

      console.log(`   ✅ Re-clustering completado`);

      return {
        clustered: experiences.length,
        clusters_created: Object.keys(clusterMap).length,
        outliers: clusteringResult.outliers.length
      };

    } catch (error) {
      console.error('❌ [DEDUP] Error en re-clustering:', error.message);
      throw error;
    }
  }
}

module.exports = new VoiceDeduplicationService();
