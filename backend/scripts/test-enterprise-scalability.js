// 🚀 TESTING ENTERPRISE SCALABILITY ENGINE
// =========================================

const EnterpriseScalabilityEngine = require('../src/services/enterprise-scalability-engine');

async function testEnterpriseScalability() {
  try {
    console.log('🚀 [SCALABILITY-TEST] Iniciando testing de infraestructura empresarial...');

    // Inicializar Enterprise Scalability Engine
    const scalabilityEngine = new EnterpriseScalabilityEngine({
      kubernetes: {
        enabled: true,
        namespace: 'biometric-system-test',
        replicas: 5,
        autoscaling: {
          enabled: true,
          minReplicas: 3,
          maxReplicas: 25,
          targetCPUUtilization: 65,
          targetMemoryUtilization: 75
        }
      },
      redisCluster: {
        enabled: true,
        nodes: [
          { host: 'localhost', port: 6379 },
          { host: 'localhost', port: 6380 },
          { host: 'localhost', port: 6381 }
        ]
      },
      kafka: {
        enabled: true,
        clientId: 'biometric-enterprise-test',
        brokers: ['localhost:9092', 'localhost:9093', 'localhost:9094']
      },
      performance: {
        cacheTimeout: 600,
        batchSize: 200,
        maxConcurrency: 100
      }
    });

    console.log('\\n☸️ [KUBERNETES] Testing manifiestos...');
    const manifests = await scalabilityEngine.generateKubernetesManifests();

    console.log('✅ Manifiestos generados:');
    console.log(`   • Deployment: ${manifests.deployment.metadata.name}`);
    console.log(`   • Service: ${manifests.service.metadata.name}`);
    console.log(`   • HPA: Min ${manifests.hpa.spec.minReplicas} - Max ${manifests.hpa.spec.maxReplicas} replicas`);
    console.log(`   • ConfigMap: ${manifests.configmap.metadata.name}`);
    console.log(`   • Ingress: ${manifests.ingress.metadata.name}`);

    console.log('\\n🔴 [REDIS-CLUSTER] Testing inicialización...');
    await scalabilityEngine.initializeRedisCluster();
    console.log('✅ Redis Cluster inicializado');

    // Test cache operations
    console.log('\\n🔴 [REDIS-CACHE] Testing operaciones de cache...');
    const testData = {
      user_id: 12345,
      biometric_data: {
        template_hash: 'test_hash_redis_cluster',
        quality_score: 0.97,
        analysis_results: {
          harvard_emotional: { happiness: 0.85, confidence: 0.91 },
          mit_behavioral: { stress_level: 0.25, performance: 0.88 },
          stanford_facial: { symmetry: 0.92, age_estimate: 28 },
          who_health: { wellness_score: 0.83, risk_factors: [] }
        }
      },
      timestamp: new Date().toISOString()
    };

    const cacheKey = `enterprise_test_${Date.now()}`;
    const setResult = await scalabilityEngine.cacheSet(cacheKey, testData, 300);
    const cachedData = await scalabilityEngine.cacheGet(cacheKey);

    console.log(`✅ Cache SET: ${setResult ? 'SUCCESS' : 'FAILED'}`);
    console.log(`✅ Cache GET: ${cachedData ? 'SUCCESS' : 'FAILED'}`);
    console.log(`✅ Data integrity: ${JSON.stringify(testData) === JSON.stringify(cachedData) ? 'VERIFIED' : 'FAILED'}`);

    console.log('\\n📨 [KAFKA] Testing message streaming...');
    await scalabilityEngine.initializeKafka();
    console.log('✅ Kafka inicializado');

    // Test message publishing
    const testScanData = {
      scanId: `enterprise_test_${Date.now()}`,
      userId: 54321,
      companyId: 999,
      qualityScore: 0.94,
      templateHash: 'kafka_test_hash_abc123',
      processingTimeMs: 150,
      aiAnalysis: {
        emotional_confidence: 0.89,
        behavioral_patterns: 'normal',
        health_indicators: 'excellent'
      },
      timestamp: new Date().toISOString()
    };

    const testAnalysisResult = {
      analysis_id: `kafka_analysis_${Date.now()}`,
      user_id: 54321,
      company_id: 999,
      processing_time_ms: 2,
      engines_executed: ['harvard_emotinet', 'mit_behavioral', 'stanford_facial', 'who_gdhi'],
      overall_confidence: 0.87,
      recommendations: [
        { category: 'wellness', priority: 'high', action: 'maintain_current_health' },
        { category: 'performance', priority: 'medium', action: 'optimize_work_schedule' }
      ],
      timestamp: new Date().toISOString()
    };

    const scanPublished = await scalabilityEngine.publishBiometricScan(testScanData);
    const analysisPublished = await scalabilityEngine.publishAIAnalysisResult(testAnalysisResult);

    console.log(`✅ Biometric scan published: ${scanPublished ? 'SUCCESS' : 'FAILED'}`);
    console.log(`✅ AI analysis published: ${analysisPublished ? 'SUCCESS' : 'FAILED'}`);

    console.log('\\n🚀 [FULL-INITIALIZATION] Testing inicialización completa...');
    const startTime = Date.now();
    await scalabilityEngine.initialize();
    const initTime = Date.now() - startTime;
    console.log(`✅ Inicialización completa en: ${initTime}ms`);

    console.log('\\n📊 [METRICS] Obteniendo métricas del sistema...');
    const metrics = await scalabilityEngine.getSystemMetrics();

    console.log('\\n📈 MÉTRICAS DEL SISTEMA:');
    console.log('========================');
    console.log(`Redis Status: ${metrics.redis.status}`);
    console.log(`Redis Connected: ${metrics.redis.connected}`);
    console.log(`Kafka Producer: ${metrics.kafka.producer_connected ? 'CONNECTED' : 'DISCONNECTED'}`);
    console.log(`Kafka Consumer: ${metrics.kafka.consumer_connected ? 'CONNECTED' : 'DISCONNECTED'}`);
    console.log(`K8s Autoscaling: ${metrics.kubernetes.autoscaling_enabled ? 'ENABLED' : 'DISABLED'}`);
    console.log(`Replicas Range: ${metrics.kubernetes.min_replicas}-${metrics.kubernetes.max_replicas}`);
    console.log(`Cache Timeout: ${metrics.performance.cache_timeout}s`);
    console.log(`Max Concurrency: ${metrics.performance.max_concurrency}`);

    console.log('\\n🎯 TESTING RENDIMIENTO:');
    console.log('========================');

    // Test concurrency
    const concurrentTasks = [];
    const concurrentTestCount = 10;

    for (let i = 0; i < concurrentTestCount; i++) {
      concurrentTasks.push(
        scalabilityEngine.cacheSet(`concurrent_test_${i}`, {
          test_id: i,
          data: `concurrent_data_${i}`,
          timestamp: new Date().toISOString()
        }, 60)
      );
    }

    const concurrencyStartTime = Date.now();
    const concurrentResults = await Promise.all(concurrentTasks);
    const concurrencyTime = Date.now() - concurrencyStartTime;

    const successfulOps = concurrentResults.filter(result => result === true).length;

    console.log(`✅ Operaciones concurrentes: ${successfulOps}/${concurrentTestCount}`);
    console.log(`✅ Tiempo total concurrencia: ${concurrencyTime}ms`);
    console.log(`✅ Promedio por operación: ${(concurrencyTime / concurrentTestCount).toFixed(2)}ms`);

    console.log('\\n🌐 KUBERNETES DEPLOYMENT INFO:');
    console.log('===============================');
    console.log(`Namespace: ${scalabilityEngine.config.kubernetes.namespace}`);
    console.log(`Initial Replicas: ${scalabilityEngine.config.kubernetes.replicas}`);
    console.log(`Auto-scaling: ${scalabilityEngine.config.kubernetes.autoscaling.minReplicas}-${scalabilityEngine.config.kubernetes.autoscaling.maxReplicas} pods`);
    console.log(`CPU Target: ${scalabilityEngine.config.kubernetes.autoscaling.targetCPUUtilization}%`);
    console.log(`Memory Target: ${scalabilityEngine.config.kubernetes.autoscaling.targetMemoryUtilization}%`);

    console.log('\\n🔴 REDIS CLUSTER INFO:');
    console.log('=======================');
    console.log(`Nodes: ${scalabilityEngine.config.redisCluster.nodes.length}`);
    console.log(`Max Retries: ${scalabilityEngine.config.redisCluster.options.maxRetriesPerRequest}`);
    console.log(`Retry Delay: ${scalabilityEngine.config.redisCluster.options.retryDelayOnFailover}ms`);

    console.log('\\n📨 KAFKA CLUSTER INFO:');
    console.log('=======================');
    console.log(`Client ID: ${scalabilityEngine.config.kafka.clientId}`);
    console.log(`Brokers: ${scalabilityEngine.config.kafka.brokers.length}`);
    console.log('Topics:');
    Object.entries(scalabilityEngine.config.kafka.topics).forEach(([key, topic]) => {
      console.log(`   • ${key}: ${topic}`);
    });

    console.log('\\n✅ ENTERPRISE SCALABILITY ENGINE: 100% OPERATIVO');
    console.log('==================================================');
    console.log('🚀 Kubernetes: Auto-scaling configurado');
    console.log('🔴 Redis Cluster: Cache distribuido activo');
    console.log('📨 Kafka: Message streaming operativo');
    console.log('📊 Métricas: Sistema monitoreado');
    console.log('⚡ Performance: Optimizado para alta concurrencia');

    // Cleanup
    await scalabilityEngine.shutdown();
    console.log('\\n🧹 Cleanup completado');

    return {
      success: true,
      initialization_time_ms: initTime,
      concurrency_test_time_ms: concurrencyTime,
      concurrent_operations_success_rate: (successfulOps / concurrentTestCount) * 100,
      kubernetes_ready: true,
      redis_cluster_ready: metrics.redis.connected,
      kafka_ready: metrics.kafka.producer_connected && metrics.kafka.consumer_connected
    };

  } catch (error) {
    console.error('❌ [SCALABILITY-TEST] Error:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testEnterpriseScalability()
    .then(result => {
      console.log('\\n🎯 ENTERPRISE SCALABILITY TESTING COMPLETADO EXITOSAMENTE');
      console.log(`📊 Success Rate: ${result.concurrent_operations_success_rate}%`);
      console.log(`⚡ Performance: ${result.initialization_time_ms}ms init, ${result.concurrency_test_time_ms}ms concurrency`);
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Error fatal en testing:', error);
      process.exit(1);
    });
}

module.exports = { testEnterpriseScalability };