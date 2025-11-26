/**
 * SCRIPT: Categorize Root Scripts
 * PURPOSE: Analyze all 369 .js files in backend root and categorize them
 * OUTPUT: JSON report with categorization and archival recommendations
 */

const fs = require('fs');
const path = require('path');

const backendRoot = path.join(__dirname, '..');
const files = fs.readdirSync(backendRoot).filter(f => f.endsWith('.js'));

const categories = {
  CRITICAL_KEEP: {
    pattern: /^server\.js$/,
    files: [],
    action: 'KEEP',
    destination: null
  },
  ACTIVATION: {
    pattern: /^(activate|assign)_/,
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
  DIAGNOSTIC: {
    pattern: /^(check|analyze|audit|verify|inspect|show|list|get)_/,
    files: [],
    action: 'ARCHIVE',
    destination: 'archive/legacy-scripts/testing/'
  },
  FIX_REPAIR: {
    pattern: /^(fix|repair|auto-fix|autonomous|apply-fixes|update|correct|resolve)/,
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
    pattern: /^(delete|remove|clean|purge|drop|reset)/,
    files: [],
    action: 'ARCHIVE',
    destination: 'archive/legacy-scripts/cleanup/'
  },
  CREATE: {
    pattern: /^(create|insert|populate|seed)/,
    files: [],
    action: 'ARCHIVE',
    destination: 'archive/legacy-scripts/initialization/'
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

  for (const [catName, catData] of Object.entries(categories)) {
    if (catData.pattern && catData.pattern.test(file)) {
      catData.files.push(file);
      categorized = true;
      break;
    }
  }

  if (!categorized && file !== 'server.js') {
    categories.UNCATEGORIZED.files.push(file);
  }
});

// Generate report
const report = {
  scanDate: new Date().toISOString(),
  totalFiles: files.length,
  toKeep: categories.CRITICAL_KEEP.files.length,
  toArchive: files.length - categories.CRITICAL_KEEP.files.length - categories.UNCATEGORIZED.files.length,
  needsReview: categories.UNCATEGORIZED.files.length,

  summary: Object.entries(categories).map(([name, data]) => ({
    category: name,
    count: data.files.length,
    action: data.action,
    destination: data.destination
  })),

  detailedCategorization: categories,

  archivalPlan: {
    phase1_safe: ['DIAGNOSTIC', 'TEST_RUN'].flatMap(cat =>
      categories[cat].files.map(f => ({
        file: f,
        from: backendRoot,
        to: categories[cat].destination,
        risk: 'LOW'
      }))
    ),
    phase2_medium: ['ACTIVATION', 'MIGRATION', 'FIX_REPAIR', 'CLEANUP', 'CREATE'].flatMap(cat =>
      categories[cat].files.map(f => ({
        file: f,
        from: backendRoot,
        to: categories[cat].destination,
        risk: 'MEDIUM'
      }))
    ),
    phase3_review: categories.UNCATEGORIZED.files.map(f => ({
      file: f,
      from: backendRoot,
      to: categories.UNCATEGORIZED.destination,
      risk: 'NEEDS_MANUAL_REVIEW'
    }))
  }
};

// Save report
const reportPath = path.join(__dirname, '../archive/root-scripts-categorization-report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

// Console output
console.log('\n📊 ROOT SCRIPTS CATEGORIZATION REPORT');
console.log('=' .repeat(60));
console.log(`Total files found: ${report.totalFiles}`);
console.log(`To KEEP: ${report.toKeep} (server.js)`);
console.log(`To ARCHIVE: ${report.toArchive}`);
console.log(`Needs REVIEW: ${report.needsReview}\n`);

console.log('Categories:');
report.summary.forEach(cat => {
  if (cat.count > 0) {
    console.log(`  ${cat.category.padEnd(20)} ${cat.count.toString().padStart(3)} files → ${cat.action}`);
  }
});

console.log(`\n✅ Full report saved to: ${reportPath}\n`);
