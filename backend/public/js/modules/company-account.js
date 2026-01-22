/**
 * COMPANY ACCOUNT MODULE v1.0
 * Sistema de Cuenta Comercial - Relacion APONNT <-> Empresa Cliente
 * Arquitectura: Multi-tenant, API-driven
 *
 * Este modulo muestra toda la informacion comercial entre APONNT y la empresa:
 * - Dashboard de estado de cuenta
 * - Presupuestos (quotes)
 * - Contratos/EULA
 * - Facturas
 * - Comunicaciones externas (APONNT <-> Empresa)
 */

(function() {
'use strict';

// Evitar doble carga
if (window.CompanyAccountEngine) {
    console.log('[COMPANY-ACCOUNT] Modulo ya cargado');
    return;
}

console.log('%c COMPANY ACCOUNT v1.0 ', 'background: linear-gradient(90deg, #6B46C1 0%, #805AD5 100%); color: white; font-size: 14px; padding: 8px 12px; border-radius: 4px; font-weight: bold;');

// ============================================================================
// STATE
// ============================================================================
// Evitar redeclaración si el módulo se carga múltiples veces
if (typeof window.AccountState !== 'undefined') {
    console.log('🏢 [ACCOUNT] Estado ya inicializado');
}
window.AccountState = window.AccountState || {
    isLoading: true,
    currentTab: 'dashboard',
    isAdmin: false,
    company: null,
    quotes: [],
    contracts: [],
    invoices: [],
    communications: [],
    notifications: [],
    stats: {
        pendingInvoices: 0,
        totalDebt: 0,
        activeContracts: 0,
        unreadComms: 0,
        unreadNotifications: 0
    }
};

// ============================================================================
// API
// ============================================================================
const AccountAPI = {
    TIMEOUT_MS: 10000, // 10 second timeout

    getAuthHeaders() {
        // Buscar token en múltiples ubicaciones (compatibilidad con panel-empresa)
        const token = localStorage.getItem('authToken') ||
                      localStorage.getItem('token') ||
                      window.authToken ||
                      window.companyAuthToken || '';
        console.log('[COMPANY-ACCOUNT] Token found:', token ? 'YES' : 'NO');
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    },

    // Fetch with timeout helper
    async fetchWithTimeout(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                console.warn('[COMPANY-ACCOUNT] Request timeout:', url);
                throw new Error('Request timeout');
            }
            throw error;
        }
    },

    async getCompanyInfo() {
        try {
            // Usar datos del contexto actual (window.currentCompany o localStorage)
            const company = window.currentCompany ||
                           JSON.parse(localStorage.getItem('currentCompany') || '{}');

            console.log('[COMPANY-ACCOUNT] Company data found:', company?.company_id || company?.id);

            if (company && (company.company_id || company.id)) {
                return {
                    success: true,
                    data: {
                        company_id: company.company_id || company.id,
                        name: company.name || company.company_name || 'Mi Empresa',
                        slug: company.slug || '',
                        contact_email: company.contact_email || '',
                        phone: company.phone || company.contact_phone || ''
                    }
                };
            }
            console.warn('[COMPANY-ACCOUNT] No company data found in localStorage/window');
            return { success: false, error: 'No company data found' };
        } catch (error) {
            console.error('[COMPANY-ACCOUNT] Error getting company info:', error);
            return { success: false, error: error.message };
        }
    },

    async getQuotes() {
        try {
            const response = await this.fetchWithTimeout('/api/company-account/quotes', {
                headers: this.getAuthHeaders()
            });
            const data = await response.json();
            console.log('[COMPANY-ACCOUNT] Quotes response:', response.status);
            return data;
        } catch (error) {
            console.error('[COMPANY-ACCOUNT] Error getting quotes:', error);
            return { success: false, data: [] };
        }
    },

    async getContracts() {
        try {
            const response = await this.fetchWithTimeout('/api/company-account/contracts', {
                headers: this.getAuthHeaders()
            });
            const data = await response.json();
            console.log('[COMPANY-ACCOUNT] Contracts response:', response.status);
            return data;
        } catch (error) {
            console.error('[COMPANY-ACCOUNT] Error getting contracts:', error);
            return { success: false, data: [] };
        }
    },

    async getInvoices() {
        try {
            const response = await this.fetchWithTimeout('/api/company-account/invoices', {
                headers: this.getAuthHeaders()
            });
            const data = await response.json();
            console.log('[COMPANY-ACCOUNT] Invoices response:', response.status);
            return data;
        } catch (error) {
            console.error('[COMPANY-ACCOUNT] Error getting invoices:', error);
            return { success: false, data: [] };
        }
    },

    async getCommunications() {
        try {
            const response = await this.fetchWithTimeout('/api/company-account/communications', {
                headers: this.getAuthHeaders()
            });
            const data = await response.json();
            console.log('[COMPANY-ACCOUNT] Communications response:', response.status);
            return data;
        } catch (error) {
            console.error('[COMPANY-ACCOUNT] Error getting communications:', error);
            return { success: false, data: [] };
        }
    },

    async sendCommunication(data) {
        try {
            const response = await fetch('/api/company-account/communications', {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(data)
            });
            return await response.json();
        } catch (error) {
            console.error('[COMPANY-ACCOUNT] Error sending communication:', error);
            return { success: false, error: error.message };
        }
    },

    async markCommunicationRead(commId) {
        try {
            const response = await fetch(`/api/company-account/communications/${commId}/read`, {
                method: 'PUT',
                headers: this.getAuthHeaders()
            });
            return await response.json();
        } catch (error) {
            console.error('[COMPANY-ACCOUNT] Error marking communication read:', error);
            return { success: false, error: error.message };
        }
    },

    async downloadDocument(type, id) {
        try {
            const response = await fetch(`/api/company-account/${type}/${id}/download`, {
                headers: this.getAuthHeaders()
            });
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${type}_${id}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
                return { success: true };
            }
            return { success: false, error: 'Download failed' };
        } catch (error) {
            console.error('[COMPANY-ACCOUNT] Error downloading document:', error);
            return { success: false, error: error.message };
        }
    },

    async getNotifications() {
        try {
            const response = await this.fetchWithTimeout('/api/company-account/notifications', {
                headers: this.getAuthHeaders()
            });
            const data = await response.json();
            console.log('[COMPANY-ACCOUNT] Notifications response:', response.status);
            return data;
        } catch (error) {
            console.error('[COMPANY-ACCOUNT] Error getting notifications:', error);
            return { success: false, data: [], unread_count: 0 };
        }
    },

    async getSummary() {
        try {
            const response = await this.fetchWithTimeout('/api/company-account/summary', {
                headers: this.getAuthHeaders()
            });
            const data = await response.json();
            console.log('[COMPANY-ACCOUNT] Summary response:', response.status);
            return data;
        } catch (error) {
            console.error('[COMPANY-ACCOUNT] Error getting summary:', error);
            return { success: false, data: {} };
        }
    },

    async markNotificationRead(notifId) {
        try {
            const response = await fetch(`/api/company-account/notifications/${notifId}/read`, {
                method: 'PUT',
                headers: this.getAuthHeaders()
            });
            return await response.json();
        } catch (error) {
            console.error('[COMPANY-ACCOUNT] Error marking notification read:', error);
            return { success: false, error: error.message };
        }
    },

    async markAllNotificationsRead() {
        try {
            const response = await fetch('/api/company-account/notifications/read-all', {
                method: 'PUT',
                headers: this.getAuthHeaders()
            });
            return await response.json();
        } catch (error) {
            console.error('[COMPANY-ACCOUNT] Error marking all notifications read:', error);
            return { success: false, error: error.message };
        }
    },

    isUserAdmin() {
        // Verificar si el usuario es admin desde multiples fuentes
        const user = window.currentUser ||
                    JSON.parse(localStorage.getItem('currentUser') || '{}') ||
                    JSON.parse(localStorage.getItem('user') || '{}');

        const role = user?.role || localStorage.getItem('userRole') || window.userRole;
        console.log('[COMPANY-ACCOUNT] User role check:', role);
        return role === 'admin';
    }
};

