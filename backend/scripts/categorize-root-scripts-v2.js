/**
 * SCRIPT: Categorize Root Scripts V2 (IMPROVED)
 * PURPOSE: Analyze all .js files in backend root with better categorization
 * IMPROVEMENTS: Detects critical files, claude-code integration, metadata
 */

const fs = require('fs');
const path = require('path');

const backendRoot = path.join(__dirname, '..');
const files = fs.readdirSync(backendRoot).filter(f => f.endsWith('.js'));

const categories = {
  CRITICAL_KEEP: {
    pattern: /^(server|engineering-metadata|config|.env)\.js$/,
    files: [],
    action: 'KEEP',
    destination: null,
    reason: 'Critical system files - DO NOT ARCHIVE'
  },
  CLAUDE_INTEGRATION: {
    pattern: /^claude-/,
    files: [],
    action: 'MOVE_TO_SCRIPTS',
    destination: 'scripts/claude-integration/',
    reason: 'Claude Code integration scripts - move to organized location'
  },
  ACTIVATION: {
    pattern: /^(activate|assign|enable)[_-]/,
    files: [],
    action: 'ARCHIVE',
    destination: 'archive/legacy-scripts/activation/'
  },
  MIGRATION: {
    pattern: /^add[_-]/,
    files: [],
    action: 'ARCHIVE',
    destination: 'archive/legacy-scripts/migrations/'
  },
  DIAGNOSTIC_CHECK: {
    pattern: /^check[_-]/,
    files: [],
    action: 'ARCHIVE',
    destination: 'archive/legacy-scripts/diagnostics/'
  },
  DIAGNOSTIC_DEBUG: {
    pattern: /^debug[_-]/,
    files: [],
    action: 'ARCHIVE',
    destination: 'archive/legacy-scripts/diagnostics/'
  },
  DIAGNOSTIC_ANALYZE: {
    pattern: /^(analyze|audit|verify|inspect|show|list|get|demo-reporte)[_-]/,
    files: [],
    action: 'ARCHIVE',
    destination: 'archive/legacy-scripts/diagnostics/'
  },
  FIX_REPAIR: {
    pattern: /^(fix|repair|auto-fix|autonomous|apply-fixes|update|correct|resolve|empresa-module-autofix|enhance-phase4)/,
    files: [],
    action: 'ARCHIVE',
    destination: 'archive/executed-fixes/'
  },
  TEST_RUN: {
    pattern: /^(test|run)[_-]/,
    files: [],
    action: 'ARCHIVE',
    destination: 'archive/old-tests/'
  },
  CLEANUP: {
    pattern: /^(delete|remove|clean|purge|drop|reset|comment-duplicate)/,
    files: [],
    action: 'ARCHIVE',
    destination: 'archive/legacy-scripts/cleanup/'
  },
  CREATE_SEED: {
    pattern: /^(create|insert|populate|seed|complete_|complete-)/,
    files: [],
    action: 'ARCHIVE',
    destination: 'archive/legacy-scripts/initialization/'
  },
  DEMO_SCRIPTS: {
    pattern: /^demo-/,
    files: [],
    action: 'ARCHIVE',
    destination: 'archive/legacy-scripts/demos/'
  },
  UNCATEGORIZED: {
    pattern: null,
    files: [],
    action: 'REVIEW',
    destination: 'archive/legacy-scripts/uncategorized/'
  }
};

// Categorize files
files.forEach(file => {
  let categorized = false;

  // Check each category in order (most specific first)
  for (const [catName, catData] of Object.entries(categories)) {
    if (catData.pattern && catData.pattern.test(file)) {
      catData.files.push(file);
      categorized = true;
      break;
    }
  }

  if (!categorized) {
    categories.UNCATEGORIZED.files.push(file);
  }
});

// Generate report
const criticalFileCount = categories.CRITICAL_KEEP.files.length + categories.CLAUDE_INTEGRATION.files.length;
const archiveFileCount = files.length - criticalFileCount - categories.UNCATEGORIZED.files.length;

