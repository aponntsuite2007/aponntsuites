/**
 * Script para analizar todos los módulos y determinar acciones posibles
 */

const registry = require('../src/auditor/registry/modules-registry.json');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  ANÁLISIS DE MÓDULOS PARA PROCESS CHAIN                  ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log(`Total módulos: ${registry.total_modules}\n`);

// Agrupar por categoría
const byCategory = {};
registry.modules.forEach(m => {
    if (!byCategory[m.category]) byCategory[m.category] = [];
    byCategory[m.category].push(m);
});

Object.keys(byCategory).sort().forEach(cat => {
    console.log(`\n${cat.toUpperCase()} (${byCategory[cat].length} módulos):`);
    byCategory[cat].forEach(m => {
        console.log(`  ✓ ${m.id.padEnd(35)} - ${m.name}`);
    });
});

// Analizar acciones potenciales por módulo
console.log('\n\n╔════════════════════════════════════════════════════════════╗');
console.log('║  ACCIONES POTENCIALES POR MÓDULO                         ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

const actionsByModule = {
    // RRHH & EMPLOYEES
    'users': [
        'create-employee',
        'edit-employee-data',
        'request-data-change',
        'request-password-reset',
        'onboarding-new-employee'
    ],
    'attendance': [
        'check-in',
        'check-out',
        'request-attendance-correction',
        'view-my-attendance',
        'report-late-arrival'
    ],
    'shifts': [
        'shift-swap',
        'request-shift-change',
        'view-my-shifts',
        'request-permanent-schedule-change'
    ],
    'vacation': [
        'vacation-request',
        'cancel-vacation',
        'view-vacation-balance'
    ],
    'time-off-requests': [
        'time-off-request',
        'sick-leave-request',
        'personal-day-request'
    ],
    'overtime-management': [
        'overtime-request',
        'overtime-cancellation',
        'view-overtime-hours'
    ],
    'medical': [
        'medical-appointment',
        'medical-emergency-request',
        'medical-certificate-upload'
    ],
    'payroll-liquidation': [
        'payroll-request',
        'payslip-download',
        'payroll-dispute'
    ],

    // TALENT & RECRUITMENT
    'job-postings': [
        'apply-to-job',
        'create-job-posting',
        'edit-job-posting',
        'close-job-posting'
    ],
    'applicant-tracking': [
        'schedule-interview',
        'submit-interview-feedback',
        'change-candidate-status'
    ],

    // TRAINING & DEVELOPMENT
    'training-management': [
        'training-request',
        'enroll-in-training',
        'cancel-training',
        'training-certificate-request'
    ],
    'performance-evaluations': [
        'start-evaluation',
        'submit-self-evaluation',
        'submit-peer-evaluation',
        'view-evaluation-results'
    ],
    'career-development': [
        'career-path-request',
        'promotion-request',
        'transfer-request'
    ],

    // OPERATIONS
    'asset-management': [
        'asset-request',
        'asset-return',
        'asset-repair-request',
        'asset-inventory-check'
    ],
    'expense-reimbursement': [
        'expense-submit',
        'expense-approve',
        'expense-dispute'
    ],
    'project-management': [
        'create-project',
        'add-milestone',
        'assign-task',
        'update-project-status'
    ],

    // IT & SYSTEMS
    'remote-work-management': [
        'remote-work-request',
        'remote-work-cancellation',
        'remote-work-extension'
    ],
    'it-support': [
        'create-ticket',
        'escalate-ticket',
        'hardware-request',
        'software-request',
        'access-request'
    ],

    // LEGAL & COMPLIANCE
    'legal-labor-compliance': [
        'labor-contract-review',
        'compliance-report-request',
        'legal-consultation-request'
    ],
    'incident-management': [
        'report-incident',
        'report-accident',
        'report-hazard'
    ],

    // NOTIFICATIONS & COMMUNICATION
    'notifications-enterprise': [
        'send-notification',
        'create-announcement',
        'emergency-broadcast'
    ],
    'notification-center': [
        'mark-notification-read',
        'notification-settings-update'
    ],

    // DEPARTMENTS & ORGANIZATION
    'departments': [
        'create-department',
        'edit-department',
        'transfer-to-department'
    ],
    'organizational-structure': [
        'org-chart-update',
        'reporting-line-change',
        'position-creation'
    ],
    'branches': [
        'create-branch',
        'edit-branch',
        'transfer-to-branch'
    ],

    // SECURITY & ACCESS
    'real-biometric-enterprise': [
        'enroll-biometric',
        'update-biometric',
        're-enroll-biometric'
    ],
    'security-access-control': [
        'access-request',
        'temporary-access-request',
        'access-revocation-request'
    ],

    // FACILITIES & WORKPLACE
    'kiosks-professional': [
        'kiosk-registration',
        'kiosk-check-in'
    ],
    'room-booking': [
        'book-room',
        'cancel-booking',
        'modify-booking'
    ],
    'parking-management': [
        'parking-spot-request',
        'visitor-parking-request'
    ],

    // WELLNESS & BENEFITS
    'wellness-programs': [
        'wellness-program-enrollment',
        'wellness-activity-log',
        'wellness-reward-claim'
    ],
    'benefits-administration': [
        'benefit-enrollment',
        'benefit-change',
        'benefit-claim'
    ],

    // DMS & DOCUMENTS
    'dms-dashboard': [
        'upload-document',
        'request-document',
        'share-document',
        'document-approval-request'
    ]
};

let totalActions = 0;
Object.keys(actionsByModule).sort().forEach(moduleId => {
    const actions = actionsByModule[moduleId];
    totalActions += actions.length;
    console.log(`\n📦 ${moduleId} (${actions.length} acciones):`);
    actions.forEach(action => {
        console.log(`   - ${action}`);
    });
});

console.log(`\n\n✅ TOTAL ACCIONES IDENTIFICADAS: ${totalActions} acciones`);
console.log(`✅ TOTAL MÓDULOS CON ACCIONES: ${Object.keys(actionsByModule).length} módulos`);

// Guardar para uso posterior
const fs = require('fs');
const outputPath = './src/auditor/registry/process-chain-actions-map.json';
const output = {
    generated_at: new Date().toISOString(),
    total_actions: totalActions,
    total_modules: Object.keys(actionsByModule).length,
    actions_by_module: actionsByModule
};

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
console.log(`\n📁 Mapa guardado en: ${outputPath}`);
