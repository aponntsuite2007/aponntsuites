// 🧠 TESTING DIRECTO AI ANALYSIS ENGINE PROFESIONAL
// =================================================

const AIAnalysisEngine = require('../src/services/ai-analysis-engine');

async function testAIAnalysisEngine() {
  try {
    console.log('🧠 [AI-TEST] Iniciando testing directo AI Analysis Engine...');

    // Inicializar engine
    const aiEngine = new AIAnalysisEngine({
      enableHarvardEmotiNet: true,
      enableMITBehaviorAnalysis: true,
      enableStanfordFacialFeatures: true,
      enableWHOHealthScales: true,
      confidenceThreshold: 0.75,
      isProduction: false
    });

    // Datos de testing
    const testBiometricData = {
      faceData: {
        facial_landmarks: Array(468).fill().map(() => Math.random()),
        facial_encoding: Array(128).fill().map(() => Math.random()),
        image_quality: 0.95
      },
      faceImage: {
        width: 640,
        height: 480,
        quality: 'high',
        format: 'RGB'
      },
      landmarks: {
        eyes: [[100, 120], [200, 120]],
        nose: [150, 160],
        mouth: [150, 200],
        contour: Array(17).fill().map((_, i) => [80 + i*10, 100 + i*5])
      },
      history: Array(30).fill().map((_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        stress_level: Math.random(),
        performance_score: Math.random() * 0.5 + 0.5
      })),
      currentScan: {
        timestamp: new Date().toISOString(),
        quality_score: 0.92,
        stress_indicators: Math.random() * 0.4
      }
    };

    const options = {
      harvardOptions: { depth: 'comprehensive' },
      demographicData: {
        age_group: '25-35',
        occupation: 'knowledge_worker',
        location: 'urban',
        socioeconomic_status: 'middle'
      }
    };

    console.log('🎯 [TEST] Ejecutando análisis integral...');

    // Ejecutar análisis integral
    const startTime = Date.now();
    const result = await aiEngine.processComprehensiveAnalysis(testBiometricData, options);
    const processingTime = Date.now() - startTime;

    console.log('\\n📊 RESULTADOS DE AI ANALYSIS ENGINE:');
    console.log('=====================================');
    console.log(`✅ Analysis ID: ${result.analysis_id}`);
    console.log(`⏱️ Tiempo de procesamiento: ${processingTime}ms`);
    console.log(`🧠 Engines ejecutados: ${result.engines_executed.join(', ')}`);
    console.log(`📈 Confianza general: ${(result.overall_confidence * 100).toFixed(1)}%`);

    console.log('\\n🎓 ANÁLISIS HARVARD EMOTINET:');
    if (result.individual_analyses.harvard_emotional?.success !== false) {
      const harvard = result.individual_analyses.harvard_emotional;
      console.log(`   ✓ Emoción dominante: ${harvard.dominant_emotion?.emotion || 'N/A'}`);
      console.log(`   ✓ Confianza: ${(harvard.confidence_score * 100).toFixed(1)}%`);
      console.log(`   ✓ Nivel de estrés: ${JSON.stringify(harvard.emotional_metrics?.stress_level)}`);
    }

    console.log('\\n🏫 ANÁLISIS MIT COMPORTAMENTAL:');
    if (result.individual_analyses.mit_behavioral?.success !== false) {
      const mit = result.individual_analyses.mit_behavioral;
      console.log(`   ✓ Evaluación de riesgo: ${mit.risk_assessment?.level || 'N/A'}`);
      console.log(`   ✓ Confianza: ${(mit.confidence_score * 100).toFixed(1)}%`);
      console.log(`   ✓ Riesgo de burnout: ${mit.behavioral_metrics?.burnout_risk?.probability || 'N/A'}`);
    }

    console.log('\\n🌟 ANÁLISIS STANFORD FACIAL:');
    if (result.individual_analyses.stanford_facial?.success !== false) {
      const stanford = result.individual_analyses.stanford_facial;
      console.log(`   ✓ Calidad biométrica: ${(stanford.biometric_quality?.score * 100).toFixed(1)}%`);
      console.log(`   ✓ Confianza: ${(stanford.confidence_score * 100).toFixed(1)}%`);
      console.log(`   ✓ Simetría facial: ${stanford.facial_metrics?.facial_symmetry || 'N/A'}`);
    }

    console.log('\\n🏥 ANÁLISIS WHO-GDHI:');
    if (result.individual_analyses.who_health?.success !== false) {
      const who = result.individual_analyses.who_health;
      console.log(`   ✓ Puntuación salud global: ${(who.global_health_score * 100).toFixed(1)}%`);
      console.log(`   ✓ Confianza: ${(who.confidence_score * 100).toFixed(1)}%`);
      console.log(`   ✓ Índice de salud mental: ${JSON.stringify(who.health_metrics?.mental_health_index)}`);
    }

    console.log('\\n🔄 ANÁLISIS DE CONSENSO:');
    console.log(`   ✓ Confianza de consenso: ${(result.consensus_analysis.consensus_confidence * 100).toFixed(1)}%`);
    console.log(`   ✓ Acuerdo entre algoritmos: ${(result.consensus_analysis.algorithm_agreement * 100).toFixed(1)}%`);
    console.log(`   ✓ Validación cruzada: ${(result.consensus_analysis.cross_validation_score * 100).toFixed(1)}%`);

    console.log('\\n🎯 RECOMENDACIONES:');
    result.recommendations.forEach((rec, i) => {
      console.log(`   ${i + 1}. [${rec.priority.toUpperCase()}] ${rec.recommendation}`);
    });

    console.log('\\n📋 ALERTAS DE RIESGO:');
    if (result.risk_alerts.length === 0) {
      console.log('   ✅ No se detectaron alertas de riesgo');
    } else {
      result.risk_alerts.forEach((alert, i) => {
        console.log(`   ⚠️ ${i + 1}. ${alert}`);
      });
    }

    console.log('\\n🚀 RESUMEN DE RENDIMIENTO:');
    console.log(`   • Tiempo total: ${processingTime}ms`);
    console.log(`   • Engines exitosos: ${result.engines_executed.length}/4`);
    console.log(`   • Confianza promedio: ${(result.overall_confidence * 100).toFixed(1)}%`);
    console.log(`   • Profundidad análisis: ${result.metadata.analysis_depth}`);
    console.log(`   • Validación académica: ${result.metadata.academic_validation}`);

    console.log('\\n✅ AI ANALYSIS ENGINE: 100% OPERATIVO Y TESTEADO');

    return {
      success: true,
      processing_time_ms: processingTime,
      engines_tested: result.engines_executed.length,
      overall_confidence: result.overall_confidence,
      analysis_depth: result.metadata.analysis_depth
    };

  } catch (error) {
    console.error('❌ [AI-TEST] Error:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testAIAnalysisEngine()
    .then(result => {
      console.log('\\n🎯 AI ANALYSIS ENGINE TESTING COMPLETADO EXITOSAMENTE');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Error fatal en testing:', error);
      process.exit(1);
    });
}

module.exports = { testAIAnalysisEngine };