const report = {
  scanDate: new Date().toISOString(),
  totalFiles: files.length,
  toKeep: categories.CRITICAL_KEEP.files.length,
  toMoveToScripts: categories.CLAUDE_INTEGRATION.files.length,
  toArchive: archiveFileCount,
  needsReview: categories.UNCATEGORIZED.files.length,

  summary: Object.entries(categories).map(([name, data]) => ({
    category: name,
    count: data.files.length,
    action: data.action,
    destination: data.destination,
    reason: data.reason || null
  })),

  detailedCategorization: categories,

  executionPlan: {
    phase1_critical_keep: categories.CRITICAL_KEEP.files.map(f => ({
      file: f,
      action: 'KEEP IN ROOT',
      reason: 'Critical system file'
    })),

    phase2_organize_scripts: categories.CLAUDE_INTEGRATION.files.map(f => ({
      file: f,
      from: `${backendRoot}/${f}`,
      to: `scripts/claude-integration/${f}`,
      risk: 'LOW',
      reason: 'Better organization - still accessible'
    })),

    phase3_safe_archive: [
      ...categories.DIAGNOSTIC_CHECK.files,
      ...categories.DIAGNOSTIC_DEBUG.files,
      ...categories.DIAGNOSTIC_ANALYZE.files,
      ...categories.TEST_RUN.files,
      ...categories.DEMO_SCRIPTS.files
    ].map(f => {
      const cat = Object.values(categories).find(c => c.files.includes(f));
      return {
        file: f,
        from: backendRoot,
        to: cat.destination,
        risk: 'LOW',
        reason: 'Read-only scripts, safe to archive'
      };
    }),

    phase4_medium_archive: [
      ...categories.ACTIVATION.files,
      ...categories.MIGRATION.files,
      ...categories.FIX_REPAIR.files,
      ...categories.CLEANUP.files,
      ...categories.CREATE_SEED.files
    ].map(f => {
      const cat = Object.values(categories).find(c => c.files.includes(f));
      return {
        file: f,
        from: backendRoot,
        to: cat.destination,
        risk: 'MEDIUM',
        reason: 'One-time scripts, likely already executed'
      };
    }),

    phase5_manual_review: categories.UNCATEGORIZED.files.map(f => ({
      file: f,
      from: backendRoot,
      to: categories.UNCATEGORIZED.destination,
      risk: 'NEEDS_MANUAL_REVIEW',
      reason: 'Could not auto-categorize - needs human review'
    }))
  }
};

// Save report
const reportPath = path.join(__dirname, '../archive/root-scripts-categorization-v2.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

// Console output
console.log('\n📊 ROOT SCRIPTS CATEGORIZATION REPORT V2 (IMPROVED)');
console.log('=' .repeat(70));
console.log(`Total files found: ${report.totalFiles}`);
console.log(`To KEEP in root: ${report.toKeep}`);
console.log(`To MOVE to scripts/: ${report.toMoveToScripts}`);
console.log(`To ARCHIVE: ${report.toArchive}`);
console.log(`Needs REVIEW: ${report.needsReview}\n`);

console.log('Categories:');
report.summary.forEach(cat => {
  if (cat.count > 0) {
    const emoji = cat.action === 'KEEP' ? '🔒' : cat.action === 'MOVE_TO_SCRIPTS' ? '📁' : cat.action === 'ARCHIVE' ? '📦' : '❓';
    console.log(`  ${emoji} ${cat.category.padEnd(25)} ${cat.count.toString().padStart(3)} files → ${cat.action}`);
  }
});

console.log(`\n📄 Critical files that will STAY in root:`);
categories.CRITICAL_KEEP.files.forEach(f => console.log(`  🔒 ${f}`));

console.log(`\n✅ Full report saved to: ${reportPath}`);
console.log(`\n💡 Next step: Review the execution plan and proceed with archival.\n`);
