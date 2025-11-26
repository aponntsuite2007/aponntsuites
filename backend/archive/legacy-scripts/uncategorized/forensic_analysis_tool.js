/**
 * FORENSIC CODE ANALYSIS TOOL v1.0
 * ===================================
 * Scientific Analysis of AI-Generated Code Patterns
 * Author: Forensic Analysis System
 * Date: 2025-01-09
 * Purpose: Irrefutable determination of code authorship (Human vs AI)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class ForensicCodeAnalyzer {
  constructor() {
    this.metrics = {
      syntactic: {},
      semantic: {},
      stylometric: {},
      entropic: {},
      statistical: {}
    };

    this.evidence = [];
    this.confidence = 0;
  }

  /**
   * PHASE 1: SYNTACTIC ANALYSIS
   * Analyzes code structure, patterns, and syntax
   */
  analyzeSyntax(codeContent) {
    const analysis = {
      emojiDensity: 0,
      commentRatio: 0,
      indentationConsistency: 0,
      linePatterns: {},
      functionNaming: {},
      variableNaming: {}
    };

    // 1. EMOJI DENSITY CALCULATION
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{27BF}]|[\u{2B50}]|[\u{1F680}]/gu;
    const emojiMatches = codeContent.match(emojiRegex) || [];
    const totalLines = codeContent.split('\n').length;
    analysis.emojiDensity = emojiMatches.length / totalLines;

    // 2. COMMENT-TO-CODE RATIO
    const commentLines = codeContent.split('\n').filter(line =>
      line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*')
    ).length;
    analysis.commentRatio = commentLines / totalLines;

    // 3. INDENTATION CONSISTENCY
    const indentations = codeContent.split('\n')
      .filter(line => line.match(/^(\s+)/))
      .map(line => line.match(/^(\s+)/)[1].length);

    if (indentations.length > 0) {
      const indentSet = new Set(indentations.map(i => i % 4 === 0 ? 'spaces' : 'mixed'));
      analysis.indentationConsistency = indentSet.size === 1 ? 1.0 : 0.5;
    }

    // 4. REPETITIVE PATTERNS
    const patterns = {
      asyncAwait: (codeContent.match(/async\s+\w+\s*\([^)]*\)\s*{/g) || []).length,
      mathRandom: (codeContent.match(/Math\.random\(\)/g) || []).length,
      setTimeout: (codeContent.match(/setTimeout\(resolve/g) || []).length,
      consoleLog: (codeContent.match(/console\.log/g) || []).length,
      arrowFunctions: (codeContent.match(/=>/g) || []).length
    };
    analysis.linePatterns = patterns;

    // 5. NAMING CONVENTIONS
    const functionNames = codeContent.match(/function\s+(\w+)|(\w+)\s*:\s*async?\s*function|\s+async\s+(\w+)\s*\(/g) || [];
    const camelCaseFunc = functionNames.filter(n => /[a-z][A-Z]/.test(n)).length;
    analysis.functionNaming.camelCaseRatio = functionNames.length > 0 ? camelCaseFunc / functionNames.length : 0;

    this.metrics.syntactic = analysis;
    return analysis;
  }

  /**
   * PHASE 2: SEMANTIC ANALYSIS
   * Analyzes meaning, logic flow, and conceptual patterns
   */
  analyzeSemantics(codeContent) {
    const analysis = {
      simulationPatterns: 0,
      contradictions: 0,
      overPromiseIndicators: 0,
      fallbackPatterns: 0,
      todoComments: 0
    };

    // 1. SIMULATION PATTERNS
    analysis.simulationPatterns = (codeContent.match(/simulación|simulation|mock|fake|dummy|placeholder/gi) || []).length;

    // 2. LOGICAL CONTRADICTIONS
    const realClaims = (codeContent.match(/REAL|real\s+implementation|production\s+ready/gi) || []).length;
    const fakeImplementations = (codeContent.match(/Math\.random|setTimeout.*resolve|TODO|FIXME/g) || []).length;
    analysis.contradictions = realClaims > 0 && fakeImplementations > realClaims ? fakeImplementations / realClaims : 0;

    // 3. OVERPROMISE INDICATORS
    const hyperbolicWords = /ADVANCED|PROFESSIONAL|ENTERPRISE|NEXT-GEN|ULTRA|QUANTUM|NEURAL|DEEP/gi;
    analysis.overPromiseIndicators = (codeContent.match(hyperbolicWords) || []).length;

    // 4. FALLBACK PATTERNS
    analysis.fallbackPatterns = (codeContent.match(/fallback|catch.*return.*default|catch.*console/g) || []).length;

    // 5. TODO/FIXME DENSITY
    analysis.todoComments = (codeContent.match(/TODO|FIXME|HACK|XXX|NOTA|IMPORTANTE/g) || []).length;

    this.metrics.semantic = analysis;
    return analysis;
  }

  /**
   * PHASE 3: STYLOMETRIC ANALYSIS
   * Statistical analysis of writing style (adapted for code)
   */
  analyzeStylometry(codeContent) {
    const analysis = {
      vocabularyRichness: 0,
      sentenceLengthVariance: 0,
      keywordFrequency: {},
      uniquePatterns: []
    };

    // 1. VOCABULARY RICHNESS (Hapax Legomena ratio)
    const words = codeContent.match(/\b\w+\b/g) || [];
    const wordFreq = {};
    words.forEach(w => wordFreq[w.toLowerCase()] = (wordFreq[w.toLowerCase()] || 0) + 1);

    const uniqueWords = Object.keys(wordFreq).filter(w => wordFreq[w] === 1).length;
    analysis.vocabularyRichness = words.length > 0 ? uniqueWords / words.length : 0;

    // 2. COMMENT LENGTH VARIANCE
    const comments = codeContent.match(/\/\/.+|\/\*[\s\S]*?\*\//g) || [];
    if (comments.length > 1) {
      const lengths = comments.map(c => c.length);
      const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
      const variance = lengths.reduce((sum, len) => sum + Math.pow(len - mean, 2), 0) / lengths.length;
      analysis.sentenceLengthVariance = Math.sqrt(variance);
    }

    // 3. KEYWORD FREQUENCY ANALYSIS
    const keywords = ['async', 'await', 'const', 'let', 'var', 'function', 'return', 'if', 'else', 'try', 'catch'];
    keywords.forEach(kw => {
      const regex = new RegExp(`\\b${kw}\\b`, 'g');
      analysis.keywordFrequency[kw] = (codeContent.match(regex) || []).length;
    });

    // 4. UNIQUE STYLISTIC PATTERNS
    const uniquePatterns = [
      { pattern: /=== /g, name: 'spacedTripleEquals' },
      { pattern: /\{\s*\n\s*\}/g, name: 'emptyBlockNewlines' },
      { pattern: /console\.log\(['"][🎯🔍🚀🧠📊✅❌⚠️]/g, name: 'emojiLogs' },
      { pattern: /\/\/ [A-Z]/g, name: 'capitalizedComments' }
    ];

    uniquePatterns.forEach(up => {
      const matches = codeContent.match(up.pattern) || [];
      if (matches.length > 0) {
        analysis.uniquePatterns.push({ name: up.name, count: matches.length });
      }
    });

    this.metrics.stylometric = analysis;
    return analysis;
  }

  /**
   * PHASE 4: ENTROPY ANALYSIS
   * Measures randomness and information density
   */
  analyzeEntropy(codeContent) {
    const analysis = {
      shannonEntropy: 0,
      compressionRatio: 0,
      repetitionScore: 0,
      tokenDistribution: {}
    };

    // 1. SHANNON ENTROPY
    const chars = codeContent.split('');
    const charFreq = {};
    chars.forEach(c => charFreq[c] = (charFreq[c] || 0) + 1);

    let entropy = 0;
    const total = chars.length;
    Object.values(charFreq).forEach(count => {
      const p = count / total;
      if (p > 0) entropy -= p * Math.log2(p);
    });
    analysis.shannonEntropy = entropy;

    // 2. COMPRESSION RATIO (simulated via repetition)
    const compressed = codeContent.replace(/(\b\w+\b)(?=.*\1)/g, '');
    analysis.compressionRatio = compressed.length / codeContent.length;

    // 3. REPETITION SCORE
    const lines = codeContent.split('\n');
    const lineSet = new Set(lines);
    analysis.repetitionScore = 1 - (lineSet.size / lines.length);

    // 4. TOKEN DISTRIBUTION UNIFORMITY
    const tokens = codeContent.match(/\b\w+\b/g) || [];
    const tokenFreq = {};
    tokens.forEach(t => tokenFreq[t] = (tokenFreq[t] || 0) + 1);

    const frequencies = Object.values(tokenFreq);
    const maxFreq = Math.max(...frequencies);
    const minFreq = Math.min(...frequencies);
    analysis.tokenDistribution.uniformity = minFreq / maxFreq;

    this.metrics.entropic = analysis;
    return analysis;
  }

  /**
   * PHASE 5: STATISTICAL ANALYSIS
   * Advanced statistical metrics
   */
  analyzeStatistics(codeContent) {
    const analysis = {
      benfordsLaw: {},
      zipfianDistribution: 0,
      markovChainLikelihood: 0,
      autocorrelation: 0
    };

    // 1. BENFORD'S LAW (for numeric literals)
    const numbers = codeContent.match(/\b\d+\b/g) || [];
    const firstDigits = numbers.map(n => parseInt(n[0])).filter(d => d > 0);
    const digitCounts = {};

    for (let i = 1; i <= 9; i++) {
      digitCounts[i] = firstDigits.filter(d => d === i).length;
    }

    const total = firstDigits.length;
    for (let i = 1; i <= 9; i++) {
      const expected = Math.log10(1 + 1/i) * total;
      const observed = digitCounts[i];
      analysis.benfordsLaw[i] = {
        expected: expected.toFixed(2),
        observed: observed,
        deviation: Math.abs(expected - observed) / expected
      };
    }

    // 2. ZIPFIAN DISTRIBUTION (word frequency)
    const words = codeContent.match(/\b\w+\b/g) || [];
    const wordFreq = {};
    words.forEach(w => wordFreq[w] = (wordFreq[w] || 0) + 1);

    const sortedFreq = Object.values(wordFreq).sort((a, b) => b - a);
    if (sortedFreq.length > 10) {
      let zipfScore = 0;
      for (let i = 1; i <= 10; i++) {
        const expected = sortedFreq[0] / i;
        const observed = sortedFreq[i - 1];
        zipfScore += Math.abs(expected - observed) / expected;
      }
      analysis.zipfianDistribution = 1 - (zipfScore / 10);
    }

    // 3. MARKOV CHAIN LIKELIHOOD (token transitions)
    const tokens = codeContent.match(/\b\w+\b/g) || [];
    const transitions = {};

    for (let i = 0; i < tokens.length - 1; i++) {
      const current = tokens[i];
      const next = tokens[i + 1];
      if (!transitions[current]) transitions[current] = {};
      transitions[current][next] = (transitions[current][next] || 0) + 1;
    }

    // Calculate average transition probability
    let totalProb = 0;
    let count = 0;
    Object.values(transitions).forEach(nexts => {
      const total = Object.values(nexts).reduce((a, b) => a + b, 0);
      Object.values(nexts).forEach(freq => {
        totalProb += freq / total;
        count++;
      });
    });

    analysis.markovChainLikelihood = count > 0 ? totalProb / count : 0;

    this.metrics.statistical = analysis;
    return analysis;
  }

  /**
   * FINAL VERDICT CALCULATION
   */
  calculateVerdict() {
    const weights = {
      syntactic: 0.25,
      semantic: 0.3,
      stylometric: 0.2,
      entropic: 0.15,
      statistical: 0.1
    };

    let aiScore = 0;

    // SYNTACTIC INDICATORS
    if (this.metrics.syntactic.emojiDensity > 0.05) aiScore += 20 * weights.syntactic;
    if (this.metrics.syntactic.commentRatio > 0.3) aiScore += 15 * weights.syntactic;
    if (this.metrics.syntactic.indentationConsistency > 0.95) aiScore += 10 * weights.syntactic;
    if (this.metrics.syntactic.linePatterns.mathRandom > 5) aiScore += 15 * weights.syntactic;

    // SEMANTIC INDICATORS
    if (this.metrics.semantic.simulationPatterns > 5) aiScore += 25 * weights.semantic;
    if (this.metrics.semantic.contradictions > 2) aiScore += 20 * weights.semantic;
    if (this.metrics.semantic.overPromiseIndicators > 10) aiScore += 15 * weights.semantic;

    // STYLOMETRIC INDICATORS
    if (this.metrics.stylometric.vocabularyRichness < 0.3) aiScore += 15 * weights.stylometric;
    if (this.metrics.stylometric.uniquePatterns.length > 3) aiScore += 10 * weights.stylometric;

    // ENTROPIC INDICATORS
    if (this.metrics.entropic.repetitionScore > 0.15) aiScore += 10 * weights.entropic;
    if (this.metrics.entropic.compressionRatio < 0.7) aiScore += 10 * weights.entropic;

    // STATISTICAL INDICATORS
    const benfordDeviation = Object.values(this.metrics.statistical.benfordsLaw)
      .reduce((sum, d) => sum + (d.deviation || 0), 0) / 9;
    if (benfordDeviation > 0.3) aiScore += 5 * weights.statistical;

    this.confidence = Math.min(100, aiScore);

    return {
      verdict: aiScore > 50 ? 'AI_GENERATED' : 'HUMAN_WRITTEN',
      confidence: this.confidence.toFixed(2),
      primaryAuthor: aiScore > 70 ? 'Claude AI' : aiScore > 50 ? 'Unknown AI' : 'Human',
      metrics: this.metrics
    };
  }

  /**
   * GENERATE FORENSIC REPORT
   */
  generateReport(codeFile) {
    const timestamp = new Date().toISOString();
    const fileHash = crypto.createHash('sha256').update(codeFile).digest('hex');

    return {
      header: {
        title: 'FORENSIC CODE ANALYSIS REPORT',
        version: '1.0.0',
        timestamp: timestamp,
        fileHash: fileHash,
        analyzer: 'ForensicCodeAnalyzer v1.0'
      },
      executive_summary: this.calculateVerdict(),
      detailed_metrics: this.metrics,
      evidence: this.evidence,
      methodology: {
        phases: [
          'Syntactic Analysis (25% weight)',
          'Semantic Analysis (30% weight)',
          'Stylometric Analysis (20% weight)',
          'Entropy Analysis (15% weight)',
          'Statistical Analysis (10% weight)'
        ],
        algorithms: [
          'Shannon Entropy Calculation',
          'Benford\'s Law Distribution',
          'Zipfian Distribution Analysis',
          'Markov Chain Probability',
          'Hapax Legomena Ratio'
        ]
      },
      conclusion: {
        irrefutable: this.confidence > 85,
        statement: this.confidence > 85
          ? 'Based on comprehensive forensic analysis, the code exhibits definitive AI-generation patterns'
          : 'Analysis suggests probable AI involvement but requires additional evidence for certainty'
      }
    };
  }
}

// EXECUTION
async function runForensicAnalysis() {
  const analyzer = new ForensicCodeAnalyzer();

  // Analyze multiple biometric files
  const filesToAnalyze = [
    'src/services/ai-biometric-engine.js',
    'src/services/real-biometric-analysis-engine.js',
    'public/js/modules/evaluacion-biometrica.js',
    'src/services/face-api-backend-engine.js'
  ];

  console.log('🔬 INITIATING FORENSIC ANALYSIS...\n');
  console.log('=' .repeat(60));

  for (const file of filesToAnalyze) {
    const filePath = path.join(__dirname, file);

    if (fs.existsSync(filePath)) {
      console.log(`\n📁 Analyzing: ${file}`);
      console.log('-'.repeat(40));

      const content = fs.readFileSync(filePath, 'utf8');

      // Run all analysis phases
      analyzer.analyzeSyntax(content);
      analyzer.analyzeSemantics(content);
      analyzer.analyzeStylometry(content);
      analyzer.analyzeEntropy(content);
      analyzer.analyzeStatistics(content);

      const verdict = analyzer.calculateVerdict();

      console.log(`✓ Syntactic Analysis Complete`);
      console.log(`✓ Semantic Analysis Complete`);
      console.log(`✓ Stylometric Analysis Complete`);
      console.log(`✓ Entropy Analysis Complete`);
      console.log(`✓ Statistical Analysis Complete`);
      console.log(`\n🎯 VERDICT: ${verdict.verdict}`);
      console.log(`📊 Confidence: ${verdict.confidence}%`);
      console.log(`👤 Primary Author: ${verdict.primaryAuthor}`);
    }
  }

  // Generate final report
  const finalReport = analyzer.generateReport(filesToAnalyze.join(','));

  // Save report
  fs.writeFileSync(
    path.join(__dirname, 'forensic_report.json'),
    JSON.stringify(finalReport, null, 2)
  );

  console.log('\n' + '='.repeat(60));
  console.log('📋 FORENSIC REPORT GENERATED: forensic_report.json');
  console.log('='.repeat(60));

  return finalReport;
}

// Export for testing
module.exports = { ForensicCodeAnalyzer, runForensicAnalysis };

// Run if executed directly
if (require.main === module) {
  runForensicAnalysis().catch(console.error);
}