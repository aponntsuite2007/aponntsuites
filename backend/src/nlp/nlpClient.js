/**
 * ============================================================================
 * NLP CLIENT - Conexión con Python NLP Microservice
 * ============================================================================
 *
 * Cliente para comunicarse con el microservicio Python de NLP.
 * Maneja embeddings, similarity, clustering, sentiment, etc.
 *
 * @version 1.0.0
 * @date 2025-12-22
 * ============================================================================
 */

const axios = require('axios');

const NLP_SERVICE_URL = process.env.NLP_SERVICE_URL || 'http://localhost:5000';
const NLP_TIMEOUT = parseInt(process.env.NLP_SERVICE_TIMEOUT || '30000');

class NLPClient {
  constructor() {
    this.client = axios.create({
      baseURL: NLP_SERVICE_URL,
      timeout: NLP_TIMEOUT,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Health check del servicio NLP
   */
  async healthCheck() {
    try {
      const response = await this.client.get('/api/nlp/health');
      return { available: true, ...response.data };
    } catch (error) {
      console.error('❌ [NLP-CLIENT] Servicio NLP no disponible:', error.message);
      return { available: false, error: error.message };
    }
  }

  /**
   * Generar embedding de un texto
   * @param {string} text - Texto a embedear
   * @returns {Promise<Array<number>>} - Vector de 384 dimensiones
   */
  async embed(text) {
    try {
      const response = await this.client.post('/api/nlp/embed', { text });
      return response.data.embedding;
    } catch (error) {
      console.error('❌ [NLP-CLIENT] Error en embed:', error.message);
      throw error;
    }
  }

  /**
   * Generar embeddings en batch
   * @param {Array<string>} texts - Array de textos
   * @returns {Promise<Array<Array<number>>>} - Array de embeddings
   */
  async embedBatch(texts) {
    try {
      const response = await this.client.post('/api/nlp/embed-batch', { texts });
      return response.data.embeddings;
    } catch (error) {
      console.error('❌ [NLP-CLIENT] Error en embedBatch:', error.message);
      throw error;
    }
  }

  /**
   * Calcular similarity entre dos textos
   * @param {string} text1
   * @param {string} text2
   * @param {number} threshold - Umbral para considerar duplicado (default: 0.85)
   * @returns {Promise<{similarity: number, is_duplicate: boolean}>}
   */
  async calculateSimilarity(text1, text2, threshold = 0.85) {
    try {
      const response = await this.client.post('/api/nlp/similarity', {
        text1,
        text2,
        threshold
      });
      return response.data;
    } catch (error) {
      console.error('❌ [NLP-CLIENT] Error en calculateSimilarity:', error.message);
      throw error;
    }
  }

  /**
   * Buscar textos similares en índice Faiss
   * @param {string} text - Texto query
   * @param {number} companyId - ID de empresa
   * @param {number} threshold - Similarity threshold (default: 0.85)
   * @param {number} topK - Top K resultados (default: 5)
   * @returns {Promise<Array<{index: number, similarity: number, distance: number}>>}
   */
  async findSimilar(text, companyId, threshold = 0.85, topK = 5) {
    try {
      const response = await this.client.post('/api/nlp/find-similar', {
        text,
        company_id: companyId,
        threshold,
        top_k: topK
      });
      return response.data.similar;
    } catch (error) {
      console.error('❌ [NLP-CLIENT] Error en findSimilar:', error.message);
      throw error;
    }
  }

  /**
   * Agregar embeddings al índice Faiss
   * @param {number} companyId
   * @param {Array<Array<number>>} embeddings
   */
  async addToIndex(companyId, embeddings) {
    try {
      const response = await this.client.post('/api/nlp/add-to-index', {
        company_id: companyId,
        embeddings
      });
      return response.data;
    } catch (error) {
      console.error('❌ [NLP-CLIENT] Error en addToIndex:', error.message);
      throw error;
    }
  }

  /**
   * Ejecutar DBSCAN clustering
   * @param {Array<Array<number>>} embeddings
   * @param {number} eps - Radio de vecindad (default: 0.3)
   * @param {number} minSamples - Mínimo de muestras por cluster (default: 2)
   */
  async cluster(embeddings, eps = 0.3, minSamples = 2) {
    try {
      const response = await this.client.post('/api/nlp/cluster', {
        embeddings,
        eps,
        min_samples: minSamples
      });
      return response.data;
    } catch (error) {
      console.error('❌ [NLP-CLIENT] Error en cluster:', error.message);
      throw error;
    }
  }

  /**
   * Análisis de sentimiento
   * @param {string} text
   */
  async analyzeSentiment(text) {
    try {
      const response = await this.client.post('/api/nlp/sentiment', { text });
      return response.data;
    } catch (error) {
      console.error('❌ [NLP-CLIENT] Error en analyzeSentiment:', error.message);
      throw error;
    }
  }

  /**
   * Procesar experiencia completa (embedding + sentiment)
   * @param {string} text - Texto completo (title + description)
   * @returns {Promise<{embedding: Array, sentiment: Object}>}
   */
  async processExperience(text) {
    try {
      const [embedding, sentiment] = await Promise.all([
        this.embed(text),
        this.analyzeSentiment(text)
      ]);

      return { embedding, sentiment };
    } catch (error) {
      console.error('❌ [NLP-CLIENT] Error en processExperience:', error.message);
      throw error;
    }
  }
}

// Singleton instance
const nlpClient = new NLPClient();

module.exports = nlpClient;
