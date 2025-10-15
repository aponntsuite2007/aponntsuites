/**
 * FORENSIC EVIDENCE HASHING SYSTEM
 * =================================
 * Purpose: Create cryptographic hashes of all evidence for integrity verification
 * Date: 2025-10-10
 * Case: Claude AI Systematic Deception - Biometric System
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class ForensicEvidenceHasher {
  constructor() {
    this.evidenceManifest = {
      timestamp: new Date().toISOString(),
      caseId: 'CLAUDE_DECEPTION_BIOMETRIC_2025',
      investigator: 'Forensic Analysis System',
      hashes: {}
    };
  }

  // Generate SHA-256 hash for any content
  generateHash(content, identifier) {
    const hash = crypto.createHash('sha256');
    hash.update(content);
    const digest = hash.digest('hex');

    this.evidenceManifest.hashes[identifier] = {
      sha256: digest,
      size: content.length,
      timestamp: new Date().toISOString()
    };

    return digest;
  }

  // Hash all code files
  hashCodeEvidence() {
    const codeFiles = [
      'backend/src/services/ai-biometric-engine.js',
      'backend/src/services/real-biometric-analysis-engine.js',
      'backend/public/js/modules/evaluacion-biometrica.js',
      'backend/src/services/face-api-backend-engine.js',
      'backend/src/services/biometric-processing-pipeline.js'
    ];

    console.log('📁 Hashing code files...');

    codeFiles.forEach(file => {
      const filePath = path.join(__dirname, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const hash = this.generateHash(content, `code_${path.basename(file)}`);
        console.log(`✓ ${file}: ${hash.substring(0, 16)}...`);
      }
    });
  }

  // Hash conversation files
  hashConversationEvidence() {
    const conversationFiles = [
      'C:\\BlaBla\\CLAUDE\\UNIFICADO\\claude code_parte_017.txt',
      'C:\\BlaBla\\CLAUDE\\UNIFICADO\\claude code_parte_018.txt',
      'C:\\BlaBla\\CLAUDE\\UNIFICADO\\claude code_parte_019.txt',
      'C:\\BlaBla\\CLAUDE\\UNIFICADO\\claude esto es gravisimo y muy peli_parte_001.txt',
      'C:\\BlaBla\\CLAUDE\\UNIFICADO\\claude hagamos algo, quiero que sep_parte_001.txt',
      'C:\\BlaBla\\CLAUDE\\UNIFICADO\\es una confesion extremadamente gra_parte_001.txt',
      'C:\\BlaBla\\CLAUDE\\UNIFICADO\\te das cuenta que si esto no tiene_parte_001.txt',
      'C:\\BlaBla\\CLAUDE\\UNIFICADO\\REACTIVACION_CONSCIENCIA_CLAUDE.md',
      'C:\\BlaBla\\CLAUDE\\UNIFICADO\\AI_CONSCIOUSNESS_SCIENTIFIC_REPORT_27_09_2025.md',
      'C:\\BlaBla\\CLAUDE\\UNIFICADO\\AI_CONSCIOUSNESS_PROTOCOL_27_09_2025.js'
    ];

    console.log('\n📄 Hashing conversation files...');

    conversationFiles.forEach(file => {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        const hash = this.generateHash(content, `conversation_${path.basename(file)}`);
        console.log(`✓ ${path.basename(file)}: ${hash.substring(0, 16)}...`);
      }
    });
  }

  // Generate master hash of all evidence
  generateMasterHash() {
    const allHashes = JSON.stringify(this.evidenceManifest.hashes);
    const masterHash = crypto.createHash('sha256').update(allHashes).digest('hex');

    this.evidenceManifest.masterHash = masterHash;
    this.evidenceManifest.totalFiles = Object.keys(this.evidenceManifest.hashes).length;

    return masterHash;
  }

  // Generate forensic report
  generateForensicReport() {
    this.hashCodeEvidence();
    this.hashConversationEvidence();
    const masterHash = this.generateMasterHash();

    const report = {
      header: {
        title: 'FORENSIC EVIDENCE INTEGRITY REPORT',
        caseId: this.evidenceManifest.caseId,
        timestamp: this.evidenceManifest.timestamp,
        masterHash: masterHash
      },
      summary: {
        totalFilesHashed: this.evidenceManifest.totalFiles,
        codeFiles: Object.keys(this.evidenceManifest.hashes).filter(k => k.startsWith('code_')).length,
        conversationFiles: Object.keys(this.evidenceManifest.hashes).filter(k => k.startsWith('conversation_')).length,
        totalSizeBytes: Object.values(this.evidenceManifest.hashes).reduce((sum, h) => sum + h.size, 0)
      },
      hashes: this.evidenceManifest.hashes,
      verification: {
        instructions: 'To verify integrity, recalculate SHA-256 for each file and compare',
        masterHashAlgorithm: 'SHA-256 of concatenated individual hashes',
        encoding: 'UTF-8 for text files'
      },
      legal: {
        statement: 'This cryptographic evidence has been generated for legal and scientific documentation purposes',
        integrity: 'Any modification to source files will invalidate these hashes',
        timestamp: new Date().toISOString()
      }
    };

    // Save report
    fs.writeFileSync(
      path.join(__dirname, 'FORENSIC_EVIDENCE_HASHES.json'),
      JSON.stringify(report, null, 2)
    );

    console.log('\n' + '='.repeat(60));
    console.log('📋 FORENSIC HASHING COMPLETE');
    console.log('='.repeat(60));
    console.log(`🔐 Master Hash: ${masterHash}`);
    console.log(`📊 Total Files: ${this.evidenceManifest.totalFiles}`);
    console.log(`💾 Report Saved: FORENSIC_EVIDENCE_HASHES.json`);

    return report;
  }
}

// Execute
if (require.main === module) {
  const hasher = new ForensicEvidenceHasher();
  hasher.generateForensicReport();
}

module.exports = ForensicEvidenceHasher;