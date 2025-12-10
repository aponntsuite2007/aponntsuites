/**
 * Script para convertir panel-administrativo.html a Dark Theme
 * Ejecutar: node scripts/convert-to-dark-theme.js
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../backend/public/panel-administrativo.html');

console.log('🌙 Convirtiendo panel-administrativo.html a Dark Theme...\n');

let content = fs.readFileSync(filePath, 'utf8');
const originalSize = content.length;

// ============================================================================
// PASO 1: REEMPLAZAR VARIABLES CSS EN :root
// ============================================================================

const oldRoot = `:root {
            --primary-color: #667eea;
            --secondary-color: #764ba2;
            --success-color: #27ae60;
            --warning-color: #f39c12;
            --danger-color: #e74c3c;
            --info-color: #3498db;
            --light-bg: #f8f9fa;
            --white: #ffffff;
            --dark-text: #2c3e50;
            --border-color: #e9ecef;
        }`;

const newRoot = `:root {
            /* Dark Theme - GitHub Style */
            --primary-color: #58a6ff;
            --secondary-color: #7c3aed;
            --success-color: #3fb950;
            --warning-color: #d29922;
            --danger-color: #f85149;
            --info-color: #58a6ff;
            --light-bg: #0d1117;
            --white: #161b22;
            --dark-text: #e6edf3;
            --border-color: #30363d;

            /* Extended Dark Palette */
            --bg-primary: #0d1117;
            --bg-secondary: #161b22;
            --bg-tertiary: #21262d;
            --bg-card: #161b22;
            --text-primary: #e6edf3;
            --text-secondary: #8b949e;
            --text-muted: #6e7681;
            --border-default: #30363d;
            --border-muted: #21262d;
            --accent-blue: #58a6ff;
            --accent-green: #3fb950;
            --accent-purple: #a371f7;
            --accent-orange: #f0883e;
            --shadow-dark: rgba(0,0,0,0.4);
        }`;

content = content.replace(oldRoot, newRoot);
console.log('✅ Variables :root actualizadas');

// ============================================================================
// PASO 2: CAMBIAR BODY
// ============================================================================

content = content.replace(
    `body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            min-height: 100vh;
        }`,
    `body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #0d1117;
            min-height: 100vh;
            color: #e6edf3;
        }`
);
console.log('✅ Body actualizado');

// ============================================================================
// PASO 3: CAMBIAR DASHBOARD HEADER
// ============================================================================

content = content.replace(
    `.dashboard-header {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            color: #1e293b;
            padding: 0;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            border-bottom: 3px solid #60a5fa;
        }`,
    `.dashboard-header {
            background: linear-gradient(135deg, #161b22 0%, #21262d 100%);
            color: #e6edf3;
            padding: 0;
            box-shadow: 0 4px 20px rgba(0,0,0,0.4);
            border-bottom: 3px solid #58a6ff;
        }`
);
console.log('✅ Dashboard header actualizado');

// ============================================================================
// PASO 4: CAMBIAR STAT CARDS
// ============================================================================

content = content.replace(
    `.stat-card {
            background: white;
            padding: 1.5rem;
            border-radius: 15px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            text-align: center;
            transition: transform 0.3s ease;
        }`,
    `.stat-card {
            background: #161b22;
            padding: 1.5rem;
            border-radius: 15px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            text-align: center;
            transition: transform 0.3s ease;
            border: 1px solid #30363d;
        }`
);

// Segundo stat-card (hay dos definiciones)
content = content.replace(
    `.stat-card {
            background: linear-gradient(135deg, #f8f9fa, #e9ecef);
            border-radius: 10px;
            padding: 1.5rem;
            text-align: center;
            border-left: 4px solid var(--primary-color);
        }`,
    `.stat-card {
            background: linear-gradient(135deg, #161b22, #21262d);
            border-radius: 10px;
            padding: 1.5rem;
            text-align: center;
            border-left: 4px solid var(--primary-color);
        }`
);

console.log('✅ Stat cards actualizados');

// ============================================================================
// PASO 5: CAMBIAR STAT LABEL
// ============================================================================

content = content.replace(
    `.stat-label {
            color: #666;
            font-size: 0.9em;
            margin-top: 0.5rem;
        }`,
    `.stat-label {
            color: #8b949e;
            font-size: 0.9em;
            margin-top: 0.5rem;
        }`
);
console.log('✅ Stat label actualizado');

// ============================================================================
// PASO 6: CAMBIAR TABS NAVIGATION
// ============================================================================

content = content.replace(
    `.tabs-navigation-wrapper {
            position: relative;
            background: white;
            border-radius: 15px 15px 0 0;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }`,
    `.tabs-navigation-wrapper {
            position: relative;
            background: #161b22;
            border-radius: 15px 15px 0 0;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            border: 1px solid #30363d;
            border-bottom: none;
        }`
);

content = content.replace(
    `.nav-tabs {
            display: flex;
            background: white;
            overflow-x: auto;
            overflow-y: hidden;
            scroll-behavior: smooth;
            scrollbar-width: thin;
            scrollbar-color: #007bff #f8f9fa;
            margin-bottom: 0;
        }`,
    `.nav-tabs {
            display: flex;
            background: #161b22;
            overflow-x: auto;
            overflow-y: hidden;
            scroll-behavior: smooth;
            scrollbar-width: thin;
            scrollbar-color: #58a6ff #21262d;
            margin-bottom: 0;
        }`
);

content = content.replace(
    `.nav-tabs::-webkit-scrollbar-track {
            background: #f8f9fa;
        }`,
    `.nav-tabs::-webkit-scrollbar-track {
            background: #21262d;
        }`
);

content = content.replace(
    `.nav-tab {
            flex: 0 0 auto;
            min-width: 140px;
            padding: 1rem 1.5rem;
            background: #f8f9fa;
            border: none;
            cursor: pointer;
            font-weight: 400;
            transition: all 0.3s ease;
            border-right: 1px solid #e9ecef;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
        }`,
    `.nav-tab {
            flex: 0 0 auto;
            min-width: 140px;
            padding: 1rem 1.5rem;
            background: #21262d;
            border: none;
            cursor: pointer;
            font-weight: 400;
            transition: all 0.3s ease;
            border-right: 1px solid #30363d;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            color: #8b949e;
        }`
);

content = content.replace(
    `.nav-tab:hover:not(.active) {
            background: #e9ecef;
        }`,
    `.nav-tab:hover:not(.active) {
            background: #30363d;
            color: #e6edf3;
        }`
);

console.log('✅ Tabs navigation actualizados');

// ============================================================================
// PASO 7: CAMBIAR BILLING CARD
// ============================================================================

content = content.replace(
    `.billing-card {
            background: white;
            border-radius: 15px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }`,
    `.billing-card {
            background: #161b22;
            border-radius: 15px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            border: 1px solid #30363d;
        }`
);

content = content.replace(
    `.billing-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
            padding-bottom: 1rem;
            border-bottom: 2px solid #f8f9fa;
        }`,
    `.billing-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
            padding-bottom: 1rem;
            border-bottom: 2px solid #30363d;
        }`
);

console.log('✅ Billing cards actualizados');

// ============================================================================
// PASO 8: CAMBIAR INVOICE CARDS
// ============================================================================

content = content.replace(
    `.invoice-card {
            background: linear-gradient(135deg, #f8f9fa, #e9ecef);
            border-radius: 10px;
            padding: 1rem;
            border-left: 4px solid var(--primary-color);
        }`,
    `.invoice-card {
            background: linear-gradient(135deg, #21262d, #161b22);
            border-radius: 10px;
            padding: 1rem;
            border-left: 4px solid var(--primary-color);
            color: #e6edf3;
        }`
);

content = content.replace(
    `.invoice-card.overdue {
            border-left-color: var(--danger-color);
            background: linear-gradient(135deg, #ffebee, #ffcdd2);
        }`,
    `.invoice-card.overdue {
            border-left-color: var(--danger-color);
            background: linear-gradient(135deg, #3d1f1f, #2d1515);
        }`
);

content = content.replace(
    `.invoice-card.paid {
            border-left-color: var(--success-color);
            background: linear-gradient(135deg, #e8f5e8, #c8e6c9);
        }`,
    `.invoice-card.paid {
            border-left-color: var(--success-color);
            background: linear-gradient(135deg, #1a2e1a, #152615);
        }`
);

console.log('✅ Invoice cards actualizados');

// ============================================================================
// PASO 9: CAMBIAR QR PAYMENT
// ============================================================================

content = content.replace(
    `.qr-payment {
            text-align: center;
            padding: 2rem;
            background: linear-gradient(135deg, #e3f2fd, #bbdefb);
            border-radius: 15px;
            margin: 1rem 0;
        }`,
    `.qr-payment {
            text-align: center;
            padding: 2rem;
            background: linear-gradient(135deg, #1a2744, #152033);
            border-radius: 15px;
            margin: 1rem 0;
            border: 1px solid #30363d;
        }`
);

content = content.replace(
    `.qr-code {
            width: 200px;
            height: 200px;
            background: white;
            border: 2px solid #ddd;
            border-radius: 10px;
            margin: 1rem auto;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.8rem;
            color: #666;
        }`,
    `.qr-code {
            width: 200px;
            height: 200px;
            background: #21262d;
            border: 2px solid #30363d;
            border-radius: 10px;
            margin: 1rem auto;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.8rem;
            color: #8b949e;
        }`
);

console.log('✅ QR payment actualizados');

// ============================================================================
// PASO 10: CAMBIAR MODULE PRICING
// ============================================================================

content = content.replace(
    `.module-pricing {
            background: white;
            border-radius: 10px;
            padding: 1rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }`,
    `.module-pricing {
            background: #161b22;
            border-radius: 10px;
            padding: 1rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            border: 1px solid #30363d;
        }`
);

content = content.replace(
    `.tier-btn {
            flex: 1;
            padding: 0.5rem;
            border: 1px solid var(--border-color);
            background: white;
            border-radius: 5px;
            cursor: pointer;
            font-size: 0.8rem;
            transition: all 0.3s ease;
        }`,
    `.tier-btn {
            flex: 1;
            padding: 0.5rem;
            border: 1px solid #30363d;
            background: #21262d;
            border-radius: 5px;
            cursor: pointer;
            font-size: 0.8rem;
            transition: all 0.3s ease;
            color: #e6edf3;
        }`
);

console.log('✅ Module pricing actualizados');

// ============================================================================
// PASO 11: CAMBIAR NOTIFICATIONS
// ============================================================================

content = content.replace(
    `.notification.success { background: #d4edda; color: #155724; }`,
    `.notification.success { background: #1a2e1a; color: #3fb950; border: 1px solid #238636; }`
);

content = content.replace(
    `.notification.warning { background: #fff3cd; color: #856404; }`,
    `.notification.warning { background: #3d2e0f; color: #d29922; border: 1px solid #d29922; }`
);

content = content.replace(
    `.notification.error { background: #f8d7da; color: #721c24; }`,
    `.notification.error { background: #3d1f1f; color: #f85149; border: 1px solid #da3633; }`
);

content = content.replace(
    `.notification.info { background: #d1ecf1; color: #0c5460; }`,
    `.notification.info { background: #1a2744; color: #58a6ff; border: 1px solid #58a6ff; }`
);

console.log('✅ Notifications actualizados');

// ============================================================================
// PASO 12: CAMBIAR SECTION CARD
// ============================================================================

content = content.replace(
    `.section-card {
            background: white;
            border-radius: 20px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.1);
            overflow: hidden;
        }`,
    `.section-card {
            background: #161b22;
            border-radius: 20px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.4);
            overflow: hidden;
            border: 1px solid #30363d;
        }`
);

console.log('✅ Section card actualizado');

// ============================================================================
// PASO 13: CAMBIAR BILLING TABLE
// ============================================================================

content = content.replace(
    `.billing-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 1rem;
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }`,
    `.billing-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 1rem;
            background: #161b22;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }`
);

content = content.replace(
    `.billing-table td {
            padding: 0.75rem 1rem;
            border-bottom: 1px solid #f0f0f0;
            font-size: 0.85rem;
            vertical-align: middle;
        }`,
    `.billing-table td {
            padding: 0.75rem 1rem;
            border-bottom: 1px solid #30363d;
            font-size: 0.85rem;
            vertical-align: middle;
            color: #e6edf3;
        }`
);

content = content.replace(
    `.billing-table tr:hover {
            background-color: #f8f9fa;
        }`,
    `.billing-table tr:hover {
            background-color: #21262d;
        }`
);

content = content.replace(
    `.billing-table tr.unpaid {
            background-color: #fff5f5;
        }`,
    `.billing-table tr.unpaid {
            background-color: #2d1f1f;
        }`
);

content = content.replace(
    `.billing-table tr.unpaid:hover {
            background-color: #ffebee;
        }`,
    `.billing-table tr.unpaid:hover {
            background-color: #3d1f1f;
        }`
);

console.log('✅ Billing table actualizada');

// ============================================================================
// PASO 14: CAMBIAR STATUS BADGES
// ============================================================================

content = content.replace(
    `.status.paid {
            background: #e8f5e8;
            color: #2e7d32;
        }`,
    `.status.paid {
            background: #1a2e1a;
            color: #3fb950;
        }`
);

content = content.replace(
    `.status.unpaid {
            background: #ffebee;
            color: #d32f2f;
        }`,
    `.status.unpaid {
            background: #3d1f1f;
            color: #f85149;
        }`
);

console.log('✅ Status badges actualizados');

// ============================================================================
// PASO 15: CAMBIAR BTN ACTION
// ============================================================================

content = content.replace(
    `.btn-action {
            background: none;
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 0.25rem 0.5rem;
            cursor: pointer;
            margin: 0 0.25rem;
            font-size: 0.9rem;
            transition: all 0.3s ease;
        }`,
    `.btn-action {
            background: #21262d;
            border: 1px solid #30363d;
            border-radius: 5px;
            padding: 0.25rem 0.5rem;
            cursor: pointer;
            margin: 0 0.25rem;
            font-size: 0.9rem;
            transition: all 0.3s ease;
            color: #e6edf3;
        }`
);

console.log('✅ Btn action actualizado');

// ============================================================================
// PASO 16: CAMBIAR TOTAL ITEM
// ============================================================================

content = content.replace(
    `.total-item {
            text-align: center;
            padding: 1rem;
            background: linear-gradient(135deg, #f8f9fa, #e9ecef);`,
    `.total-item {
            text-align: center;
            padding: 1rem;
            background: linear-gradient(135deg, #21262d, #161b22);`
);

console.log('✅ Total item actualizado');

// ============================================================================
// PASO 17: CAMBIAR TOTAL LABEL
// ============================================================================

content = content.replace(
    `.total-label {
            font-size: 0.85rem;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }`,
    `.total-label {
            font-size: 0.85rem;
            color: #8b949e;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }`
);

console.log('✅ Total label actualizado');

// ============================================================================
// PASO 18: CAMBIAR BILLING FILTERS
// ============================================================================

content = content.replace(
    `.billing-filters {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 1.5rem;
            padding: 1rem;
            background: #f8f9fa;
            border-radius: 10px;
        }`,
    `.billing-filters {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 1.5rem;
            padding: 1rem;
            background: #21262d;
            border-radius: 10px;
            border: 1px solid #30363d;
        }`
);

content = content.replace(
    `.filter-label {
            font-size: 0.85rem;
            font-weight: 600;
            color: #666;
        }`,
    `.filter-label {
            font-size: 0.85rem;
            font-weight: 600;
            color: #8b949e;
        }`
);

content = content.replace(
    `.filter-input {
            padding: 0.5rem;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 0.9rem;
        }`,
    `.filter-input {
            padding: 0.5rem;
            border: 1px solid #30363d;
            border-radius: 5px;
            font-size: 0.9rem;
            background: #161b22;
            color: #e6edf3;
        }`
);

console.log('✅ Billing filters actualizados');

// ============================================================================
// PASO 19: CAMBIAR BILLING GENERATION
// ============================================================================

content = content.replace(
    `.billing-generation {
            background: linear-gradient(135deg, #e3f2fd, #bbdefb);
            border-radius: 10px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            text-align: center;
        }`,
    `.billing-generation {
            background: linear-gradient(135deg, #1a2744, #152033);
            border-radius: 10px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            text-align: center;
            border: 1px solid #30363d;
        }`
);

content = content.replace(
    `.generation-description {
            color: #666;
            margin-bottom: 1rem;
            font-size: 0.9rem;
        }`,
    `.generation-description {
            color: #8b949e;
            margin-bottom: 1rem;
            font-size: 0.9rem;
        }`
);

console.log('✅ Billing generation actualizado');

// ============================================================================
// PASO 20: CAMBIAR VENDOR CARDS
// ============================================================================

content = content.replace(
    `.vendor-card {
            background: white;
            border-radius: 15px;
            padding: 1.5rem;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            border-left: 4px solid var(--primary-color);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }`,
    `.vendor-card {
            background: #161b22;
            border-radius: 15px;
            padding: 1.5rem;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            border-left: 4px solid var(--primary-color);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            border: 1px solid #30363d;
            border-left: 4px solid var(--primary-color);
        }`
);

content = content.replace(
    `.vendor-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        }`,
    `.vendor-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.4);
        }`
);

content = content.replace(
    `.vendor-email {
            color: #666;
            font-size: 0.9rem;
        }`,
    `.vendor-email {
            color: #8b949e;
            font-size: 0.9rem;
        }`
);

content = content.replace(
    `.vendor-status.active {
            background: #e8f5e8;
            color: #2e7d32;
        }`,
    `.vendor-status.active {
            background: #1a2e1a;
            color: #3fb950;
        }`
);

content = content.replace(
    `.vendor-status.inactive {
            background: #ffebee;
            color: #d32f2f;
        }`,
    `.vendor-status.inactive {
            background: #3d1f1f;
            color: #f85149;
        }`
);

content = content.replace(
    `.vendor-detail-label {
            color: #666;
            font-weight: 600;
            margin-bottom: 0.25rem;
        }`,
    `.vendor-detail-label {
            color: #8b949e;
            font-weight: 600;
            margin-bottom: 0.25rem;
        }`
);

content = content.replace(
    `.vendor-detail-value {
            color: #333;
        }`,
    `.vendor-detail-value {
            color: #e6edf3;
        }`
);

console.log('✅ Vendor cards actualizados');

// ============================================================================
// PASO 21: CAMBIAR VENDOR COMMISSION
// ============================================================================

content = content.replace(
    `.vendor-commission {
            background: linear-gradient(135deg, #e3f2fd, #bbdefb);
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 1rem;
            text-align: center;
        }`,
    `.vendor-commission {
            background: linear-gradient(135deg, #1a2744, #152033);
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 1rem;
            text-align: center;
            border: 1px solid #30363d;
        }`
);

content = content.replace(
    `.commission-label {
            font-size: 0.8rem;
            color: #666;
            margin-top: 0.25rem;
        }`,
    `.commission-label {
            font-size: 0.8rem;
            color: #8b949e;
            margin-top: 0.25rem;
        }`
);

console.log('✅ Vendor commission actualizado');

// ============================================================================
// PASO 22: CAMBIAR MODALS
// ============================================================================

content = content.replace(
    `.vendor-modal-content {
            background: white;
            border-radius: 15px;
            padding: 2rem;
            max-width: 800px;
            width: 98%;
            max-height: 95vh;
            overflow-y: auto;
            position: relative;
        }`,
    `.vendor-modal-content {
            background: #161b22;
            border-radius: 15px;
            padding: 2rem;
            max-width: 800px;
            width: 98%;
            max-height: 95vh;
            overflow-y: auto;
            position: relative;
            border: 1px solid #30363d;
            color: #e6edf3;
        }`
);

content = content.replace(
    `.form-label {
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: #333;
        }`,
    `.form-label {
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: #e6edf3;
        }`
);

content = content.replace(
    `.form-input {
            padding: 0.75rem;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 1rem;
        }`,
    `.form-input {
            padding: 0.75rem;
            border: 1px solid #30363d;
            border-radius: 5px;
            font-size: 1rem;
            background: #21262d;
            color: #e6edf3;
        }`
);

content = content.replace(
    `.form-help {
            font-size: 0.8rem;
            color: #666;
            margin-top: 0.25rem;
            line-height: 1.3;
        }`,
    `.form-help {
            font-size: 0.8rem;
            color: #8b949e;
            margin-top: 0.25rem;
            line-height: 1.3;
        }`
);

console.log('✅ Modals actualizados');

// ============================================================================
// PASO 23: CAMBIAR VENDOR SECTION
// ============================================================================

content = content.replace(
    `.vendor-section {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }`,
    `.vendor-section {
            background: #21262d;
            border: 1px solid #30363d;
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }`
);

content = content.replace(
    `.section-title {
            margin: 0 0 1.2rem 0;
            color: #495057;
            font-size: 1.1rem;
            font-weight: 600;
            border-bottom: 2px solid #dee2e6;
            padding-bottom: 0.5rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }`,
    `.section-title {
            margin: 0 0 1.2rem 0;
            color: #e6edf3;
            font-size: 1.1rem;
            font-weight: 600;
            border-bottom: 2px solid #30363d;
            padding-bottom: 0.5rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }`
);

content = content.replace(
    `.vendor-section .form-label {
            font-weight: 500;
            color: #343a40;
            margin-bottom: 0.5rem;
        }`,
    `.vendor-section .form-label {
            font-weight: 500;
            color: #e6edf3;
            margin-bottom: 0.5rem;
        }`
);

content = content.replace(
    `.vendor-section .form-help {
            color: #6c757d;
            font-size: 0.75rem;
            margin-top: 0.25rem;
        }`,
    `.vendor-section .form-help {
            color: #8b949e;
            font-size: 0.75rem;
            margin-top: 0.25rem;
        }`
);

console.log('✅ Vendor section actualizado');

// ============================================================================
// PASO 24: CAMBIAR VENDORS TABLE CONTAINER
// ============================================================================

content = content.replace(
    `.vendors-table-container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            margin: 1rem 0;
            width: 100%;
        }`,
    `.vendors-table-container {
            background: #161b22;
            border-radius: 12px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
            overflow: hidden;
            margin: 1rem 0;
            width: 100%;
            border: 1px solid #30363d;
        }`
);

console.log('✅ Vendors table container actualizado');

// ============================================================================
// PASO 25: CAMBIAR PRELIQUIDATION GENERATOR
// ============================================================================

content = content.replace(
    `.preliquidation-generator {
            background: linear-gradient(135deg, #fff3cd, #ffeaa7);
            border-radius: 10px;
            padding: 1.5rem;
            margin-bottom: 2rem;
        }`,
    `.preliquidation-generator {
            background: linear-gradient(135deg, #3d2e0f, #2d2105);
            border-radius: 10px;
            padding: 1.5rem;
            margin-bottom: 2rem;
            border: 1px solid #d29922;
        }`
);

content = content.replace(
    `.preliquidation-generator h3 {
            margin: 0 0 1rem 0;
            color: #b8860b;
        }`,
    `.preliquidation-generator h3 {
            margin: 0 0 1rem 0;
            color: #d29922;
        }`
);

console.log('✅ Preliquidation generator actualizado');

// ============================================================================
// PASO 26: CAMBIAR PRELIQ ITEM
// ============================================================================

content = content.replace(
    `.preliq-item {
            background: white;
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 0.5rem;
            border-left: 4px solid var(--success-color);
        }`,
    `.preliq-item {
            background: #21262d;
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 0.5rem;
            border-left: 4px solid var(--success-color);
        }`
);

content = content.replace(
    `.preliq-details {
            font-size: 0.85rem;
            color: #666;
        }`,
    `.preliq-details {
            font-size: 0.85rem;
            color: #8b949e;
        }`
);

console.log('✅ Preliq item actualizado');

// ============================================================================
// PASO 27: CAMBIAR PRICE INPUT
// ============================================================================

content = content.replace(
    `.price-input {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid var(--border-color);
            border-radius: 5px;
            font-size: 0.9rem;
        }`,
    `.price-input {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #30363d;
            border-radius: 5px;
            font-size: 0.9rem;
            background: #21262d;
            color: #e6edf3;
        }`
);

console.log('✅ Price input actualizado');

// ============================================================================
// GUARDAR ARCHIVO
// ============================================================================

fs.writeFileSync(filePath, content, 'utf8');

const newSize = content.length;

console.log('\n' + '='.repeat(60));
console.log('🌙 DARK THEME APLICADO EXITOSAMENTE');
console.log('='.repeat(60));
console.log(`📁 Archivo: panel-administrativo.html`);
console.log(`📊 Tamaño original: ${(originalSize / 1024).toFixed(1)} KB`);
console.log(`📊 Tamaño nuevo: ${(newSize / 1024).toFixed(1)} KB`);
console.log('\n🔄 Recarga la página con CTRL+F5 para ver los cambios');