// ============================================================================
// STYLES
// ============================================================================
function injectStyles() {
    if (document.getElementById('company-account-styles')) return;

    const style = document.createElement('style');
    style.id = 'company-account-styles';
    style.textContent = `
        :root {
            --ca-bg-primary: #0f0f0f;
            --ca-bg-secondary: #1a1a1a;
            --ca-bg-tertiary: #242424;
            --ca-bg-card: #1e1e1e;
            --ca-border: #333;
            --ca-text-primary: #fff;
            --ca-text-secondary: #a0a0a0;
            --ca-text-muted: #666;
            --ca-accent-purple: #a855f7;
            --ca-accent-blue: #3b82f6;
            --ca-accent-green: #22c55e;
            --ca-accent-yellow: #eab308;
            --ca-accent-red: #ef4444;
            --ca-accent-orange: #f97316;
        }

        .ca-container {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: var(--ca-bg-primary);
            color: var(--ca-text-primary);
            padding: 24px;
            min-height: 100vh;
        }

        /* Header */
        .ca-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 24px;
            flex-wrap: wrap;
            gap: 16px;
        }

        .ca-title-section h1 {
            font-size: 28px;
            font-weight: 700;
            margin: 0 0 8px 0;
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .ca-title-section p {
            color: var(--ca-text-secondary);
            margin: 0;
            font-size: 14px;
        }

        .ca-header-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: linear-gradient(135deg, var(--ca-accent-purple), var(--ca-accent-blue));
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
        }

        /* Tabs */
        .ca-tabs {
            display: flex;
            gap: 0;
            border-bottom: 1px solid var(--ca-border);
            margin-bottom: 24px;
            overflow-x: auto;
        }

        .ca-tab {
            padding: 12px 24px;
            border: none;
            background: transparent;
            color: var(--ca-text-secondary);
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            border-bottom: 2px solid transparent;
            margin-bottom: -1px;
            transition: all 0.2s;
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .ca-tab:hover {
            color: var(--ca-text-primary);
        }

        .ca-tab.active {
            color: var(--ca-accent-purple);
            border-bottom-color: var(--ca-accent-purple);
        }

        .ca-tab-badge {
            background: var(--ca-accent-red);
            color: white;
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 10px;
            font-weight: 600;
        }

        .ca-tab-panel {
            display: none;
        }

        .ca-tab-panel.active {
            display: block;
        }

        /* Stats Grid */
        .ca-stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }

        .ca-stat-card {
            background: var(--ca-bg-card);
            border: 1px solid var(--ca-border);
            border-radius: 12px;
            padding: 20px;
        }

        .ca-stat-card-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 12px;
        }

        .ca-stat-icon {
            width: 44px;
            height: 44px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
        }

        .ca-stat-icon.purple { background: rgba(168, 85, 247, 0.2); }
        .ca-stat-icon.blue { background: rgba(59, 130, 246, 0.2); }
        .ca-stat-icon.green { background: rgba(34, 197, 94, 0.2); }
        .ca-stat-icon.yellow { background: rgba(234, 179, 8, 0.2); }
        .ca-stat-icon.red { background: rgba(239, 68, 68, 0.2); }
        .ca-stat-icon.orange { background: rgba(249, 115, 22, 0.2); }

        .ca-stat-trend {
            font-size: 12px;
            padding: 4px 8px;
            border-radius: 6px;
            font-weight: 500;
        }

        .ca-stat-trend.up { background: rgba(34, 197, 94, 0.2); color: var(--ca-accent-green); }
        .ca-stat-trend.down { background: rgba(239, 68, 68, 0.2); color: var(--ca-accent-red); }
        .ca-stat-trend.neutral { background: rgba(234, 179, 8, 0.2); color: var(--ca-accent-yellow); }

        .ca-stat-value {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 4px;
        }

        .ca-stat-label {
            color: var(--ca-text-secondary);
            font-size: 13px;
        }

        /* Section */
        .ca-section {
            background: var(--ca-bg-card);
            border: 1px solid var(--ca-border);
            border-radius: 12px;
            margin-bottom: 24px;
            overflow: hidden;
        }

        .ca-section-header {
            padding: 16px 20px;
            border-bottom: 1px solid var(--ca-border);
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 12px;
        }

        .ca-section-title {
            font-size: 16px;
            font-weight: 600;
            margin: 0;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .ca-section-body {
            padding: 20px;
        }

        /* Table */
        .ca-table-container {
            overflow-x: auto;
        }

        .ca-table {
            width: 100%;
            border-collapse: collapse;
        }

        .ca-table th {
            background: var(--ca-bg-secondary);
            padding: 12px 16px;
            text-align: left;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--ca-text-muted);
            border-bottom: 1px solid var(--ca-border);
        }

        .ca-table td {
            padding: 14px 16px;
            border-bottom: 1px solid var(--ca-border);
            color: var(--ca-text-primary);
            font-size: 14px;
        }

        .ca-table tr:hover td {
            background: rgba(168, 85, 247, 0.05);
        }

        /* Status badges */
        .ca-status {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
        }

        .ca-status-active { background: rgba(34, 197, 94, 0.2); color: var(--ca-accent-green); }
        .ca-status-pending { background: rgba(234, 179, 8, 0.2); color: var(--ca-accent-yellow); }
        .ca-status-paid { background: rgba(34, 197, 94, 0.2); color: var(--ca-accent-green); }
        .ca-status-overdue { background: rgba(239, 68, 68, 0.2); color: var(--ca-accent-red); }
        .ca-status-draft { background: rgba(102, 102, 102, 0.2); color: var(--ca-text-secondary); }
        .ca-status-sent { background: rgba(59, 130, 246, 0.2); color: var(--ca-accent-blue); }
        .ca-status-accepted { background: rgba(34, 197, 94, 0.2); color: var(--ca-accent-green); }
        .ca-status-rejected { background: rgba(239, 68, 68, 0.2); color: var(--ca-accent-red); }
        .ca-status-expired { background: rgba(249, 115, 22, 0.2); color: var(--ca-accent-orange); }
        .ca-status-signed { background: rgba(34, 197, 94, 0.2); color: var(--ca-accent-green); }
        .ca-status-unread { background: rgba(168, 85, 247, 0.2); color: var(--ca-accent-purple); }

        /* Buttons */
        .ca-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 14px;
            border: none;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
        }

        .ca-btn-primary {
            background: linear-gradient(135deg, var(--ca-accent-purple), var(--ca-accent-blue));
            color: white;
        }

        .ca-btn-primary:hover { opacity: 0.9; }

        .ca-btn-secondary {
            background: var(--ca-bg-tertiary);
            color: var(--ca-text-primary);
            border: 1px solid var(--ca-border);
        }

        .ca-btn-secondary:hover { border-color: var(--ca-accent-purple); }

        .ca-btn-icon {
            width: 32px;
            height: 32px;
            padding: 0;
            background: var(--ca-bg-tertiary);
            border: 1px solid var(--ca-border);
            border-radius: 6px;
            color: var(--ca-text-secondary);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
        }

        .ca-btn-icon:hover {
            border-color: var(--ca-accent-purple);
            color: var(--ca-accent-purple);
        }

        .ca-actions {
            display: flex;
            gap: 6px;
        }

        /* Loading */
        .ca-loading {
            text-align: center;
            padding: 60px 20px;
            color: var(--ca-text-muted);
        }

        .ca-loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid var(--ca-border);
            border-top-color: var(--ca-accent-purple);
            border-radius: 50%;
            animation: ca-spin 1s linear infinite;
            margin: 0 auto 16px;
        }

        @keyframes ca-spin {
            to { transform: rotate(360deg); }
        }

        /* Empty state */
        .ca-empty {
            text-align: center;
            padding: 60px 20px;
            color: var(--ca-text-muted);
        }

        .ca-empty-icon {
            font-size: 48px;
            margin-bottom: 16px;
            opacity: 0.5;
        }

        /* Info banner */
        .ca-info-banner {
            background: linear-gradient(135deg, var(--ca-accent-purple) 0%, var(--ca-accent-blue) 100%);
            color: white;
            padding: 16px 20px;
            border-radius: 12px;
            margin-bottom: 24px;
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .ca-info-banner-icon {
            font-size: 32px;
            opacity: 0.9;
        }

        .ca-info-banner h3 {
            margin: 0 0 4px 0;
            font-size: 16px;
        }

        .ca-info-banner p {
            margin: 0;
            opacity: 0.9;
            font-size: 13px;
        }

        /* Communication thread */
        .ca-comm-thread {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .ca-comm-item {
            background: var(--ca-bg-secondary);
            border: 1px solid var(--ca-border);
            border-radius: 12px;
            padding: 16px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .ca-comm-item:hover {
            border-color: var(--ca-accent-purple);
        }

        .ca-comm-item.unread {
            border-left: 3px solid var(--ca-accent-purple);
        }

        .ca-comm-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
        }

        .ca-comm-from {
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .ca-comm-badge {
            font-size: 10px;
            padding: 2px 8px;
            border-radius: 10px;
            font-weight: 600;
        }

        .ca-comm-badge.aponnt { background: var(--ca-accent-purple); color: white; }
        .ca-comm-badge.empresa { background: var(--ca-accent-blue); color: white; }
        .ca-comm-badge.support { background: var(--ca-accent-green); color: white; }
        .ca-comm-badge.sales { background: var(--ca-accent-orange); color: white; }
        .ca-comm-badge.admin { background: var(--ca-accent-yellow); color: black; }

        .ca-comm-date {
            font-size: 12px;
            color: var(--ca-text-muted);
        }

        .ca-comm-subject {
            font-weight: 500;
            margin-bottom: 6px;
        }

        .ca-comm-preview {
            color: var(--ca-text-secondary);
            font-size: 13px;
            line-height: 1.4;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
        }

        .ca-comm-actions {
            display: flex;
            gap: 8px;
            margin-top: 12px;
        }

        /* Communication compose */
        .ca-compose {
            background: var(--ca-bg-card);
            border: 1px solid var(--ca-border);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 24px;
        }

        .ca-compose-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
        }

        .ca-form-group {
            margin-bottom: 16px;
        }

        .ca-form-label {
            display: block;
            font-size: 13px;
            font-weight: 500;
            margin-bottom: 6px;
            color: var(--ca-text-secondary);
        }

        .ca-form-input,
        .ca-form-select,
        .ca-form-textarea {
            width: 100%;
            padding: 10px 14px;
            background: var(--ca-bg-secondary);
            border: 1px solid var(--ca-border);
            border-radius: 8px;
            color: var(--ca-text-primary);
            font-size: 14px;
            transition: border-color 0.2s;
        }

        .ca-form-input:focus,
        .ca-form-select:focus,
        .ca-form-textarea:focus {
            outline: none;
            border-color: var(--ca-accent-purple);
        }

        .ca-form-textarea {
            min-height: 120px;
            resize: vertical;
        }

        /* Timeline */
        .ca-timeline {
            position: relative;
            padding-left: 24px;
        }

        .ca-timeline::before {
            content: '';
            position: absolute;
            left: 8px;
            top: 0;
            bottom: 0;
            width: 2px;
            background: var(--ca-border);
        }

        .ca-timeline-item {
            position: relative;
            padding-bottom: 24px;
        }

        .ca-timeline-item::before {
            content: '';
            position: absolute;
            left: -20px;
            top: 4px;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: var(--ca-accent-purple);
            border: 2px solid var(--ca-bg-primary);
        }

        .ca-timeline-date {
            font-size: 12px;
            color: var(--ca-text-muted);
            margin-bottom: 4px;
        }

        .ca-timeline-title {
            font-weight: 500;
            margin-bottom: 4px;
        }

        .ca-timeline-desc {
            font-size: 13px;
            color: var(--ca-text-secondary);
        }

        /* Modal */
        .ca-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 20px;
        }

        .ca-modal {
            background: var(--ca-bg-card);
            border: 1px solid var(--ca-border);
            border-radius: 16px;
            width: 100%;
            max-width: 600px;
            max-height: 90vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }

        .ca-modal-header {
            padding: 20px;
            border-bottom: 1px solid var(--ca-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .ca-modal-title {
            font-size: 18px;
            font-weight: 600;
            margin: 0;
        }

        .ca-modal-close {
            background: none;
            border: none;
            color: var(--ca-text-secondary);
            font-size: 24px;
            cursor: pointer;
            padding: 0;
            line-height: 1;
        }

        .ca-modal-close:hover {
            color: var(--ca-text-primary);
        }

        .ca-modal-body {
            padding: 20px;
            overflow-y: auto;
            flex: 1;
        }

        .ca-modal-footer {
            padding: 16px 20px;
            border-top: 1px solid var(--ca-border);
            display: flex;
            justify-content: flex-end;
            gap: 12px;
        }

        /* Document detail */
        .ca-doc-detail {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
            margin-bottom: 20px;
        }

        .ca-doc-field {
            padding: 12px;
            background: var(--ca-bg-secondary);
            border-radius: 8px;
        }

        .ca-doc-field-label {
            font-size: 11px;
            text-transform: uppercase;
            color: var(--ca-text-muted);
            margin-bottom: 4px;
        }

        .ca-doc-field-value {
            font-weight: 500;
        }

        /* Amount highlight */
        .ca-amount {
            font-family: 'JetBrains Mono', 'Consolas', monospace;
            font-weight: 600;
        }

        .ca-amount.large {
            font-size: 24px;
        }

        .ca-amount.positive { color: var(--ca-accent-green); }
        .ca-amount.negative { color: var(--ca-accent-red); }

        /* Progress indicator */
        .ca-progress-bar {
            height: 8px;
            background: var(--ca-bg-tertiary);
            border-radius: 4px;
            overflow: hidden;
        }

        .ca-progress-fill {
            height: 100%;
            background: linear-gradient(90deg, var(--ca-accent-purple), var(--ca-accent-blue));
            border-radius: 4px;
            transition: width 0.5s ease;
        }

        /* Responsive */
        @media (max-width: 768px) {
            .ca-stats-grid {
                grid-template-columns: 1fr;
            }

            .ca-doc-detail {
                grid-template-columns: 1fr;
            }

            .ca-tabs {
                flex-wrap: nowrap;
            }

            .ca-tab {
                padding: 10px 16px;
                font-size: 13px;
            }
        }

        /* Notification Bell */
        #ca-notification-bell {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
        }

        .ca-bell-btn {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--ca-accent-purple), var(--ca-accent-blue));
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            box-shadow: 0 4px 12px rgba(168, 85, 247, 0.4);
            transition: all 0.2s;
        }

        .ca-bell-btn:hover {
            transform: scale(1.05);
            box-shadow: 0 6px 16px rgba(168, 85, 247, 0.5);
        }

        .ca-bell-icon {
            font-size: 20px;
        }

        .ca-bell-badge {
            position: absolute;
            top: -4px;
            right: -4px;
            background: var(--ca-accent-red);
            color: white;
            font-size: 11px;
            font-weight: 700;
            min-width: 20px;
            height: 20px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 5px;
            animation: ca-pulse 2s infinite;
        }

        @keyframes ca-pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }

        .ca-notification-panel {
            position: absolute;
            top: 56px;
            right: 0;
            width: 360px;
            max-height: 480px;
            background: var(--ca-bg-card);
            border: 1px solid var(--ca-border);
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            overflow: hidden;
        }

        .ca-notif-header {
            padding: 16px 20px;
            background: var(--ca-bg-secondary);
            border-bottom: 1px solid var(--ca-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-weight: 600;
        }

        .ca-notif-mark-all {
            background: none;
            border: none;
            color: var(--ca-accent-purple);
            font-size: 12px;
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 4px;
        }

        .ca-notif-mark-all:hover {
            background: rgba(168, 85, 247, 0.1);
        }

        .ca-notif-list {
            max-height: 400px;
            overflow-y: auto;
        }

        .ca-notif-item {
            padding: 14px 20px;
            border-bottom: 1px solid var(--ca-border);
            display: flex;
            gap: 12px;
            cursor: pointer;
            transition: background 0.2s;
        }

        .ca-notif-item:hover {
            background: rgba(168, 85, 247, 0.05);
        }

        .ca-notif-item.unread {
            background: rgba(168, 85, 247, 0.08);
            border-left: 3px solid var(--ca-accent-purple);
        }

        .ca-notif-icon {
            font-size: 20px;
            flex-shrink: 0;
        }

        .ca-notif-content {
            flex: 1;
            min-width: 0;
        }

        .ca-notif-title {
            font-weight: 500;
            margin-bottom: 4px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .ca-notif-msg {
            font-size: 13px;
            color: var(--ca-text-secondary);
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            margin-bottom: 4px;
        }

        .ca-notif-time {
            font-size: 11px;
            color: var(--ca-text-muted);
        }

        .ca-notif-empty {
            padding: 40px 20px;
            text-align: center;
            color: var(--ca-text-muted);
        }

        .ca-notif-empty span {
            font-size: 32px;
            display: block;
            margin-bottom: 8px;
            opacity: 0.5;
        }

        @media (max-width: 480px) {
            .ca-notification-panel {
                width: 300px;
                right: -10px;
            }
        }
    `;
    document.head.appendChild(style);
}

// ============================================================================
// UTILITIES
// ============================================================================
function formatCurrency(amount, currency = 'ARS') {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: currency
    }).format(amount || 0);
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-AR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-AR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getDaysUntil(dateStr) {
    if (!dateStr) return null;
    const target = new Date(dateStr);
    const today = new Date();
    const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    return diff;
}

function getStatusClass(status) {
    const statusMap = {
        'active': 'active',
        'activo': 'active',
        'pending': 'pending',
        'pendiente': 'pending',
        'paid': 'paid',
        'pagado': 'paid',
        'pagada': 'paid',
        'overdue': 'overdue',
        'vencido': 'overdue',
        'vencida': 'overdue',
        'draft': 'draft',
        'borrador': 'draft',
        'sent': 'sent',
        'enviado': 'sent',
        'enviada': 'sent',
        'accepted': 'accepted',
        'aceptado': 'accepted',
        'aceptada': 'accepted',
        'rejected': 'rejected',
        'rechazado': 'rejected',
        'rechazada': 'rejected',
        'expired': 'expired',
        'expirado': 'expired',
        'expirada': 'expired',
        'signed': 'signed',
        'firmado': 'signed',
        'firmada': 'signed',
        'unread': 'unread',
        'no leido': 'unread'
    };
    return statusMap[(status || '').toLowerCase()] || 'draft';
}

// ============================================================================
// MAIN ENGINE
// ============================================================================
const CompanyAccountEngine = {
    async init() {
        console.log('[COMPANY-ACCOUNT] Initializing...');

        try {
            // Verificar si es admin
            AccountState.isAdmin = AccountAPI.isUserAdmin();
            console.log('[COMPANY-ACCOUNT] Is admin:', AccountState.isAdmin);

            if (!AccountState.isAdmin) {
                console.warn('[COMPANY-ACCOUNT] Access denied - not admin');
                this.renderAccessDenied();
                return;
            }

            injectStyles();
            console.log('[COMPANY-ACCOUNT] Styles injected');

            await this.loadData();
            console.log('[COMPANY-ACCOUNT] Data loaded, rendering...');

            this.render();
            this.initNotificationBell();
            console.log('[COMPANY-ACCOUNT] Render complete!');
        } catch (error) {
            console.error('[COMPANY-ACCOUNT] Init error:', error);
            this.renderError(error);
        }
    },

    async loadData() {
        AccountState.isLoading = true;
        this.renderLoading();
        console.log('[COMPANY-ACCOUNT] Loading data...');

        try {
            // Cargar datos en paralelo
            console.log('[COMPANY-ACCOUNT] Fetching from APIs...');
            const [companyRes, quotesRes, contractsRes, invoicesRes, commsRes, notifsRes] = await Promise.all([
                AccountAPI.getCompanyInfo(),
                AccountAPI.getQuotes(),
                AccountAPI.getContracts(),
                AccountAPI.getInvoices(),
                AccountAPI.getCommunications(),
                AccountAPI.getNotifications()
            ]);

            console.log('[COMPANY-ACCOUNT] API responses received:', {
                company: companyRes?.success,
                quotes: quotesRes?.success,
                contracts: contractsRes?.success,
                invoices: invoicesRes?.success,
                comms: commsRes?.success,
                notifs: notifsRes?.success
            });

            AccountState.company = companyRes.data || companyRes;
            AccountState.quotes = quotesRes.data || [];
            AccountState.contracts = contractsRes.data || [];
            AccountState.invoices = invoicesRes.data || [];
            AccountState.communications = commsRes.data || [];
            AccountState.notifications = notifsRes.data || [];
            AccountState.stats.unreadNotifications = notifsRes.unread_count || 0;

            // Calcular stats
            this.calculateStats();
            console.log('[COMPANY-ACCOUNT] Stats calculated');

        } catch (error) {
            console.error('[COMPANY-ACCOUNT] Error loading data:', error);
        }

        AccountState.isLoading = false;
    },

    renderAccessDenied() {
        const container = this.getContainer();
        if (!container) return;

        container.innerHTML = `
            <div class="ca-container">
                <div class="ca-section">
                    <div class="ca-section-body">
                        <div class="ca-empty">
                            <div class="ca-empty-icon">🔒</div>
                            <h3>Acceso Restringido</h3>
                            <p>Este modulo solo esta disponible para administradores de la empresa.</p>
                            <p style="margin-top: 16px; font-size: 12px; color: var(--ca-text-muted);">
                                Si necesita acceso, contacte al administrador de su empresa.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    initNotificationBell() {
        // Crear campanita flotante si hay notificaciones
        this.renderNotificationBell();
        // Actualizar cada 30 segundos
        setInterval(() => this.updateNotificationBell(), 30000);
    },

    renderNotificationBell() {
        // Remover campanita existente si hay
        const existing = document.getElementById('ca-notification-bell');
        if (existing) existing.remove();

        const unreadCount = AccountState.stats.unreadNotifications;

        const bellContainer = document.createElement('div');
        bellContainer.id = 'ca-notification-bell';
        bellContainer.innerHTML = `
            <button class="ca-bell-btn" onclick="CompanyAccountEngine.toggleNotificationPanel()">
                <span class="ca-bell-icon">🔔</span>
                ${unreadCount > 0 ? `<span class="ca-bell-badge">${unreadCount}</span>` : ''}
            </button>
            <div class="ca-notification-panel" id="ca-notif-panel" style="display: none;">
                <div class="ca-notif-header">
                    <span>Notificaciones</span>
                    ${unreadCount > 0 ? `
                        <button class="ca-notif-mark-all" onclick="CompanyAccountEngine.markAllRead()">
                            Marcar todo leido
                        </button>
                    ` : ''}
                </div>
                <div class="ca-notif-list">
                    ${this.renderNotificationList()}
                </div>
            </div>
        `;

        document.body.appendChild(bellContainer);
    },

    renderNotificationList() {
        if (AccountState.notifications.length === 0) {
            return `
                <div class="ca-notif-empty">
                    <span>🔔</span>
                    <p>Sin notificaciones</p>
                </div>
            `;
        }

        return AccountState.notifications.map(notif => `
            <div class="ca-notif-item ${notif.is_read ? '' : 'unread'}" onclick="CompanyAccountEngine.handleNotification(${notif.id}, '${notif.notification_type}', '${notif.reference_id || ''}')">
                <div class="ca-notif-icon">${this.getNotificationIcon(notif.notification_type)}</div>
                <div class="ca-notif-content">
                    <div class="ca-notif-title">${notif.title}</div>
                    ${notif.message ? `<div class="ca-notif-msg">${notif.message}</div>` : ''}
                    <div class="ca-notif-time">${formatDateTime(notif.created_at)}</div>
                </div>
            </div>
        `).join('');
    },

    getNotificationIcon(type) {
        const icons = {
            'invoice_due': '💳',
            'invoice_overdue': '⚠️',
            'new_quote': '📝',
            'contract_expiring': '📄',
            'new_message': '💬',
            'payment_received': '✅',
            'system': '🔔'
        };
        return icons[type] || '🔔';
    },

    toggleNotificationPanel() {
        const panel = document.getElementById('ca-notif-panel');
        if (panel) {
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        }
    },

    async handleNotification(notifId, type, refId) {
        // Marcar como leida
        await AccountAPI.markNotificationRead(notifId);

        // Actualizar estado local
        const notif = AccountState.notifications.find(n => n.id === notifId);
        if (notif && !notif.is_read) {
            notif.is_read = true;
            AccountState.stats.unreadNotifications--;
            this.renderNotificationBell();
        }

        // Navegar segun tipo
        if (type === 'invoice_due' || type === 'invoice_overdue') {
            this.switchTab('invoices');
            if (refId) this.viewInvoice(parseInt(refId));
        } else if (type === 'new_quote') {
            this.switchTab('quotes');
            if (refId) this.viewQuote(parseInt(refId));
        } else if (type === 'new_message') {
            this.switchTab('communications');
        } else if (type === 'contract_expiring') {
            this.switchTab('contracts');
        }

        this.toggleNotificationPanel();
    },

    async markAllRead() {
        await AccountAPI.markAllNotificationsRead();
        AccountState.notifications.forEach(n => n.is_read = true);
        AccountState.stats.unreadNotifications = 0;
        this.renderNotificationBell();
    },

    async updateNotificationBell() {
        const notifsRes = await AccountAPI.getNotifications();
        if (notifsRes.success) {
            AccountState.notifications = notifsRes.data || [];
            AccountState.stats.unreadNotifications = notifsRes.unread_count || 0;
            this.renderNotificationBell();
        }
    },

    calculateStats() {
        const invoices = AccountState.invoices;
        const contracts = AccountState.contracts;
        const comms = AccountState.communications;

        // Facturas pendientes
        AccountState.stats.pendingInvoices = invoices.filter(
            i => ['pending', 'pendiente', 'sent', 'enviada'].includes((i.status || '').toLowerCase())
        ).length;

        // Deuda total
        AccountState.stats.totalDebt = invoices
            .filter(i => !['paid', 'pagado', 'pagada'].includes((i.status || '').toLowerCase()))
            .reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0);

        // Contratos activos
        AccountState.stats.activeContracts = contracts.filter(
            c => ['active', 'activo', 'signed', 'firmado'].includes((c.status || '').toLowerCase())
        ).length;

        // Comunicaciones no leidas
        AccountState.stats.unreadComms = comms.filter(c => !c.read_at).length;
    },

    getContainer() {
        // Buscar contenedores en orden de prioridad
        const selectors = [
            '#module-content',
            '.dynamic-content-area',
            '.main-content-area',
            '.main-content',
            '#mainContent',
            '.content-wrapper'
        ];

        for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el) {
                console.log('[COMPANY-ACCOUNT] Container found:', selector);
                return el;
            }
        }

        console.warn('[COMPANY-ACCOUNT] No container found! Selectors tried:', selectors);
        return null;
    },

    renderLoading() {
        const container = this.getContainer();
        if (!container) {
            console.error('[COMPANY-ACCOUNT] Cannot render loading - no container');
            return;
        }

        container.innerHTML = `
            <div class="ca-container">
                <div class="ca-loading">
                    <div class="ca-loading-spinner"></div>
                    <p>Cargando informacion de cuenta...</p>
                </div>
            </div>
        `;
    },

    renderError(error) {
        const container = this.getContainer();
        if (!container) {
            console.error('[COMPANY-ACCOUNT] Cannot render error - no container');
            return;
        }

        container.innerHTML = `
            <div class="ca-container">
                <div class="ca-section">
                    <div class="ca-section-body">
                        <div class="ca-empty">
                            <div class="ca-empty-icon">⚠️</div>
                            <h3>Error al cargar</h3>
                            <p>${error?.message || 'Error desconocido'}</p>
                            <button class="ca-btn ca-btn-primary" onclick="CompanyAccountEngine.init()">
                                🔄 Reintentar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    render() {
        const container = this.getContainer();
        if (!container) {
            console.error('[COMPANY-ACCOUNT] Cannot render - no container found');
            return;
        }

        const companyName = AccountState.company?.name || AccountState.company?.legal_name || 'Mi Empresa';

        container.innerHTML = `
            <div class="ca-container">
                <!-- Header -->
                <div class="ca-header">
                    <div class="ca-title-section">
                        <h1>
                            <span>💼</span>
                            Cuenta Comercial
                            <span class="ca-header-badge">APONNT Partner</span>
                        </h1>
                        <p>Relacion comercial de ${companyName} con APONNT</p>
                    </div>
                </div>

                <!-- Tabs -->
                <div class="ca-tabs">
                    <button class="ca-tab ${AccountState.currentTab === 'dashboard' ? 'active' : ''}" data-tab="dashboard">
                        📊 Dashboard
                    </button>
                    <button class="ca-tab ${AccountState.currentTab === 'quotes' ? 'active' : ''}" data-tab="quotes">
                        📝 Presupuestos
                        ${AccountState.quotes.filter(q => q.status === 'pending').length > 0 ?
                            `<span class="ca-tab-badge">${AccountState.quotes.filter(q => q.status === 'pending').length}</span>` : ''}
                    </button>
                    <button class="ca-tab ${AccountState.currentTab === 'contracts' ? 'active' : ''}" data-tab="contracts">
                        📄 Contratos
                    </button>
                    <button class="ca-tab ${AccountState.currentTab === 'invoices' ? 'active' : ''}" data-tab="invoices">
                        💳 Facturas
                        ${AccountState.stats.pendingInvoices > 0 ?
                            `<span class="ca-tab-badge">${AccountState.stats.pendingInvoices}</span>` : ''}
                    </button>
                    <button class="ca-tab ${AccountState.currentTab === 'communications' ? 'active' : ''}" data-tab="communications">
                        💬 Comunicaciones
                        ${AccountState.stats.unreadComms > 0 ?
                            `<span class="ca-tab-badge">${AccountState.stats.unreadComms}</span>` : ''}
                    </button>
                </div>

                <!-- Tab Panels -->
                <div class="ca-tab-panel ${AccountState.currentTab === 'dashboard' ? 'active' : ''}" id="panel-dashboard">
                    ${this.renderDashboard()}
                </div>
                <div class="ca-tab-panel ${AccountState.currentTab === 'quotes' ? 'active' : ''}" id="panel-quotes">
                    ${this.renderQuotes()}
                </div>
                <div class="ca-tab-panel ${AccountState.currentTab === 'contracts' ? 'active' : ''}" id="panel-contracts">
                    ${this.renderContracts()}
                </div>
                <div class="ca-tab-panel ${AccountState.currentTab === 'invoices' ? 'active' : ''}" id="panel-invoices">
                    ${this.renderInvoices()}
                </div>
                <div class="ca-tab-panel ${AccountState.currentTab === 'communications' ? 'active' : ''}" id="panel-communications">
                    ${this.renderCommunications()}
                </div>
            </div>
        `;

        this.attachEventListeners();
    },

    renderDashboard() {
        const nextInvoice = AccountState.invoices.find(i =>
            !['paid', 'pagado', 'pagada'].includes((i.status || '').toLowerCase())
        );
        const daysUntilDue = nextInvoice ? getDaysUntil(nextInvoice.due_date) : null;

        return `
            <!-- Info Banner -->
            <div class="ca-info-banner">
                <div class="ca-info-banner-icon">🤝</div>
                <div>
                    <h3>Bienvenido a su Panel de Cuenta Comercial</h3>
                    <p>Aqui puede ver toda la informacion de su relacion comercial con APONNT: presupuestos, contratos, facturas y comunicaciones.</p>
                </div>
            </div>

            <!-- Stats -->
            <div class="ca-stats-grid">
                <div class="ca-stat-card">
                    <div class="ca-stat-card-header">
                        <div class="ca-stat-icon purple">📝</div>
                        ${AccountState.quotes.filter(q => q.status === 'pending').length > 0 ?
                            '<span class="ca-stat-trend neutral">Pendientes</span>' : ''}
                    </div>
                    <div class="ca-stat-value">${AccountState.quotes.length}</div>
                    <div class="ca-stat-label">Presupuestos Totales</div>
                </div>

                <div class="ca-stat-card">
                    <div class="ca-stat-card-header">
                        <div class="ca-stat-icon green">📄</div>
                        <span class="ca-stat-trend up">Activos</span>
                    </div>
                    <div class="ca-stat-value">${AccountState.stats.activeContracts}</div>
                    <div class="ca-stat-label">Contratos Vigentes</div>
                </div>

                <div class="ca-stat-card">
                    <div class="ca-stat-card-header">
                        <div class="ca-stat-icon ${AccountState.stats.totalDebt > 0 ? 'red' : 'green'}">💳</div>
                        ${AccountState.stats.pendingInvoices > 0 ?
                            '<span class="ca-stat-trend down">Pendientes</span>' :
                            '<span class="ca-stat-trend up">Al dia</span>'}
                    </div>
                    <div class="ca-stat-value ca-amount ${AccountState.stats.totalDebt > 0 ? 'negative' : 'positive'}">
                        ${formatCurrency(AccountState.stats.totalDebt)}
                    </div>
                    <div class="ca-stat-label">Saldo Pendiente</div>
                </div>

                <div class="ca-stat-card">
                    <div class="ca-stat-card-header">
                        <div class="ca-stat-icon blue">💬</div>
                        ${AccountState.stats.unreadComms > 0 ?
                            `<span class="ca-stat-trend neutral">${AccountState.stats.unreadComms} nuevas</span>` : ''}
                    </div>
                    <div class="ca-stat-value">${AccountState.communications.length}</div>
                    <div class="ca-stat-label">Comunicaciones</div>
                </div>
            </div>

            <!-- Proximos vencimientos -->
            ${nextInvoice ? `
                <div class="ca-section">
                    <div class="ca-section-header">
                        <h3 class="ca-section-title">⏰ Proximo Vencimiento</h3>
                        ${daysUntilDue !== null && daysUntilDue <= 7 ?
                            `<span class="ca-status ca-status-overdue">Vence en ${daysUntilDue} dias</span>` : ''}
                    </div>
                    <div class="ca-section-body">
                        <div class="ca-doc-detail">
                            <div class="ca-doc-field">
                                <div class="ca-doc-field-label">Factura</div>
                                <div class="ca-doc-field-value">${nextInvoice.invoice_number || nextInvoice.id}</div>
                            </div>
                            <div class="ca-doc-field">
                                <div class="ca-doc-field-label">Fecha Vencimiento</div>
                                <div class="ca-doc-field-value">${formatDate(nextInvoice.due_date)}</div>
                            </div>
                            <div class="ca-doc-field">
                                <div class="ca-doc-field-label">Monto</div>
                                <div class="ca-doc-field-value ca-amount">${formatCurrency(nextInvoice.total)}</div>
                            </div>
                            <div class="ca-doc-field">
                                <div class="ca-doc-field-label">Estado</div>
                                <div class="ca-doc-field-value">
                                    <span class="ca-status ca-status-${getStatusClass(nextInvoice.status)}">${nextInvoice.status}</span>
                                </div>
                            </div>
                        </div>
                        <div style="display: flex; gap: 12px;">
                            <button class="ca-btn ca-btn-primary" onclick="CompanyAccountEngine.viewInvoice(${nextInvoice.id})">
                                👁️ Ver Detalle
                            </button>
                            <button class="ca-btn ca-btn-secondary" onclick="CompanyAccountEngine.downloadDocument('invoices', ${nextInvoice.id})">
                                📥 Descargar PDF
                            </button>
                        </div>
                    </div>
                </div>
            ` : `
                <div class="ca-section">
                    <div class="ca-section-body">
                        <div class="ca-empty">
                            <div class="ca-empty-icon">✅</div>
                            <p>No tiene facturas pendientes de pago</p>
                        </div>
                    </div>
                </div>
            `}

            <!-- Comunicaciones recientes -->
            ${AccountState.communications.length > 0 ? `
                <div class="ca-section">
                    <div class="ca-section-header">
                        <h3 class="ca-section-title">💬 Comunicaciones Recientes</h3>
                        <button class="ca-btn ca-btn-secondary" onclick="CompanyAccountEngine.switchTab('communications')">
                            Ver Todas →
                        </button>
                    </div>
                    <div class="ca-section-body">
                        <div class="ca-comm-thread">
                            ${AccountState.communications.slice(0, 3).map(comm => this.renderCommItem(comm)).join('')}
                        </div>
                    </div>
                </div>
            ` : ''}
        `;
    },

    renderQuotes() {
        if (AccountState.quotes.length === 0) {
            return `
                <div class="ca-empty">
                    <div class="ca-empty-icon">📝</div>
                    <h3>Sin presupuestos</h3>
                    <p>No hay presupuestos registrados en su cuenta.</p>
                </div>
            `;
        }

        return `
            <div class="ca-section">
                <div class="ca-section-header">
                    <h3 class="ca-section-title">📝 Historial de Presupuestos</h3>
                </div>
                <div class="ca-table-container">
                    <table class="ca-table">
                        <thead>
                            <tr>
                                <th>Numero</th>
                                <th>Fecha</th>
                                <th>Descripcion</th>
                                <th>Monto</th>
                                <th>Vigencia</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${AccountState.quotes.map(quote => `
                                <tr>
                                    <td><strong>${quote.quote_number || quote.id}</strong></td>
                                    <td>${formatDate(quote.created_at)}</td>
                                    <td>${quote.description || quote.title || '-'}</td>
                                    <td class="ca-amount">${formatCurrency(quote.total)}</td>
                                    <td>${formatDate(quote.valid_until)}</td>
                                    <td>
                                        <span class="ca-status ca-status-${getStatusClass(quote.status)}">
                                            ${quote.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div class="ca-actions">
                                            <button class="ca-btn-icon" onclick="CompanyAccountEngine.viewQuote(${quote.id})" title="Ver detalle">
                                                👁️
                                            </button>
                                            <button class="ca-btn-icon" onclick="CompanyAccountEngine.downloadDocument('quotes', ${quote.id})" title="Descargar PDF">
                                                📥
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    renderContracts() {
        if (AccountState.contracts.length === 0) {
            return `
                <div class="ca-empty">
                    <div class="ca-empty-icon">📄</div>
                    <h3>Sin contratos</h3>
                    <p>No hay contratos registrados en su cuenta.</p>
                </div>
            `;
        }

        return `
            <div class="ca-section">
                <div class="ca-section-header">
                    <h3 class="ca-section-title">📄 Contratos y EULA</h3>
                </div>
                <div class="ca-table-container">
                    <table class="ca-table">
                        <thead>
                            <tr>
                                <th>Tipo</th>
                                <th>Fecha Firma</th>
                                <th>Vigencia Desde</th>
                                <th>Vigencia Hasta</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${AccountState.contracts.map(contract => `
                                <tr>
                                    <td><strong>${contract.type || contract.title || 'Contrato de Servicio'}</strong></td>
                                    <td>${formatDate(contract.signed_at || contract.created_at)}</td>
                                    <td>${formatDate(contract.start_date)}</td>
                                    <td>${formatDate(contract.end_date) || 'Indefinido'}</td>
                                    <td>
                                        <span class="ca-status ca-status-${getStatusClass(contract.status)}">
                                            ${contract.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div class="ca-actions">
                                            <button class="ca-btn-icon" onclick="CompanyAccountEngine.viewContract(${contract.id})" title="Ver detalle">
                                                👁️
                                            </button>
                                            <button class="ca-btn-icon" onclick="CompanyAccountEngine.downloadDocument('contracts', ${contract.id})" title="Descargar PDF">
                                                📥
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    renderInvoices() {
        if (AccountState.invoices.length === 0) {
            return `
                <div class="ca-empty">
                    <div class="ca-empty-icon">💳</div>
                    <h3>Sin facturas</h3>
                    <p>No hay facturas registradas en su cuenta.</p>
                </div>
            `;
        }

        // Separar facturas pendientes y pagadas
        const pendingInvoices = AccountState.invoices.filter(
            i => !['paid', 'pagado', 'pagada'].includes((i.status || '').toLowerCase())
        );
        const paidInvoices = AccountState.invoices.filter(
            i => ['paid', 'pagado', 'pagada'].includes((i.status || '').toLowerCase())
        );

        return `
            ${pendingInvoices.length > 0 ? `
                <div class="ca-section">
                    <div class="ca-section-header">
                        <h3 class="ca-section-title">⚠️ Facturas Pendientes</h3>
                        <span class="ca-status ca-status-pending">${pendingInvoices.length} pendiente${pendingInvoices.length > 1 ? 's' : ''}</span>
                    </div>
                    <div class="ca-table-container">
                        <table class="ca-table">
                            <thead>
                                <tr>
                                    <th>Numero</th>
                                    <th>Fecha Emision</th>
                                    <th>Vencimiento</th>
                                    <th>Concepto</th>
                                    <th>Monto</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${pendingInvoices.map(invoice => {
                                    const daysUntil = getDaysUntil(invoice.due_date);
                                    const isOverdue = daysUntil !== null && daysUntil < 0;
                                    return `
                                        <tr>
                                            <td><strong>${invoice.invoice_number || invoice.id}</strong></td>
                                            <td>${formatDate(invoice.created_at)}</td>
                                            <td>
                                                ${formatDate(invoice.due_date)}
                                                ${isOverdue ? '<br><small style="color: var(--ca-accent-red);">Vencida</small>' :
                                                  daysUntil <= 7 ? `<br><small style="color: var(--ca-accent-yellow);">Vence en ${daysUntil}d</small>` : ''}
                                            </td>
                                            <td>${invoice.description || invoice.concept || '-'}</td>
                                            <td class="ca-amount">${formatCurrency(invoice.total)}</td>
                                            <td>
                                                <span class="ca-status ca-status-${isOverdue ? 'overdue' : getStatusClass(invoice.status)}">
                                                    ${isOverdue ? 'Vencida' : invoice.status}
                                                </span>
                                            </td>
                                            <td>
                                                <div class="ca-actions">
                                                    <button class="ca-btn-icon" onclick="CompanyAccountEngine.viewInvoice(${invoice.id})" title="Ver detalle">
                                                        👁️
                                                    </button>
                                                    <button class="ca-btn-icon" onclick="CompanyAccountEngine.downloadDocument('invoices', ${invoice.id})" title="Descargar PDF">
                                                        📥
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            ` : ''}

            <div class="ca-section">
                <div class="ca-section-header">
                    <h3 class="ca-section-title">📋 Historial de Facturas</h3>
                </div>
                <div class="ca-table-container">
                    <table class="ca-table">
                        <thead>
                            <tr>
                                <th>Numero</th>
                                <th>Fecha</th>
                                <th>Concepto</th>
                                <th>Monto</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${AccountState.invoices.map(invoice => `
                                <tr>
                                    <td><strong>${invoice.invoice_number || invoice.id}</strong></td>
                                    <td>${formatDate(invoice.created_at)}</td>
                                    <td>${invoice.description || invoice.concept || '-'}</td>
                                    <td class="ca-amount">${formatCurrency(invoice.total)}</td>
                                    <td>
                                        <span class="ca-status ca-status-${getStatusClass(invoice.status)}">
                                            ${invoice.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div class="ca-actions">
                                            <button class="ca-btn-icon" onclick="CompanyAccountEngine.viewInvoice(${invoice.id})" title="Ver detalle">
                                                👁️
                                            </button>
                                            <button class="ca-btn-icon" onclick="CompanyAccountEngine.downloadDocument('invoices', ${invoice.id})" title="Descargar PDF">
                                                📥
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    renderCommunications() {
        return `
            <!-- Compose -->
            <div class="ca-compose">
                <div class="ca-compose-header">
                    <h3 style="margin: 0;">✉️ Nueva Comunicacion</h3>
                </div>
                <div class="ca-form-group">
                    <label class="ca-form-label">Destinatario</label>
                    <select class="ca-form-select" id="comm-recipient">
                        <option value="support">Soporte Tecnico</option>
                        <option value="sales">Comercial / Ventas</option>
                        <option value="admin">Administracion / Facturacion</option>
                    </select>
                </div>
                <div class="ca-form-group">
                    <label class="ca-form-label">Asunto</label>
                    <input type="text" class="ca-form-input" id="comm-subject" placeholder="Asunto del mensaje...">
                </div>
                <div class="ca-form-group">
                    <label class="ca-form-label">Mensaje</label>
                    <textarea class="ca-form-textarea" id="comm-message" placeholder="Escriba su mensaje aqui..."></textarea>
                </div>
                <div style="display: flex; justify-content: flex-end;">
                    <button class="ca-btn ca-btn-primary" onclick="CompanyAccountEngine.sendMessage()">
                        📤 Enviar Mensaje
                    </button>
                </div>
            </div>

            <!-- Thread -->
            <div class="ca-section">
                <div class="ca-section-header">
                    <h3 class="ca-section-title">💬 Historial de Comunicaciones</h3>
                    ${AccountState.stats.unreadComms > 0 ?
                        `<span class="ca-status ca-status-unread">${AccountState.stats.unreadComms} sin leer</span>` : ''}
                </div>
                <div class="ca-section-body">
                    ${AccountState.communications.length === 0 ? `
                        <div class="ca-empty">
                            <div class="ca-empty-icon">💬</div>
                            <h3>Sin comunicaciones</h3>
                            <p>No hay comunicaciones registradas. Envie un mensaje para iniciar una conversacion.</p>
                        </div>
                    ` : `
                        <div class="ca-comm-thread">
                            ${AccountState.communications.map(comm => this.renderCommItem(comm)).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;
    },

    renderCommItem(comm) {
        const isFromAponnt = comm.from_aponnt || comm.direction === 'inbound';
        const isUnread = !comm.read_at;

        return `
            <div class="ca-comm-item ${isUnread ? 'unread' : ''}" onclick="CompanyAccountEngine.viewCommunication(${comm.id})">
                <div class="ca-comm-header">
                    <div class="ca-comm-from">
                        ${isFromAponnt ?
                            `<span class="ca-comm-badge ${comm.department || 'aponnt'}">${comm.from_name || 'APONNT'}</span>` :
                            `<span class="ca-comm-badge empresa">Mi Empresa</span>`
                        }
                        ${isUnread ? '<span class="ca-status ca-status-unread">Nueva</span>' : ''}
                    </div>
                    <span class="ca-comm-date">${formatDateTime(comm.created_at)}</span>
                </div>
                <div class="ca-comm-subject">${comm.subject || 'Sin asunto'}</div>
                <div class="ca-comm-preview">${comm.message || comm.content || ''}</div>
                ${comm.requires_response && isFromAponnt ? `
                    <div class="ca-comm-actions">
                        <button class="ca-btn ca-btn-primary ca-btn-sm" onclick="event.stopPropagation(); CompanyAccountEngine.replyToCommunication(${comm.id})">
                            ↩️ Responder
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    },

    attachEventListeners() {
        // Tab switching
        document.querySelectorAll('.ca-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchTab(tab.dataset.tab);
            });
        });
    },

    switchTab(tabId) {
        AccountState.currentTab = tabId;

        // Update tab buttons
        document.querySelectorAll('.ca-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabId);
        });

        // Update panels
        document.querySelectorAll('.ca-tab-panel').forEach(panel => {
            panel.classList.toggle('active', panel.id === `panel-${tabId}`);
        });
    },

    async sendMessage() {
        const recipient = document.getElementById('comm-recipient').value;
        const subject = document.getElementById('comm-subject').value.trim();
        const message = document.getElementById('comm-message').value.trim();

        if (!subject || !message) {
            alert('Por favor complete todos los campos');
            return;
        }

        const result = await AccountAPI.sendCommunication({
            recipient,
            subject,
            message
        });

        if (result.success) {
            alert('Mensaje enviado correctamente');
            document.getElementById('comm-subject').value = '';
            document.getElementById('comm-message').value = '';
            await this.loadData();
            this.render();
        } else {
            alert('Error al enviar mensaje: ' + (result.error || 'Error desconocido'));
        }
    },

    async viewCommunication(commId) {
        const comm = AccountState.communications.find(c => c.id === commId);
        if (!comm) return;

        // Mark as read
        if (!comm.read_at) {
            await AccountAPI.markCommunicationRead(commId);
            comm.read_at = new Date().toISOString();
            this.calculateStats();
        }

        this.showModal('Comunicacion', `
            <div class="ca-doc-detail">
                <div class="ca-doc-field">
                    <div class="ca-doc-field-label">De</div>
                    <div class="ca-doc-field-value">${comm.from_name || (comm.from_aponnt ? 'APONNT' : 'Mi Empresa')}</div>
                </div>
                <div class="ca-doc-field">
                    <div class="ca-doc-field-label">Fecha</div>
                    <div class="ca-doc-field-value">${formatDateTime(comm.created_at)}</div>
                </div>
            </div>
            <div class="ca-doc-field" style="margin-bottom: 16px;">
                <div class="ca-doc-field-label">Asunto</div>
                <div class="ca-doc-field-value">${comm.subject || 'Sin asunto'}</div>
            </div>
            <div style="background: var(--ca-bg-secondary); padding: 16px; border-radius: 8px; line-height: 1.6;">
                ${(comm.message || comm.content || '').replace(/\n/g, '<br>')}
            </div>
        `, comm.from_aponnt ? [
            { label: '↩️ Responder', action: () => this.replyToCommunication(commId), primary: true }
        ] : []);
    },

    replyToCommunication(commId) {
        this.closeModal();
        this.switchTab('communications');

        const comm = AccountState.communications.find(c => c.id === commId);
        if (comm) {
            document.getElementById('comm-subject').value = `Re: ${comm.subject || ''}`;
            document.getElementById('comm-message').focus();
        }
    },

    async viewQuote(quoteId) {
        const quote = AccountState.quotes.find(q => q.id === quoteId);
        if (!quote) return;

        this.showModal('Presupuesto ' + (quote.quote_number || quote.id), `
            <div class="ca-doc-detail">
                <div class="ca-doc-field">
                    <div class="ca-doc-field-label">Numero</div>
                    <div class="ca-doc-field-value">${quote.quote_number || quote.id}</div>
                </div>
                <div class="ca-doc-field">
                    <div class="ca-doc-field-label">Fecha</div>
                    <div class="ca-doc-field-value">${formatDate(quote.created_at)}</div>
                </div>
                <div class="ca-doc-field">
                    <div class="ca-doc-field-label">Valido Hasta</div>
                    <div class="ca-doc-field-value">${formatDate(quote.valid_until)}</div>
                </div>
                <div class="ca-doc-field">
                    <div class="ca-doc-field-label">Estado</div>
                    <div class="ca-doc-field-value">
                        <span class="ca-status ca-status-${getStatusClass(quote.status)}">${quote.status}</span>
                    </div>
                </div>
            </div>
            <div class="ca-doc-field" style="margin-bottom: 16px;">
                <div class="ca-doc-field-label">Descripcion</div>
                <div class="ca-doc-field-value">${quote.description || quote.title || '-'}</div>
            </div>
            <div style="background: linear-gradient(135deg, var(--ca-accent-purple), var(--ca-accent-blue)); padding: 20px; border-radius: 12px; text-align: center;">
                <div style="font-size: 12px; opacity: 0.8; margin-bottom: 4px;">TOTAL</div>
                <div class="ca-amount large" style="color: white;">${formatCurrency(quote.total)}</div>
            </div>
        `, [
            { label: '📥 Descargar PDF', action: () => this.downloadDocument('quotes', quoteId) }
        ]);
    },

    async viewContract(contractId) {
        const contract = AccountState.contracts.find(c => c.id === contractId);
        if (!contract) return;

        this.showModal('Contrato', `
            <div class="ca-doc-detail">
                <div class="ca-doc-field">
                    <div class="ca-doc-field-label">Tipo</div>
                    <div class="ca-doc-field-value">${contract.type || contract.title || 'Contrato de Servicio'}</div>
                </div>
                <div class="ca-doc-field">
                    <div class="ca-doc-field-label">Estado</div>
                    <div class="ca-doc-field-value">
                        <span class="ca-status ca-status-${getStatusClass(contract.status)}">${contract.status}</span>
                    </div>
                </div>
                <div class="ca-doc-field">
                    <div class="ca-doc-field-label">Fecha Firma</div>
                    <div class="ca-doc-field-value">${formatDate(contract.signed_at || contract.created_at)}</div>
                </div>
                <div class="ca-doc-field">
                    <div class="ca-doc-field-label">Vigencia</div>
                    <div class="ca-doc-field-value">${formatDate(contract.start_date)} - ${formatDate(contract.end_date) || 'Indefinido'}</div>
                </div>
            </div>
            ${contract.signed_by ? `
                <div class="ca-doc-field" style="margin-top: 16px;">
                    <div class="ca-doc-field-label">Firmado por</div>
                    <div class="ca-doc-field-value">${contract.signed_by}</div>
                </div>
            ` : ''}
        `, [
            { label: '📥 Descargar PDF', action: () => this.downloadDocument('contracts', contractId) }
        ]);
    },

    async viewInvoice(invoiceId) {
        const invoice = AccountState.invoices.find(i => i.id === invoiceId);
        if (!invoice) return;

        const daysUntil = getDaysUntil(invoice.due_date);
        const isOverdue = daysUntil !== null && daysUntil < 0;
        const isPaid = ['paid', 'pagado', 'pagada'].includes((invoice.status || '').toLowerCase());

        this.showModal('Factura ' + (invoice.invoice_number || invoice.id), `
            <div class="ca-doc-detail">
                <div class="ca-doc-field">
                    <div class="ca-doc-field-label">Numero</div>
                    <div class="ca-doc-field-value">${invoice.invoice_number || invoice.id}</div>
                </div>
                <div class="ca-doc-field">
                    <div class="ca-doc-field-label">Estado</div>
                    <div class="ca-doc-field-value">
                        <span class="ca-status ca-status-${isPaid ? 'paid' : (isOverdue ? 'overdue' : getStatusClass(invoice.status))}">
                            ${isPaid ? 'Pagada' : (isOverdue ? 'Vencida' : invoice.status)}
                        </span>
                    </div>
                </div>
                <div class="ca-doc-field">
                    <div class="ca-doc-field-label">Fecha Emision</div>
                    <div class="ca-doc-field-value">${formatDate(invoice.created_at)}</div>
                </div>
                <div class="ca-doc-field">
                    <div class="ca-doc-field-label">Vencimiento</div>
                    <div class="ca-doc-field-value">${formatDate(invoice.due_date)}</div>
                </div>
            </div>
            <div class="ca-doc-field" style="margin-bottom: 16px;">
                <div class="ca-doc-field-label">Concepto</div>
                <div class="ca-doc-field-value">${invoice.description || invoice.concept || '-'}</div>
            </div>
            <div style="background: ${isPaid ? 'var(--ca-accent-green)' : (isOverdue ? 'var(--ca-accent-red)' : 'linear-gradient(135deg, var(--ca-accent-purple), var(--ca-accent-blue))')}; padding: 20px; border-radius: 12px; text-align: center;">
                <div style="font-size: 12px; opacity: 0.8; margin-bottom: 4px; color: ${isPaid || isOverdue ? 'rgba(0,0,0,0.7)' : 'white'};">TOTAL</div>
                <div class="ca-amount large" style="color: ${isPaid || isOverdue ? 'rgba(0,0,0,0.9)' : 'white'};">${formatCurrency(invoice.total)}</div>
            </div>
            ${invoice.paid_at ? `
                <div class="ca-doc-field" style="margin-top: 16px;">
                    <div class="ca-doc-field-label">Fecha de Pago</div>
                    <div class="ca-doc-field-value">${formatDate(invoice.paid_at)}</div>
                </div>
            ` : ''}
        `, [
            { label: '📥 Descargar PDF', action: () => this.downloadDocument('invoices', invoiceId) }
        ]);
    },

    async downloadDocument(type, id) {
        const result = await AccountAPI.downloadDocument(type, id);
        if (!result.success) {
            alert('Error al descargar documento: ' + (result.error || 'Error desconocido'));
        }
    },

    showModal(title, content, buttons = []) {
        const existing = document.querySelector('.ca-modal-overlay');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.className = 'ca-modal-overlay';
        modal.innerHTML = `
            <div class="ca-modal">
                <div class="ca-modal-header">
                    <h3 class="ca-modal-title">${title}</h3>
                    <button class="ca-modal-close" onclick="CompanyAccountEngine.closeModal()">&times;</button>
                </div>
                <div class="ca-modal-body">
                    ${content}
                </div>
                <div class="ca-modal-footer">
                    <button class="ca-btn ca-btn-secondary" onclick="CompanyAccountEngine.closeModal()">Cerrar</button>
                    ${buttons.map(btn => `
                        <button class="ca-btn ${btn.primary ? 'ca-btn-primary' : 'ca-btn-secondary'}" onclick="${btn.action.toString()}(); CompanyAccountEngine.closeModal();">
                            ${btn.label}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;

        // Handle button actions properly
        buttons.forEach((btn, idx) => {
            const buttonEl = modal.querySelectorAll('.ca-modal-footer .ca-btn')[idx + 1];
            if (buttonEl) {
                buttonEl.onclick = () => {
                    btn.action();
                };
            }
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeModal();
        });

        document.body.appendChild(modal);
    },

    closeModal() {
        const modal = document.querySelector('.ca-modal-overlay');
        if (modal) modal.remove();
    }
};

// ============================================================================
// EXPORTS & INITIALIZATION
// ============================================================================
window.CompanyAccountEngine = CompanyAccountEngine;

// Funcion de inicializacion para el dynamic loader
async function initCompanyAccount() {
    console.log('[COMPANY-ACCOUNT] initCompanyAccount() called');
    try {
        await CompanyAccountEngine.init();
    } catch (error) {
        console.error('[COMPANY-ACCOUNT] Init failed:', error);
    }
}

// Registrar en window.Modules
window.Modules = window.Modules || {};
window.Modules['company-account'] = {
    init: initCompanyAccount,
    showContent: initCompanyAccount
};

// Aliases para compatibilidad
window.initCompanyAccount = initCompanyAccount;
window.showCompanyAccountContent = initCompanyAccount;
window.showCompanyaccountContent = initCompanyAccount;

// Exportar funcion para uso legacy (terms-conditions)
window.initTermsConditions = initCompanyAccount;
window.showTermsConditionsContent = initCompanyAccount;
window.showTermsconditionsContent = initCompanyAccount;
window.Modules['terms-conditions'] = {
    init: initCompanyAccount,
    showContent: initCompanyAccount
};

console.log('[COMPANY-ACCOUNT] Module loaded successfully');

})();
