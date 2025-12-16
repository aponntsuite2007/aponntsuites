/**
 * DMS DASHBOARD - Document Management System
 * FUENTE ÚNICA DE VERDAD DOCUMENTAL
 *
 * Módulo CORE - Todas las empresas lo tienen
 *
 * Roles y permisos:
 * - admin: Acceso completo, validación, configuración
 * - hr/supervisor: Ver todos los documentos, validar, solicitar
 * - employee: Solo sus documentos, subir cuando se le solicita
 *
 * @version 2.0.0
 * @author Sistema Biométrico
 */

(function() {
  'use strict';

  // ============================================================
  // CONFIGURACIÓN Y ESTADO
  // ============================================================

  const MODULE_KEY = 'dms-dashboard';
  const API_BASE = '/api/dms';

  const state = {
    currentView: 'explorer',
    currentFolder: null,
    currentPath: [],
    documents: [],
    folders: [],
    pendingValidation: [],
    myRequests: [],
    expiringDocuments: [],
    selectedItems: [],
    filters: {
      category: 'all',
      status: 'all',
      dateFrom: null,
      dateTo: null,
      search: ''
    },
    user: null,
    permissions: {
      canValidate: false,
      canRequest: false,
      canUpload: false,
      canDelete: false,
      canManageFolders: false
    },
    stats: {
      totalDocuments: 0,
      pendingValidation: 0,
      pendingRequests: 0,
      expiringSoon: 0
    }
  };

  // Estados de documentos con emojis
  const DOCUMENT_STATUS = {
    'draft': { emoji: '📝', label: 'Borrador', color: '#95a5a6' },
    'pending_upload': { emoji: '⏳', label: 'Pendiente Subida', color: '#f39c12' },
    'pending_review': { emoji: '🔍', label: 'Pendiente Validación', color: '#9b59b6' },
    'approved': { emoji: '✅', label: 'Aprobado', color: '#27ae60' },
    'active': { emoji: '📄', label: 'Activo', color: '#3498db' },
    'rejected': { emoji: '❌', label: 'Rechazado', color: '#e74c3c' },
    'expired': { emoji: '⚠️', label: 'Vencido', color: '#e67e22' },
    'archived': { emoji: '📦', label: 'Archivado', color: '#7f8c8d' },
    'deleted': { emoji: '🗑️', label: 'Eliminado', color: '#c0392b' }
  };

  // Categorías con emojis
  const CATEGORIES = {
    'RRHH': { emoji: '👥', label: 'Recursos Humanos', color: '#3498db' },
    'LEGAL': { emoji: '⚖️', label: 'Legal', color: '#e74c3c' },
    'MEDICAL': { emoji: '🏥', label: 'Médico', color: '#27ae60' },
    'TRAINING': { emoji: '🎓', label: 'Capacitación', color: '#9b59b6' },
    'FINANCIERO': { emoji: '💰', label: 'Financiero', color: '#f39c12' },
    'OPERACIONES': { emoji: '⚙️', label: 'Operaciones', color: '#1abc9c' },
    'COMUNICACIONES': { emoji: '📢', label: 'Comunicaciones', color: '#e91e63' },
    'GENERAL': { emoji: '📁', label: 'General', color: '#607d8b' }
  };

  // Tipos de archivo con emojis
  const FILE_TYPES = {
    'pdf': { emoji: '📕', color: '#e74c3c' },
    'doc': { emoji: '📘', color: '#3498db' },
    'docx': { emoji: '📘', color: '#3498db' },
    'xls': { emoji: '📗', color: '#27ae60' },
    'xlsx': { emoji: '📗', color: '#27ae60' },
    'jpg': { emoji: '🖼️', color: '#9b59b6' },
    'jpeg': { emoji: '🖼️', color: '#9b59b6' },
    'png': { emoji: '🖼️', color: '#9b59b6' },
    'zip': { emoji: '📦', color: '#f39c12' },
    'default': { emoji: '📄', color: '#95a5a6' }
  };

  // ============================================================
  // ESTILOS CSS
  // ============================================================

  const styles = `
    /* ========== CONTENEDOR PRINCIPAL ========== */
    .dms-dashboard {
      min-height: 100vh;
      background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
      color: #e0e0e0;
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      padding: 20px;
    }

    /* ========== HEADER ========== */
    .dms-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 25px;
      padding: 20px 25px;
      background: rgba(15, 15, 30, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
    }

    .dms-header-left {
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .dms-header-icon {
      font-size: 2.5rem;
      background: linear-gradient(135deg, #3498db, #2980b9);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .dms-header-title {
      font-size: 1.8rem;
      font-weight: 700;
      background: linear-gradient(135deg, #ffffff, #a0a0a0);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .dms-header-subtitle {
      font-size: 0.9rem;
      color: rgba(255, 255, 255, 0.6);
    }

    .dms-header-actions {
      display: flex;
      gap: 10px;
    }

    /* ========== STATS CARDS ========== */
    .dms-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-bottom: 25px;
    }

    .dms-stat-card {
      background: rgba(20, 20, 40, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 15px;
      transition: all 0.3s ease;
      cursor: pointer;
    }

    .dms-stat-card:hover {
      transform: translateY(-3px);
      border-color: rgba(52, 152, 219, 0.5);
      box-shadow: 0 10px 30px rgba(52, 152, 219, 0.2);
    }

    .dms-stat-icon {
      font-size: 2.5rem;
      width: 60px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      background: rgba(52, 152, 219, 0.2);
    }

    .dms-stat-info h3 {
      font-size: 1.8rem;
      font-weight: 700;
      margin: 0;
      color: #fff;
    }

    .dms-stat-info p {
      font-size: 0.85rem;
      color: rgba(255, 255, 255, 0.6);
      margin: 5px 0 0;
    }

    .dms-stat-card.pending .dms-stat-icon { background: rgba(155, 89, 182, 0.2); }
    .dms-stat-card.requests .dms-stat-icon { background: rgba(241, 196, 15, 0.2); }
    .dms-stat-card.expiring .dms-stat-icon { background: rgba(231, 76, 60, 0.2); }

    /* ========== TABS DE NAVEGACIÓN ========== */
    .dms-tabs {
      display: flex;
      gap: 5px;
      margin-bottom: 20px;
      background: rgba(15, 15, 30, 0.6);
      padding: 8px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      overflow-x: auto;
    }

    .dms-tab {
      padding: 12px 20px;
      border-radius: 8px;
      background: transparent;
      border: 1px solid transparent;
      color: rgba(255, 255, 255, 0.6);
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.3s ease;
      white-space: nowrap;
    }

    .dms-tab:hover {
      background: rgba(255, 255, 255, 0.05);
      color: #fff;
    }

    .dms-tab.active {
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
      color: #fff;
      border-color: transparent;
      box-shadow: 0 4px 15px rgba(52, 152, 219, 0.4);
    }

    .dms-tab-badge {
      background: rgba(231, 76, 60, 0.9);
      color: white;
      font-size: 0.7rem;
      padding: 2px 8px;
      border-radius: 10px;
      font-weight: 600;
    }

    /* ========== TOOLBAR ========== */
    .dms-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 15px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    .dms-breadcrumb {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(20, 20, 40, 0.6);
      padding: 10px 15px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .dms-breadcrumb-item {
      color: rgba(255, 255, 255, 0.6);
      cursor: pointer;
      transition: color 0.2s;
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .dms-breadcrumb-item:hover { color: #3498db; }
    .dms-breadcrumb-item.current { color: #fff; font-weight: 600; }
    .dms-breadcrumb-sep { color: rgba(255, 255, 255, 0.3); }

    .dms-search-box {
      flex: 1;
      max-width: 400px;
      position: relative;
    }

    .dms-search-box input {
      width: 100%;
      padding: 12px 15px 12px 45px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      color: #e0e0e0;
      font-size: 0.9rem;
      transition: all 0.3s ease;
    }

    .dms-search-box input:focus {
      outline: none;
      border-color: #3498db;
      background: rgba(255, 255, 255, 0.08);
    }

    .dms-search-box::before {
      content: '🔍';
      position: absolute;
      left: 15px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 1rem;
    }

    .dms-filters {
      display: flex;
      gap: 10px;
    }

    .dms-filter-select {
      padding: 10px 15px;
      background: #1a1a2e;
      border: 1px solid #3498db;
      border-radius: 8px;
      color: #ffffff;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      min-width: 150px;
    }

    .dms-filter-select option {
      background: #1a1a2e;
      color: #ffffff;
      padding: 10px;
    }

    .dms-filter-select:focus {
      outline: none;
      border-color: #2ecc71;
      box-shadow: 0 0 10px rgba(46, 204, 113, 0.3);
    }

    .dms-filter-select:hover {
      border-color: #2ecc71;
    }

    /* ========== EXPORT BUTTONS ========== */
    .dms-export-buttons {
      display: flex;
      gap: 8px;
      margin-left: auto;
    }

    .dms-export-btn {
      padding: 8px 12px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 5px;
      transition: all 0.2s;
    }

    .dms-export-btn.excel {
      background: linear-gradient(135deg, #27ae60, #229954);
      color: white;
    }

    .dms-export-btn.pdf {
      background: linear-gradient(135deg, #e74c3c, #c0392b);
      color: white;
    }

    .dms-export-btn.word {
      background: linear-gradient(135deg, #3498db, #2980b9);
      color: white;
    }

    .dms-export-btn.print {
      background: linear-gradient(135deg, #9b59b6, #8e44ad);
      color: white;
    }

    .dms-export-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    }

    /* ========== CONTEXTUAL HELP ========== */
    .dms-help-indicator {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      background: rgba(52, 152, 219, 0.2);
      border-radius: 50%;
      font-size: 11px;
      cursor: help;
      margin-left: 5px;
      color: #3498db;
    }

    .dms-help-indicator:hover {
      background: rgba(52, 152, 219, 0.4);
    }

    /* ========== EXPLORER VIEW ========== */
    .dms-explorer {
      background: rgba(15, 15, 30, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
    }

    .dms-explorer-header {
      display: grid;
      grid-template-columns: 40px 1fr 120px 100px 100px 120px 80px;
      gap: 15px;
      padding: 15px 20px;
      background: rgba(52, 152, 219, 0.1);
      border-bottom: 2px solid rgba(52, 152, 219, 0.3);
      font-weight: 600;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #fff;
    }

    .dms-explorer-body {
      max-height: 600px;
      overflow-y: auto;
    }

    .dms-explorer-body::-webkit-scrollbar {
      width: 8px;
    }

    .dms-explorer-body::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
    }

    .dms-explorer-body::-webkit-scrollbar-thumb {
      background: rgba(52, 152, 219, 0.5);
      border-radius: 4px;
    }

    .dms-item {
      display: grid;
      grid-template-columns: 40px 1fr 120px 100px 100px 120px 80px;
      gap: 15px;
      padding: 15px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      align-items: center;
      transition: all 0.2s ease;
      cursor: pointer;
    }

    .dms-item:hover {
      background: rgba(52, 152, 219, 0.08);
    }

    .dms-item.selected {
      background: rgba(52, 152, 219, 0.15);
      border-left: 3px solid #3498db;
    }

    .dms-item.folder {
      background: rgba(241, 196, 15, 0.05);
    }

    .dms-item.folder:hover {
      background: rgba(241, 196, 15, 0.1);
    }

    .dms-item-icon {
      font-size: 1.8rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .dms-item-name {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .dms-item-title {
      font-weight: 500;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .dms-item-meta {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.5);
    }

    .dms-item-category {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .dms-item-status {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .dms-item-size {
      font-size: 0.85rem;
      color: rgba(255, 255, 255, 0.6);
    }

    .dms-item-date {
      font-size: 0.85rem;
      color: rgba(255, 255, 255, 0.6);
    }

    .dms-item-actions {
      display: flex;
      gap: 5px;
    }

    .dms-action-btn {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      border: none;
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      font-size: 0.9rem;
    }

    .dms-action-btn:hover {
      background: rgba(52, 152, 219, 0.3);
      transform: scale(1.1);
    }

    .dms-action-btn.danger:hover {
      background: rgba(231, 76, 60, 0.3);
    }

    /* ========== EMPTY STATE ========== */
    .dms-empty {
      text-align: center;
      padding: 60px 20px;
      color: rgba(255, 255, 255, 0.5);
    }

    .dms-empty-icon {
      font-size: 4rem;
      margin-bottom: 20px;
      opacity: 0.5;
    }

    .dms-empty-title {
      font-size: 1.3rem;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.7);
      margin-bottom: 10px;
    }

    .dms-empty-text {
      font-size: 0.9rem;
    }

    /* ========== BOTONES ========== */
    .dms-btn {
      padding: 10px 20px;
      border-radius: 8px;
      border: none;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.3s ease;
    }

    .dms-btn-primary {
      background: linear-gradient(135deg, #3498db, #2980b9);
      color: white;
      box-shadow: 0 4px 15px rgba(52, 152, 219, 0.3);
    }

    .dms-btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(52, 152, 219, 0.4);
    }

    .dms-btn-success {
      background: linear-gradient(135deg, #27ae60, #219a52);
      color: white;
    }

    .dms-btn-warning {
      background: linear-gradient(135deg, #f39c12, #d68910);
      color: white;
    }

    .dms-btn-danger {
      background: linear-gradient(135deg, #e74c3c, #c0392b);
      color: white;
    }

    .dms-btn-secondary {
      background: rgba(255, 255, 255, 0.1);
      color: #e0e0e0;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .dms-btn-secondary:hover {
      background: rgba(255, 255, 255, 0.15);
    }

    /* ========== MODAL ========== */
    .dms-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.85);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s ease;
    }

    .dms-modal-overlay.active {
      opacity: 1;
      visibility: visible;
    }

    .dms-modal {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      max-width: 800px;
      width: 95%;
      max-height: 90vh;
      overflow: hidden;
      transform: scale(0.9);
      transition: transform 0.3s ease;
    }

    .dms-modal-overlay.active .dms-modal {
      transform: scale(1);
    }

    .dms-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 25px;
      background: linear-gradient(135deg, rgba(52, 152, 219, 0.2), rgba(41, 128, 185, 0.1));
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .dms-modal-title {
      font-size: 1.3rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .dms-modal-close {
      background: none;
      border: none;
      color: #fff;
      font-size: 1.5rem;
      cursor: pointer;
      opacity: 0.7;
      transition: opacity 0.2s;
    }

    .dms-modal-close:hover { opacity: 1; }

    .dms-modal-body {
      padding: 25px;
      max-height: 60vh;
      overflow-y: auto;
    }

    .dms-modal-footer {
      padding: 15px 25px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }

    /* ========== DOCUMENT DETAIL ========== */
    .dms-doc-detail {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    .dms-doc-preview {
      background: rgba(0, 0, 0, 0.3);
      border-radius: 12px;
      min-height: 300px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .dms-doc-preview-icon {
      font-size: 5rem;
      opacity: 0.5;
    }

    .dms-doc-info {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .dms-doc-field {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .dms-doc-field-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.5);
      letter-spacing: 0.5px;
    }

    .dms-doc-field-value {
      font-size: 0.95rem;
      color: #fff;
    }

    /* ========== VALIDATION PANEL ========== */
    .dms-validation-panel {
      background: rgba(155, 89, 182, 0.1);
      border: 1px solid rgba(155, 89, 182, 0.3);
      border-radius: 12px;
      padding: 20px;
      margin-top: 20px;
    }

    .dms-validation-title {
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .dms-validation-actions {
      display: flex;
      gap: 10px;
    }

    .dms-validation-textarea {
      width: 100%;
      min-height: 80px;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 12px;
      color: #e0e0e0;
      font-size: 0.9rem;
      margin-bottom: 15px;
      resize: vertical;
    }

    .dms-validation-textarea:focus {
      outline: none;
      border-color: #9b59b6;
    }

    /* ========== UPLOAD ZONE ========== */
    .dms-upload-zone {
      border: 2px dashed rgba(52, 152, 219, 0.5);
      border-radius: 12px;
      padding: 40px;
      text-align: center;
      background: rgba(52, 152, 219, 0.05);
      transition: all 0.3s ease;
      cursor: pointer;
    }

    .dms-upload-zone:hover,
    .dms-upload-zone.dragover {
      border-color: #3498db;
      background: rgba(52, 152, 219, 0.1);
    }

    .dms-upload-zone-icon {
      font-size: 3rem;
      margin-bottom: 15px;
    }

    .dms-upload-zone-text {
      font-size: 1rem;
      color: rgba(255, 255, 255, 0.7);
    }

    .dms-upload-zone-hint {
      font-size: 0.8rem;
      color: rgba(255, 255, 255, 0.5);
      margin-top: 10px;
    }

    /* ========== PENDING REQUESTS ========== */
    .dms-request-card {
      background: rgba(241, 196, 15, 0.1);
      border: 1px solid rgba(241, 196, 15, 0.3);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .dms-request-info h4 {
      margin: 0 0 5px;
      font-size: 1rem;
      color: #fff;
    }

    .dms-request-info p {
      margin: 0;
      font-size: 0.85rem;
      color: rgba(255, 255, 255, 0.6);
    }

    .dms-request-due {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.85rem;
    }

    .dms-request-due.urgent {
      color: #e74c3c;
    }

    .dms-request-due.warning {
      color: #f39c12;
    }

    .dms-request-due.normal {
      color: #27ae60;
    }

    /* ========== RESPONSIVE ========== */
    @media (max-width: 1200px) {
      .dms-explorer-header,
      .dms-item {
        grid-template-columns: 40px 1fr 100px 80px 100px;
      }
      .dms-explorer-header > *:nth-child(4),
      .dms-item > *:nth-child(4) {
        display: none;
      }
    }

    @media (max-width: 768px) {
      .dms-header {
        flex-direction: column;
        gap: 15px;
        text-align: center;
      }

      .dms-stats {
        grid-template-columns: repeat(2, 1fr);
      }

      .dms-toolbar {
        flex-direction: column;
      }

      .dms-search-box {
        max-width: 100%;
      }

      .dms-explorer-header,
      .dms-item {
        grid-template-columns: 40px 1fr 80px;
      }

      .dms-explorer-header > *:nth-child(n+4),
      .dms-item > *:nth-child(n+4) {
        display: none;
      }

      .dms-doc-detail {
        grid-template-columns: 1fr;
      }
    }

    /* ========== BADGES Y URGENCIAS ========== */
    .dms-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
      white-space: nowrap;
    }

    .dms-badge.urgent {
      background: rgba(231, 76, 60, 0.2) !important;
      color: #e74c3c !important;
      border: 1px solid rgba(231, 76, 60, 0.3);
    }

    .dms-badge.warning {
      background: rgba(241, 196, 15, 0.2) !important;
      color: #f1c40f !important;
      border: 1px solid rgba(241, 196, 15, 0.3);
    }

    .dms-badge.normal {
      background: rgba(39, 174, 96, 0.2) !important;
      color: #27ae60 !important;
      border: 1px solid rgba(39, 174, 96, 0.3);
    }

    .dms-item.urgent {
      border-left: 3px solid #e74c3c;
      background: rgba(231, 76, 60, 0.05);
    }

    .dms-item.warning {
      border-left: 3px solid #f1c40f;
      background: rgba(241, 196, 15, 0.05);
    }

    /* ========== ANIMACIONES ========== */
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .dms-item {
      animation: fadeIn 0.3s ease forwards;
    }

    .dms-item:nth-child(1) { animation-delay: 0.05s; }
    .dms-item:nth-child(2) { animation-delay: 0.1s; }
    .dms-item:nth-child(3) { animation-delay: 0.15s; }
    .dms-item:nth-child(4) { animation-delay: 0.2s; }
    .dms-item:nth-child(5) { animation-delay: 0.25s; }

    /* ========== LOADING ========== */
    .dms-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
    }

    .dms-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(52, 152, 219, 0.3);
      border-top-color: #3498db;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* ========== HELP BANNER ========== */
    .dms-help-banner {
      background: linear-gradient(135deg, rgba(52, 152, 219, 0.15), rgba(155, 89, 182, 0.15));
      border: 1px solid rgba(52, 152, 219, 0.3);
      border-radius: 12px;
      padding: 15px 20px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .dms-help-banner-icon {
      font-size: 2rem;
    }

    .dms-help-banner-content {
      flex: 1;
    }

    .dms-help-banner-title {
      font-weight: 600;
      margin-bottom: 3px;
    }

    .dms-help-banner-text {
      font-size: 0.85rem;
      color: rgba(255, 255, 255, 0.7);
    }

    .dms-help-banner-close {
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.5);
      cursor: pointer;
      font-size: 1.2rem;
    }
  `;

  // ============================================================
  // FUNCIONES DE UTILIDAD
  // ============================================================

  function getToken() {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  }

  function getCurrentUser() {
    try {
      const userData = localStorage.getItem('userData') || sessionStorage.getItem('userData');
      return userData ? JSON.parse(userData) : null;
    } catch (e) {
      return null;
    }
  }

  function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  function getFileTypeInfo(filename) {
    const ext = (filename || '').split('.').pop().toLowerCase();
    return FILE_TYPES[ext] || FILE_TYPES.default;
  }

  function getStatusInfo(status) {
    return DOCUMENT_STATUS[status] || { emoji: '❓', label: status, color: '#95a5a6' };
  }

  function getCategoryInfo(category) {
    return CATEGORIES[category] || CATEGORIES.GENERAL;
  }

  async function apiRequest(endpoint, options = {}) {
    const token = getToken();
    const defaultOptions = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...defaultOptions,
      ...options,
      headers: { ...defaultOptions.headers, ...options.headers }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Error de conexión' }));
      throw new Error(error.message || 'Error en la solicitud');
    }

    return response.json();
  }

  // ============================================================
  // PERMISOS
  // ============================================================

  function initPermissions() {
    const user = getCurrentUser();
    if (!user) return;

    state.user = user;
    const role = user.role || 'employee';

    // Definir permisos según rol
    state.permissions = {
      canValidate: ['admin', 'hr', 'supervisor'].includes(role),
      canRequest: ['admin', 'hr', 'supervisor'].includes(role),
      canUpload: true, // Todos pueden subir (cuando se les solicita)
      canDelete: ['admin'].includes(role),
      canManageFolders: ['admin', 'hr'].includes(role),
      canSeeAllDocuments: ['admin', 'hr', 'supervisor'].includes(role),
      canExport: ['admin', 'hr', 'supervisor'].includes(role)
    };

    // ═══════════════════════════════════════════════════════════════
    // MI ESPACIO: Forzar vista de empleado para admin/supervisor
    // Cuando viene de Mi Espacio, siempre mostrar solo MIS documentos
    // ═══════════════════════════════════════════════════════════════
    if (window.miEspacioSelfView) {
      state.permissions.canSeeAllDocuments = false;
      console.log('👤 [DMS] Mi Espacio detectado - Forzando vista personal');
    }

    // ═══════════════════════════════════════════════════════════════
    // VISTA INICIAL SEGÚN ROL
    // Empleados: Directamente a "Mis Documentos" (su carpeta privada)
    // Admin/HR/Supervisor: Explorador general
    // ═══════════════════════════════════════════════════════════════
    if (!state.permissions.canSeeAllDocuments) {
      state.currentView = 'my-docs';
      console.log('📄 [DMS] Empleado detectado - Vista inicial: Mis Documentos');
    } else {
      state.currentView = 'explorer';
      console.log('📂 [DMS] Admin/HR/Supervisor - Vista inicial: Explorador General');
    }
  }

  // ============================================================
  // API CALLS
  // ============================================================

  async function loadStats() {
    try {
      const data = await apiRequest('/integration/stats');
      if (data.success) {
        // Calcular totales
        let total = 0;
        let pending = 0;
        Object.values(data.data || {}).forEach(mod => {
          total += mod.total || 0;
          pending += (mod.byStatus?.pending_review || 0);
        });
        state.stats.totalDocuments = total;
        state.stats.pendingValidation = pending;
      }
    } catch (e) {
      console.error('[DMS] Error loading stats:', e);
    }
  }

  async function loadDocuments(folderId = null) {
    try {
      // ═══════════════════════════════════════════════════════════════
      // ENDPOINT SEGÚN ROL:
      // - Empleados: /employee/my-documents (solo SUS documentos)
      // - Admin/HR/Supervisor: /documents (TODOS los documentos)
      // ═══════════════════════════════════════════════════════════════
      let endpoint;

      if (state.permissions.canSeeAllDocuments) {
        // Admin/HR/Supervisor: Ver todos los documentos
        endpoint = folderId
          ? `/documents?folder_id=${folderId}`
          : '/documents';
        console.log('📂 [DMS] Admin/HR - Cargando todos los documentos');
      } else {
        // Empleado: Solo sus documentos
        endpoint = '/employee/my-documents';
        console.log('📄 [DMS] Empleado - Cargando MIS documentos');
      }

      const data = await apiRequest(endpoint);
      state.documents = data.data || [];
    } catch (e) {
      console.error('[DMS] Error loading documents:', e);
      state.documents = [];
    }
  }

  async function loadFolders(parentId = null) {
    try {
      const endpoint = parentId
        ? `/folders?parent_id=${parentId}`
        : '/folders';

      const data = await apiRequest(endpoint);
      state.folders = data.data || [];
    } catch (e) {
      console.error('[DMS] Error loading folders:', e);
      state.folders = [];
    }
  }

  async function loadPendingValidation() {
    try {
      const data = await apiRequest('/hr/pending-validation');
      state.pendingValidation = data.data || [];
      state.stats.pendingValidation = state.pendingValidation.length;
    } catch (e) {
      console.error('[DMS] Error loading pending validation:', e);
      state.pendingValidation = [];
    }
  }

  async function loadMyRequests() {
    try {
      const data = await apiRequest('/employee/pending');
      state.myRequests = data.data || [];
      state.stats.pendingRequests = state.myRequests.length;
    } catch (e) {
      console.error('[DMS] Error loading my requests:', e);
      state.myRequests = [];
    }
  }

  async function loadExpiringDocuments() {
    try {
      // ═══════════════════════════════════════════════════════════════
      // ENDPOINT SEGÚN ROL:
      // - Empleados: /employee/expiring (solo SUS documentos por vencer)
      // - Admin/HR/Supervisor: /expiring (TODOS los documentos por vencer)
      // ═══════════════════════════════════════════════════════════════
      let endpoint;

      if (state.permissions.canSeeAllDocuments) {
        // Admin/HR: Ver todos los documentos por vencer de la empresa
        endpoint = '/expiring?days=60';
        console.log('📅 [DMS] Admin/HR - Cargando TODOS los documentos por vencer');
      } else {
        // Empleado: Solo sus documentos por vencer
        endpoint = '/employee/expiring?days=60';
        console.log('📅 [DMS] Empleado - Cargando MIS documentos por vencer');
      }

      const data = await apiRequest(endpoint);
      state.expiringDocuments = data.data || [];
      state.stats.expiringSoon = state.expiringDocuments.length;
    } catch (e) {
      console.error('[DMS] Error loading expiring documents:', e);
      state.expiringDocuments = [];
    }
  }

  // ============================================================
  // RENDERIZADO
  // ============================================================

  function render() {
    const container = document.getElementById('dms-dashboard-container');
    if (!container) return;

    container.innerHTML = `
      <style>${styles}</style>
      <div class="dms-dashboard">
        ${renderHeader()}
        ${renderHelpBanner()}
        ${renderStats()}
        ${renderTabs()}
        ${renderToolbar()}
        ${renderContent()}
      </div>
      ${renderModal()}
    `;

    attachEventListeners();
  }

  function renderHeader() {
    return `
      <div class="dms-header">
        <div class="dms-header-left">
          <div class="dms-header-icon">📁</div>
          <div>
            <div class="dms-header-title">Gestión Documental</div>
            <div class="dms-header-subtitle">Centro de documentos empresariales</div>
          </div>
        </div>
        <div class="dms-header-actions">
          ${state.permissions.canManageFolders ? `
            <button class="dms-btn dms-btn-secondary" onclick="DMS.createFolder()">
              📂 Nueva Carpeta
            </button>
          ` : ''}
          ${state.permissions.canUpload ? `
            <button class="dms-btn dms-btn-primary" onclick="DMS.openUpload()">
              ⬆️ Subir Documento
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  function renderHelpBanner() {
    const tips = [
      { icon: '💡', title: 'Consejo', text: 'Usa el buscador para encontrar documentos rápidamente por nombre o contenido.' },
      { icon: '🔍', title: 'Filtros', text: 'Filtra por categoría o estado para organizar tu vista de documentos.' },
      { icon: '⚡', title: 'Acceso rápido', text: 'Haz doble clic en una carpeta para entrar, o en un documento para verlo.' }
    ];
    const tip = tips[Math.floor(Math.random() * tips.length)];

    return `
      <div class="dms-help-banner" id="dms-help-banner">
        <div class="dms-help-banner-icon">${tip.icon}</div>
        <div class="dms-help-banner-content">
          <div class="dms-help-banner-title">${tip.title}</div>
          <div class="dms-help-banner-text">${tip.text}</div>
        </div>
        <button class="dms-help-banner-close" onclick="document.getElementById('dms-help-banner').style.display='none'">✕</button>
      </div>
    `;
  }

  function renderStats() {
    return `
      <div class="dms-stats">
        <div class="dms-stat-card" onclick="DMS.switchTab('explorer')">
          <div class="dms-stat-icon">📄</div>
          <div class="dms-stat-info">
            <h3>${state.stats.totalDocuments}</h3>
            <p>Documentos Totales</p>
          </div>
        </div>
        ${state.permissions.canValidate ? `
          <div class="dms-stat-card pending" onclick="DMS.switchTab('validation')">
            <div class="dms-stat-icon">🔍</div>
            <div class="dms-stat-info">
              <h3>${state.stats.pendingValidation}</h3>
              <p>Pendientes Validación</p>
            </div>
          </div>
        ` : ''}
        <div class="dms-stat-card requests" onclick="DMS.switchTab('requests')">
          <div class="dms-stat-icon">📬</div>
          <div class="dms-stat-info">
            <h3>${state.stats.pendingRequests}</h3>
            <p>Mis Solicitudes</p>
          </div>
        </div>
        <div class="dms-stat-card expiring" onclick="DMS.switchTab('expiring')">
          <div class="dms-stat-icon">⚠️</div>
          <div class="dms-stat-info">
            <h3>${state.stats.expiringSoon}</h3>
            <p>Por Vencer</p>
          </div>
        </div>
      </div>
    `;
  }

  function renderTabs() {
    const tabs = [];

    // ═══════════════════════════════════════════════════════════════
    // EXPLORADOR GENERAL: Solo para admin/hr/supervisor
    // Los empleados NO deben ver documentos de otros
    // ═══════════════════════════════════════════════════════════════
    if (state.permissions.canSeeAllDocuments) {
      tabs.push({ id: 'explorer', icon: '📂', label: 'Explorador General' });
    }

    // MIS DOCUMENTOS: Para TODOS los usuarios
    // Cada empleado ve solo SUS documentos
    tabs.push({ id: 'my-docs', icon: '📄', label: 'Mis Documentos' });

    // VALIDACIÓN: Solo para quienes pueden validar (admin/hr/supervisor)
    if (state.permissions.canValidate) {
      tabs.push({
        id: 'validation',
        icon: '🔍',
        label: 'Validación',
        badge: state.stats.pendingValidation
      });
    }

    // SOLICITUDES: Para TODOS
    // Empleados: ven solicitudes que le hicieron (ej: "Sube tu DNI")
    // RRHH: ven solicitudes que ellos enviaron
    tabs.push({
      id: 'requests',
      icon: '📬',
      label: 'Mis Solicitudes',
      badge: state.stats.pendingRequests
    });

    // SOLICITAR DOCUMENTO: Solo admin/hr/supervisor
    if (state.permissions.canRequest) {
      tabs.push({ id: 'new-request', icon: '➕', label: 'Solicitar Documento' });
    }

    // POR VENCER: Para TODOS pero filtrado
    // Empleados: solo sus documentos por vencer
    // RRHH: todos los documentos por vencer
    tabs.push({ id: 'expiring', icon: '⚠️', label: 'Por Vencer' });

    return `
      <div class="dms-tabs">
        ${tabs.map(tab => `
          <button class="dms-tab ${state.currentView === tab.id ? 'active' : ''}"
                  onclick="DMS.switchTab('${tab.id}')">
            <span>${tab.icon}</span>
            <span>${tab.label}</span>
            ${tab.badge ? `<span class="dms-tab-badge">${tab.badge}</span>` : ''}
          </button>
        `).join('')}
      </div>
    `;
  }

  function renderToolbar() {
    return `
      <div class="dms-toolbar">
        <div class="dms-breadcrumb">
          <span class="dms-breadcrumb-item ${!state.currentFolder ? 'current' : ''}"
                onclick="DMS.navigateTo(null)">
            🏠 Inicio
          </span>
          ${state.currentPath.map((folder, i) => `
            <span class="dms-breadcrumb-sep">›</span>
            <span class="dms-breadcrumb-item ${i === state.currentPath.length - 1 ? 'current' : ''}"
                  onclick="DMS.navigateTo('${folder.id}')">
              📁 ${folder.name}
            </span>
          `).join('')}
        </div>

        <div class="dms-search-box">
          <input type="text"
                 placeholder="Buscar documentos..."
                 value="${state.filters.search}"
                 oninput="DMS.updateFilter('search', this.value)" />
        </div>

        <div class="dms-filters">
          <select class="dms-filter-select" onchange="DMS.updateFilter('category', this.value)">
            <option value="all">📋 Todas las categorías</option>
            ${Object.entries(CATEGORIES).map(([code, info]) => `
              <option value="${code}" ${state.filters.category === code ? 'selected' : ''}>
                ${info.emoji} ${info.label}
              </option>
            `).join('')}
          </select>

          <select class="dms-filter-select" onchange="DMS.updateFilter('status', this.value)" data-help="filter-status">
            <option value="all">📊 Todos los estados</option>
            ${Object.entries(DOCUMENT_STATUS).map(([code, info]) => `
              <option value="${code}" ${state.filters.status === code ? 'selected' : ''}>
                ${info.emoji} ${info.label}
              </option>
            `).join('')}
          </select>
        </div>

        <!-- Botones de Exportación (solo para roles con permiso) -->
        ${state.permissions.canExport ? `
        <div class="dms-export-buttons">
          <button class="dms-export-btn excel" onclick="DMS.exportToExcel()" title="Exportar a Excel" data-help="export-excel">
            📊 Excel
          </button>
          <button class="dms-export-btn pdf" onclick="DMS.exportToPDF()" title="Exportar a PDF" data-help="export-pdf">
            📕 PDF
          </button>
          <button class="dms-export-btn word" onclick="DMS.exportToWord()" title="Exportar a Word" data-help="export-word">
            📘 Word
          </button>
          <button class="dms-export-btn print" onclick="DMS.printDocuments()" title="Imprimir" data-help="print">
            🖨️ Imprimir
          </button>
        </div>
        ` : `
        <!-- Empleado: Botón para descargar sus propios documentos -->
        <div class="dms-export-buttons">
          <button class="dms-export-btn pdf" onclick="DMS.exportToPDF()" title="Descargar mis documentos en PDF">
            📥 Descargar PDF
          </button>
        </div>
        `}

        <!-- Ayuda Contextual -->
        <button class="dms-export-btn" style="background: rgba(52, 152, 219, 0.2); color: #3498db;"
                onclick="DMS.showHelp()" title="Ayuda del módulo" data-help="module-help">
          ❓ Ayuda
        </button>
      </div>
    `;
  }

  function renderContent() {
    switch (state.currentView) {
      case 'explorer':
      case 'my-docs':
        return renderExplorer();
      case 'validation':
        return renderValidationQueue();
      case 'requests':
        return renderMyRequests();
      case 'new-request':
        return renderNewRequest();
      case 'expiring':
        return renderExpiring();
      default:
        return renderExplorer();
    }
  }

  function renderExplorer() {
    const items = [...state.folders, ...state.documents];
    const filteredItems = filterItems(items);

    if (filteredItems.length === 0) {
      return `
        <div class="dms-explorer">
          <div class="dms-empty">
            <div class="dms-empty-icon">📭</div>
            <div class="dms-empty-title">No hay documentos</div>
            <div class="dms-empty-text">
              ${state.filters.search || state.filters.category !== 'all' || state.filters.status !== 'all'
                ? 'No se encontraron documentos con los filtros aplicados'
                : 'Esta carpeta está vacía. Sube documentos o crea carpetas para organizar.'}
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="dms-explorer">
        <div class="dms-explorer-header">
          <div></div>
          <div>Nombre</div>
          <div>Categoría</div>
          <div>Estado</div>
          <div>Tamaño</div>
          <div>Fecha</div>
          <div>Acciones</div>
        </div>
        <div class="dms-explorer-body">
          ${filteredItems.map(item => renderExplorerItem(item)).join('')}
        </div>
      </div>
    `;
  }

  function renderExplorerItem(item) {
    const isFolder = item.slug !== undefined || item.path?.startsWith('/');

    if (isFolder) {
      return `
        <div class="dms-item folder" ondblclick="DMS.openFolder('${item.id}')">
          <div class="dms-item-icon">📂</div>
          <div class="dms-item-name">
            <div class="dms-item-title">${item.name}</div>
            <div class="dms-item-meta">${item.document_count || 0} documentos</div>
          </div>
          <div>-</div>
          <div>-</div>
          <div>-</div>
          <div class="dms-item-date">${formatDate(item.created_at)}</div>
          <div class="dms-item-actions">
            <button class="dms-action-btn" onclick="event.stopPropagation(); DMS.openFolder('${item.id}')" title="Abrir">
              📂
            </button>
          </div>
        </div>
      `;
    }

    const fileType = getFileTypeInfo(item.file_name || item.original_filename);
    const status = getStatusInfo(item.status);
    const category = getCategoryInfo(item.category_code);

    return `
      <div class="dms-item ${state.selectedItems.includes(item.id) ? 'selected' : ''}"
           onclick="DMS.selectItem('${item.id}')"
           ondblclick="DMS.openDocument('${item.id}')">
        <div class="dms-item-icon">${fileType.emoji}</div>
        <div class="dms-item-name">
          <div class="dms-item-title">
            ${item.title || item.file_name}
            ${item.version > 1 ? `<span style="opacity:0.5; font-size:0.75rem">v${item.version}</span>` : ''}
          </div>
          <div class="dms-item-meta">${item.type_code || 'Documento'}</div>
        </div>
        <div>
          <span class="dms-item-category" style="background: ${category.color}22; color: ${category.color}">
            ${category.emoji} ${category.label}
          </span>
        </div>
        <div>
          <span class="dms-item-status" style="background: ${status.color}22; color: ${status.color}">
            ${status.emoji} ${status.label}
          </span>
        </div>
        <div class="dms-item-size">${formatFileSize(item.file_size_bytes || item.file_size)}</div>
        <div class="dms-item-date">${formatDate(item.created_at)}</div>
        <div class="dms-item-actions">
          <button class="dms-action-btn" onclick="event.stopPropagation(); DMS.downloadDocument('${item.id}')" title="Descargar">
            ⬇️
          </button>
          <button class="dms-action-btn" onclick="event.stopPropagation(); DMS.openDocument('${item.id}')" title="Ver detalle">
            👁️
          </button>
          ${state.permissions.canDelete ? `
            <button class="dms-action-btn danger" onclick="event.stopPropagation(); DMS.deleteDocument('${item.id}')" title="Eliminar">
              🗑️
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  function renderValidationQueue() {
    if (state.pendingValidation.length === 0) {
      return `
        <div class="dms-explorer">
          <div class="dms-empty">
            <div class="dms-empty-icon">✅</div>
            <div class="dms-empty-title">Sin documentos pendientes</div>
            <div class="dms-empty-text">No hay documentos esperando validación</div>
          </div>
        </div>
      `;
    }

    return `
      <div class="dms-explorer">
        <div class="dms-explorer-header">
          <div></div>
          <div>Documento</div>
          <div>Empleado</div>
          <div>Tipo</div>
          <div>Fecha Subida</div>
          <div>Vencimiento</div>
          <div>Acciones</div>
        </div>
        <div class="dms-explorer-body">
          ${state.pendingValidation.map(doc => `
            <div class="dms-item" ondblclick="DMS.openValidation('${doc.id}')">
              <div class="dms-item-icon">🔍</div>
              <div class="dms-item-name">
                <div class="dms-item-title">${doc.custom_title || doc.type_code}</div>
                <div class="dms-item-meta">Solicitud #${doc.id}</div>
              </div>
              <div>${doc.requested_from_name || 'Empleado'}</div>
              <div>
                <span class="dms-item-category" style="background: rgba(155,89,182,0.2); color: #9b59b6">
                  📋 ${doc.type_code}
                </span>
              </div>
              <div class="dms-item-date">${formatDate(doc.uploaded_at || doc.updated_at)}</div>
              <div class="dms-item-date ${getDueClass(doc.due_date)}">${formatDate(doc.due_date)}</div>
              <div class="dms-item-actions">
                <button class="dms-action-btn" style="background: rgba(39,174,96,0.3)"
                        onclick="event.stopPropagation(); DMS.quickApprove('${doc.id}')" title="Aprobar">
                  ✅
                </button>
                <button class="dms-action-btn" style="background: rgba(231,76,60,0.3)"
                        onclick="event.stopPropagation(); DMS.quickReject('${doc.id}')" title="Rechazar">
                  ❌
                </button>
                <button class="dms-action-btn"
                        onclick="event.stopPropagation(); DMS.openValidation('${doc.id}')" title="Ver detalle">
                  👁️
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderMyRequests() {
    if (state.myRequests.length === 0) {
      return `
        <div class="dms-explorer">
          <div class="dms-empty">
            <div class="dms-empty-icon">📭</div>
            <div class="dms-empty-title">Sin solicitudes pendientes</div>
            <div class="dms-empty-text">No tienes documentos pendientes de subir</div>
          </div>
        </div>
      `;
    }

    return `
      <div style="padding: 20px;">
        ${state.myRequests.map(req => `
          <div class="dms-request-card">
            <div class="dms-request-info">
              <h4>${req.custom_title || req.type_code}</h4>
              <p>${req.description || 'Se requiere que subas este documento'}</p>
              <p style="margin-top: 8px; font-size: 0.8rem; color: rgba(255,255,255,0.5)">
                Solicitado por: ${req.requested_by_name || 'RRHH'}
              </p>
            </div>
            <div style="display: flex; align-items: center; gap: 20px;">
              <div class="dms-request-due ${getDueClass(req.due_date)}">
                ⏰ Vence: ${formatDate(req.due_date)}
              </div>
              <button class="dms-btn dms-btn-primary" onclick="DMS.uploadForRequest('${req.id}')">
                ⬆️ Subir Documento
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderNewRequest() {
    return `
      <div style="padding: 20px; max-width: 600px; margin: 0 auto;">
        <div style="background: rgba(15,15,30,0.9); border-radius: 16px; padding: 30px; border: 1px solid rgba(255,255,255,0.1);">
          <h3 style="margin-top: 0; display: flex; align-items: center; gap: 10px;">
            ➕ Solicitar Documento a Empleado
          </h3>

          <div class="dms-doc-field" style="margin-bottom: 20px;">
            <label class="dms-doc-field-label">Empleado</label>
            <select class="dms-filter-select" style="width: 100%;" id="request-employee">
              <option value="">Seleccionar empleado...</option>
            </select>
          </div>

          <div class="dms-doc-field" style="margin-bottom: 20px;">
            <label class="dms-doc-field-label">Tipo de Documento</label>
            <select class="dms-filter-select" style="width: 100%;" id="request-type">
              <option value="">Seleccionar tipo...</option>
              <option value="MEDICAL_CERTIFICATE">🏥 Certificado Médico</option>
              <option value="SANCTION_DESCARGO">⚖️ Descargo de Sanción</option>
              <option value="LEGAL_ACKNOWLEDGMENT">📝 Acuse de Recibo</option>
              <option value="CONSENT_BIOMETRIC">🔐 Consentimiento Biométrico</option>
              <option value="TRAINING_CERTIFICATE">🎓 Certificado de Capacitación</option>
              <option value="CONTRACT_NDA">📋 Acuerdo de Confidencialidad</option>
            </select>
          </div>

          <div class="dms-doc-field" style="margin-bottom: 20px;">
            <label class="dms-doc-field-label">Descripción</label>
            <textarea class="dms-validation-textarea" id="request-description"
                      placeholder="Describe qué documento necesitas y por qué..."></textarea>
          </div>

          <div class="dms-doc-field" style="margin-bottom: 20px;">
            <label class="dms-doc-field-label">Fecha Límite</label>
            <input type="date" class="dms-filter-select" style="width: 100%;" id="request-due-date" />
          </div>

          <div class="dms-doc-field" style="margin-bottom: 20px;">
            <label class="dms-doc-field-label">Prioridad</label>
            <select class="dms-filter-select" style="width: 100%;" id="request-priority">
              <option value="low">🟢 Baja</option>
              <option value="medium" selected>🟡 Media</option>
              <option value="high">🔴 Alta</option>
            </select>
          </div>

          <button class="dms-btn dms-btn-primary" style="width: 100%;" onclick="DMS.submitRequest()">
            📬 Enviar Solicitud
          </button>
        </div>
      </div>
    `;
  }

  function renderExpiring() {
    if (state.expiringDocuments.length === 0) {
      return `
        <div class="dms-explorer">
          <div class="dms-empty">
            <div class="dms-empty-icon">✅</div>
            <div class="dms-empty-title">Sin documentos por vencer</div>
            <div class="dms-empty-text">No hay documentos próximos a vencer en los próximos 60 días</div>
          </div>
        </div>
      `;
    }

    return `
      <div class="dms-explorer">
        <div class="dms-explorer-header">
          <div></div>
          <div>Documento</div>
          <div>Categoría</div>
          <div>Vencimiento</div>
          <div>Días restantes</div>
          <div>Acciones</div>
        </div>
        <div class="dms-explorer-body">
          ${state.expiringDocuments.map(doc => renderExpiringItem(doc)).join('')}
        </div>
      </div>
    `;
  }

  function renderExpiringItem(doc) {
    const fileType = getFileTypeInfo(doc.file_name || doc.original_filename);
    const category = getCategoryInfo(doc.category_code);
    const expirationDate = new Date(doc.expiration_date);
    const today = new Date();
    const daysRemaining = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));

    let urgencyClass = 'normal';
    let urgencyIcon = '🟢';
    if (daysRemaining <= 7) {
      urgencyClass = 'urgent';
      urgencyIcon = '🔴';
    } else if (daysRemaining <= 30) {
      urgencyClass = 'warning';
      urgencyIcon = '🟡';
    }

    return `
      <div class="dms-item ${urgencyClass}" ondblclick="DMS.openDocument('${doc.id}')">
        <div class="dms-item-icon">${fileType.emoji}</div>
        <div class="dms-item-name">
          <div class="dms-item-title">${doc.title || doc.file_name}</div>
          <div class="dms-item-meta">${doc.type_code || 'Documento'}</div>
        </div>
        <div>
          <span class="dms-badge" style="background: ${category.color}20; color: ${category.color};">
            ${category.emoji} ${category.label}
          </span>
        </div>
        <div style="font-weight: 500;">
          ${formatDate(doc.expiration_date)}
        </div>
        <div>
          <span class="dms-badge ${urgencyClass}" style="font-weight: bold;">
            ${urgencyIcon} ${daysRemaining} días
          </span>
        </div>
        <div class="dms-item-actions">
          <button class="dms-action-btn" onclick="event.stopPropagation(); DMS.openDocument('${doc.id}')" title="Ver documento">
            👁️
          </button>
          <button class="dms-action-btn" onclick="event.stopPropagation(); DMS.downloadDocument('${doc.id}')" title="Descargar">
            ⬇️
          </button>
        </div>
      </div>
    `;
  }

  function renderModal() {
    return `
      <div class="dms-modal-overlay" id="dms-modal">
        <div class="dms-modal">
          <div class="dms-modal-header">
            <div class="dms-modal-title" id="dms-modal-title">Título</div>
            <button class="dms-modal-close" onclick="DMS.closeModal()">✕</button>
          </div>
          <div class="dms-modal-body" id="dms-modal-body">
            Contenido...
          </div>
          <div class="dms-modal-footer" id="dms-modal-footer">
          </div>
        </div>
      </div>
    `;
  }

  // ============================================================
  // HELPERS
  // ============================================================

  function filterItems(items) {
    return items.filter(item => {
      // Filtro de búsqueda
      if (state.filters.search) {
        const search = state.filters.search.toLowerCase();
        const name = (item.title || item.name || item.file_name || '').toLowerCase();
        if (!name.includes(search)) return false;
      }

      // Filtro de categoría (solo para documentos)
      if (state.filters.category !== 'all' && item.category_code) {
        if (item.category_code !== state.filters.category) return false;
      }

      // Filtro de estado (solo para documentos)
      if (state.filters.status !== 'all' && item.status) {
        if (item.status !== state.filters.status) return false;
      }

      return true;
    });
  }

  function getDueClass(dueDate) {
    if (!dueDate) return 'normal';
    const due = new Date(dueDate);
    const now = new Date();
    const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'urgent';
    if (diffDays <= 3) return 'urgent';
    if (diffDays <= 7) return 'warning';
    return 'normal';
  }

  function showNotification(message, type = 'info') {
    const colors = {
      success: '#27ae60',
      error: '#e74c3c',
      warning: '#f39c12',
      info: '#3498db'
    };

    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 25px;
      background: ${colors[type]};
      color: white;
      border-radius: 8px;
      box-shadow: 0 5px 20px rgba(0,0,0,0.3);
      z-index: 100001;
      animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  // ============================================================
  // EVENT HANDLERS
  // ============================================================

  function attachEventListeners() {
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    });
  }

  // ============================================================
  // ACCIONES PÚBLICAS
  // ============================================================

  function switchTab(tabId) {
    state.currentView = tabId;
    render();
  }

  function navigateTo(folderId) {
    if (folderId === null) {
      state.currentFolder = null;
      state.currentPath = [];
    } else {
      state.currentFolder = folderId;
      // Actualizar path...
    }
    loadFolders(folderId);
    loadDocuments(folderId);
    render();
  }

  function openFolder(folderId) {
    navigateTo(folderId);
  }

  function selectItem(itemId) {
    const index = state.selectedItems.indexOf(itemId);
    if (index > -1) {
      state.selectedItems.splice(index, 1);
    } else {
      state.selectedItems.push(itemId);
    }
    render();
  }

  async function openDocument(docId) {
    const modal = document.getElementById('dms-modal');
    const title = document.getElementById('dms-modal-title');
    const body = document.getElementById('dms-modal-body');
    const footer = document.getElementById('dms-modal-footer');

    title.innerHTML = '📄 Detalle del Documento';
    body.innerHTML = '<div class="dms-loading"><div class="dms-spinner"></div></div>';
    footer.innerHTML = '';
    modal.classList.add('active');

    try {
      const doc = state.documents.find(d => d.id === docId) || {};

      const fileType = getFileTypeInfo(doc.file_name || doc.original_filename);
      const status = getStatusInfo(doc.status);
      const category = getCategoryInfo(doc.category_code);

      body.innerHTML = `
        <div class="dms-doc-detail">
          <div class="dms-doc-preview">
            <div class="dms-doc-preview-icon">${fileType.emoji}</div>
          </div>
          <div class="dms-doc-info">
            <div class="dms-doc-field">
              <div class="dms-doc-field-label">Título</div>
              <div class="dms-doc-field-value">${doc.title || doc.file_name || 'Sin título'}</div>
            </div>
            <div class="dms-doc-field">
              <div class="dms-doc-field-label">Categoría</div>
              <div class="dms-doc-field-value">${category.emoji} ${category.label}</div>
            </div>
            <div class="dms-doc-field">
              <div class="dms-doc-field-label">Estado</div>
              <div class="dms-doc-field-value">${status.emoji} ${status.label}</div>
            </div>
            <div class="dms-doc-field">
              <div class="dms-doc-field-label">Tamaño</div>
              <div class="dms-doc-field-value">${formatFileSize(doc.file_size_bytes || doc.file_size)}</div>
            </div>
            <div class="dms-doc-field">
              <div class="dms-doc-field-label">Fecha de Creación</div>
              <div class="dms-doc-field-value">${formatDate(doc.created_at)}</div>
            </div>
            ${doc.expiration_date ? `
              <div class="dms-doc-field">
                <div class="dms-doc-field-label">Fecha de Vencimiento</div>
                <div class="dms-doc-field-value">${formatDate(doc.expiration_date)}</div>
              </div>
            ` : ''}
            <div class="dms-doc-field">
              <div class="dms-doc-field-label">Versión</div>
              <div class="dms-doc-field-value">v${doc.version || 1}</div>
            </div>
          </div>
        </div>
      `;

      footer.innerHTML = `
        <button class="dms-btn dms-btn-secondary" onclick="DMS.closeModal()">Cerrar</button>
        <button class="dms-btn dms-btn-primary" onclick="DMS.downloadDocument('${docId}')">
          ⬇️ Descargar
        </button>
      `;
    } catch (e) {
      body.innerHTML = `<div class="dms-empty"><div class="dms-empty-icon">❌</div><div class="dms-empty-title">Error al cargar</div></div>`;
    }
  }

  function closeModal() {
    document.getElementById('dms-modal').classList.remove('active');
  }

  async function downloadDocument(docId) {
    showNotification('Descargando documento...', 'info');
    // Implementar descarga real
  }

  function updateFilter(key, value) {
    state.filters[key] = value;
    render();
  }

  function openUpload() {
    const modal = document.getElementById('dms-modal');
    const title = document.getElementById('dms-modal-title');
    const body = document.getElementById('dms-modal-body');
    const footer = document.getElementById('dms-modal-footer');

    title.innerHTML = '⬆️ Subir Documento';
    body.innerHTML = `
      <div class="dms-upload-zone" id="upload-zone">
        <div class="dms-upload-zone-icon">📤</div>
        <div class="dms-upload-zone-text">Arrastra archivos aquí o haz clic para seleccionar</div>
        <div class="dms-upload-zone-hint">PDF, DOC, XLS, JPG, PNG - Máx. 50MB</div>
        <input type="file" id="file-input" style="display: none;" multiple />
      </div>

      <div class="dms-doc-field" style="margin-top: 20px;">
        <label class="dms-doc-field-label">Categoría</label>
        <select class="dms-filter-select" style="width: 100%;" id="upload-category">
          ${Object.entries(CATEGORIES).map(([code, info]) => `
            <option value="${code}">${info.emoji} ${info.label}</option>
          `).join('')}
        </select>
      </div>

      <div class="dms-doc-field" style="margin-top: 15px;">
        <label class="dms-doc-field-label">Descripción (opcional)</label>
        <textarea class="dms-validation-textarea" id="upload-description"
                  placeholder="Descripción del documento..."></textarea>
      </div>
    `;

    footer.innerHTML = `
      <button class="dms-btn dms-btn-secondary" onclick="DMS.closeModal()">Cancelar</button>
      <button class="dms-btn dms-btn-primary" onclick="DMS.submitUpload()">⬆️ Subir</button>
    `;

    modal.classList.add('active');

    // Attach upload handlers
    const zone = document.getElementById('upload-zone');
    const input = document.getElementById('file-input');

    zone.onclick = () => input.click();
    zone.ondragover = (e) => { e.preventDefault(); zone.classList.add('dragover'); };
    zone.ondragleave = () => zone.classList.remove('dragover');
    zone.ondrop = (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
      // Handle files...
    };
  }

  function createFolder() {
    showNotification('Función de crear carpeta próximamente', 'info');
  }

  async function quickApprove(requestId) {
    try {
      await apiRequest(`/hr/validate/${requestId}`, {
        method: 'POST',
        body: JSON.stringify({ action: 'approve' })
      });
      showNotification('Documento aprobado', 'success');
      await loadPendingValidation();
      render();
    } catch (e) {
      showNotification('Error al aprobar: ' + e.message, 'error');
    }
  }

  async function quickReject(requestId) {
    const reason = prompt('Motivo del rechazo:');
    if (!reason) return;

    try {
      await apiRequest(`/hr/validate/${requestId}`, {
        method: 'POST',
        body: JSON.stringify({ action: 'reject', rejection_reason: reason })
      });
      showNotification('Documento rechazado', 'success');
      await loadPendingValidation();
      render();
    } catch (e) {
      showNotification('Error al rechazar: ' + e.message, 'error');
    }
  }

  function openValidation(requestId) {
    // Abrir modal de validación detallada
    showNotification('Abriendo validación...', 'info');
  }

  function uploadForRequest(requestId) {
    // Abrir modal de upload para una solicitud específica
    openUpload();
  }

  function submitRequest() {
    showNotification('Enviando solicitud...', 'info');
    // Implementar envío de solicitud
  }

  function submitUpload() {
    showNotification('Subiendo documento...', 'info');
    // Implementar upload
  }

  function deleteDocument(docId) {
    if (!confirm('¿Estás seguro de eliminar este documento?')) return;
    showNotification('Documento eliminado', 'success');
    // Implementar eliminación
  }

  // ============================================================
  // INICIALIZACIÓN
  // ============================================================

  async function init(containerId = 'dms-dashboard-container') {
    console.log('📁 [DMS Dashboard] Inicializando con contenedor:', containerId);

    // Verificar contenedor
    const container = document.getElementById(containerId);
    if (!container) {
      console.error('❌ [DMS] Contenedor no encontrado:', containerId);
      console.log('[DMS] Contenedores disponibles:', Array.from(document.querySelectorAll('[id]')).slice(0, 10).map(e => e.id));
      return;
    }
    console.log('📁 [DMS] Contenedor encontrado');
    container.id = 'dms-dashboard-container';

    // Inicializar permisos
    initPermissions();

    // Cargar datos iniciales
    await Promise.all([
      loadStats(),
      loadFolders(),
      loadDocuments(),
      loadPendingValidation(),
      loadMyRequests(),
      loadExpiringDocuments()
    ]);

    // Renderizar
    render();

    // Registrar ayuda contextual
    if (window.ModuleHelpSystem) {
      window.ModuleHelpSystem.registerModule(MODULE_KEY, {
        tips: [
          'Haz doble clic en una carpeta para abrirla',
          'Usa los filtros para encontrar documentos rápidamente',
          'Los documentos en estado "Pendiente Validación" requieren aprobación de RRHH',
          'Los documentos vencidos aparecen en la pestaña "Por Vencer"'
        ],
        warnings: [
          'Los documentos eliminados no se pueden recuperar',
          'Los documentos que subas quedan pendientes hasta que RRHH los valide'
        ],
        helpTopics: {
          'explorador': 'Navega por las carpetas y documentos de tu empresa como en un explorador de archivos.',
          'validacion': 'Los supervisores y RRHH pueden aprobar o rechazar documentos subidos por empleados.',
          'solicitudes': 'Cuando RRHH te solicita un documento, aparecerá aquí para que lo subas.',
          'vencimiento': 'Los documentos con fecha de vencimiento aparecen en la pestaña "Por Vencer".'
        }
      });
    }

    console.log('✅ [DMS Dashboard] Inicializado correctamente');

    // Integración con ContextualHelpSystem v2.0
    initContextualHelp();
  }

  // ============================================================
  // AYUDA CONTEXTUAL V2.0
  // ============================================================

  const HELP_CONTENT = {
    'filter-category': {
      title: 'Filtro de Categoría',
      description: 'Filtra documentos por su categoría (RRHH, Legal, Médico, etc.)',
      tips: ['Selecciona "Todas las categorías" para ver todos los documentos']
    },
    'filter-status': {
      title: 'Filtro de Estado',
      description: 'Filtra documentos por su estado actual',
      tips: ['Los documentos pendientes requieren acción']
    },
    'export-excel': {
      title: 'Exportar a Excel',
      description: 'Genera un archivo .xlsx con todos los documentos visibles',
      tips: ['Los filtros actuales se aplican a la exportación']
    },
    'export-pdf': {
      title: 'Exportar a PDF',
      description: 'Genera un reporte PDF con el listado de documentos',
      tips: ['Ideal para compartir o archivar']
    },
    'export-word': {
      title: 'Exportar a Word',
      description: 'Genera un documento .docx editable',
      tips: ['Útil para crear reportes personalizados']
    },
    'print': {
      title: 'Imprimir',
      description: 'Envía el listado actual a la impresora',
      tips: ['Se abrirá el diálogo de impresión del sistema']
    },
    'module-help': {
      title: 'Centro de Ayuda DMS',
      description: 'Accede a toda la documentación del sistema de gestión documental'
    }
  };

  function initContextualHelp() {
    // Registrar con ContextualHelpSystem v2.0
    if (typeof ContextualHelpSystem !== 'undefined') {
      ContextualHelpSystem.registerModule(MODULE_KEY, {
        name: 'Gestión Documental (DMS)',
        description: 'Sistema de Gestión Documental - Fuente Única de Verdad para todos los documentos',
        icon: '📁',
        category: 'core',
        version: '2.0.0',

        quickStart: [
          '1️⃣ Navega por las carpetas usando el explorador',
          '2️⃣ Usa los filtros para encontrar documentos',
          '3️⃣ Haz clic en un documento para ver sus detalles',
          '4️⃣ Exporta a Excel, PDF o Word según necesites'
        ],

        features: [
          { name: 'Explorador', desc: 'Navega documentos como en Windows Explorer', icon: '📂' },
          { name: 'Validación', desc: 'RRHH aprueba/rechaza documentos subidos', icon: '✅' },
          { name: 'Solicitudes', desc: 'Solicita documentos a empleados', icon: '📨' },
          { name: 'Vencimientos', desc: 'Alerta de documentos por vencer', icon: '⏰' },
          { name: 'Exportación', desc: 'Excel, PDF, Word e impresión', icon: '📊' }
        ],

        shortcuts: [
          { keys: 'Ctrl + F', action: 'Buscar documentos' },
          { keys: 'Ctrl + U', action: 'Subir documento' },
          { keys: 'Ctrl + P', action: 'Imprimir listado' },
          { keys: 'Esc', action: 'Cerrar modal' }
        ],

        faq: [
          {
            q: '¿Cómo subo un documento?',
            a: 'Haz clic en el botón "⬆️ Subir" o arrastra el archivo al explorador.'
          },
          {
            q: '¿Por qué mi documento está pendiente?',
            a: 'Todos los documentos subidos por empleados requieren validación de RRHH.'
          },
          {
            q: '¿Cómo solicito un documento a un empleado?',
            a: 'Ve a la pestaña "Solicitar" y completa el formulario.'
          },
          {
            q: '¿Qué formatos puedo subir?',
            a: 'PDF, DOC, DOCX, XLS, XLSX, JPG, PNG hasta 50MB.'
          }
        ],

        fieldHelp: HELP_CONTENT
      });

      console.log('💡 [DMS] Ayuda contextual v2.0 registrada');
    }

    // Registrar tooltips en elementos con data-help
    setTimeout(() => {
      document.querySelectorAll('[data-help]').forEach(el => {
        const helpKey = el.dataset.help;
        const helpInfo = HELP_CONTENT[helpKey];

        if (helpInfo) {
          el.title = `${helpInfo.title}: ${helpInfo.description}`;
        }
      });
    }, 500);
  }

  function showHelp() {
    // Mostrar panel de ayuda completo
    if (typeof ContextualHelpSystem !== 'undefined' && ContextualHelpSystem.showModuleHelp) {
      ContextualHelpSystem.showModuleHelp(MODULE_KEY);
    } else {
      // Fallback si no existe el sistema
      const modal = document.getElementById('dms-modal');
      const title = document.getElementById('dms-modal-title');
      const body = document.getElementById('dms-modal-body');
      const footer = document.getElementById('dms-modal-footer');

      title.innerHTML = '❓ Ayuda - Gestión Documental (DMS)';
      body.innerHTML = `
        <div style="color: #e0e0e0;">
          <h3 style="color: #3498db; margin-bottom: 15px;">📁 Sistema de Gestión Documental</h3>
          <p style="margin-bottom: 20px;">
            El DMS es la <strong>Fuente Única de Verdad</strong> para todos los documentos de la empresa.
          </p>

          <h4 style="color: #2ecc71; margin-bottom: 10px;">🚀 Inicio Rápido</h4>
          <ol style="margin-left: 20px; margin-bottom: 20px;">
            <li>Navega por las carpetas usando el explorador</li>
            <li>Usa los filtros para encontrar documentos</li>
            <li>Haz clic en un documento para ver detalles</li>
            <li>Exporta a Excel, PDF o Word según necesites</li>
          </ol>

          <h4 style="color: #f39c12; margin-bottom: 10px;">📊 Funcionalidades</h4>
          <ul style="margin-left: 20px; margin-bottom: 20px;">
            <li><strong>📂 Explorador:</strong> Navega como en Windows Explorer</li>
            <li><strong>✅ Validación:</strong> RRHH aprueba/rechaza documentos</li>
            <li><strong>📨 Solicitudes:</strong> Solicita documentos a empleados</li>
            <li><strong>⏰ Vencimientos:</strong> Alerta de documentos por vencer</li>
            <li><strong>📊 Exportación:</strong> Excel, PDF, Word e impresión</li>
          </ul>

          <h4 style="color: #9b59b6; margin-bottom: 10px;">⌨️ Atajos de Teclado</h4>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 5px; border-bottom: 1px solid #333;">Ctrl + F</td><td style="padding: 5px; border-bottom: 1px solid #333;">Buscar documentos</td></tr>
            <tr><td style="padding: 5px; border-bottom: 1px solid #333;">Ctrl + U</td><td style="padding: 5px; border-bottom: 1px solid #333;">Subir documento</td></tr>
            <tr><td style="padding: 5px; border-bottom: 1px solid #333;">Ctrl + P</td><td style="padding: 5px; border-bottom: 1px solid #333;">Imprimir listado</td></tr>
            <tr><td style="padding: 5px;">Esc</td><td style="padding: 5px;">Cerrar modal</td></tr>
          </table>
        </div>
      `;
      footer.innerHTML = `
        <button class="dms-btn dms-btn-primary" onclick="DMS.closeModal()">Entendido</button>
      `;
      modal.classList.add('active');
    }
  }

  // ============================================================
  // EXPORTACIONES
  // ============================================================

  function getExportData() {
    const items = [...state.folders, ...state.documents];
    const filtered = filterItems(items);

    return filtered.map(item => ({
      nombre: item.name || item.title || 'Sin nombre',
      tipo: item.isFolder ? 'Carpeta' : 'Documento',
      categoria: item.category ? CATEGORIES[item.category]?.label || item.category : '-',
      estado: item.status ? DOCUMENT_STATUS[item.status]?.label || item.status : '-',
      fechaCreacion: item.created_at ? new Date(item.created_at).toLocaleDateString('es-AR') : '-',
      fechaVencimiento: item.expiration_date ? new Date(item.expiration_date).toLocaleDateString('es-AR') : '-',
      propietario: item.owner_name || item.uploaded_by_name || '-'
    }));
  }

  function exportToExcel() {
    const data = getExportData();

    if (data.length === 0) {
      showNotification('No hay datos para exportar', 'warning');
      return;
    }

    // Crear CSV (Excel lo abre directamente)
    const headers = ['Nombre', 'Tipo', 'Categoría', 'Estado', 'Fecha Creación', 'Fecha Vencimiento', 'Propietario'];
    const rows = data.map(item => [
      item.nombre,
      item.tipo,
      item.categoria,
      item.estado,
      item.fechaCreacion,
      item.fechaVencimiento,
      item.propietario
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');

    // BOM para caracteres especiales
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `DMS_Documentos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    URL.revokeObjectURL(url);
    showNotification(`✅ Exportados ${data.length} registros a Excel`, 'success');
  }

  function exportToPDF() {
    const data = getExportData();

    if (data.length === 0) {
      showNotification('No hay datos para exportar', 'warning');
      return;
    }

    // Crear ventana de impresión como PDF
    const printWindow = window.open('', '_blank');
    const companyName = state.user?.company?.name || 'Empresa';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>DMS - Listado de Documentos</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
          h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
          h2 { color: #7f8c8d; font-size: 14px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #3498db; color: white; padding: 12px; text-align: left; font-size: 12px; }
          td { padding: 10px; border-bottom: 1px solid #ddd; font-size: 11px; }
          tr:nth-child(even) { background: #f9f9f9; }
          .header { display: flex; justify-content: space-between; align-items: center; }
          .stats { background: #ecf0f1; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .footer { margin-top: 30px; text-align: center; color: #95a5a6; font-size: 10px; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📁 Sistema de Gestión Documental</h1>
        </div>
        <h2>${companyName} - Generado el ${new Date().toLocaleString('es-AR')}</h2>

        <div class="stats">
          <strong>Total documentos:</strong> ${data.length} |
          <strong>Filtros aplicados:</strong>
          Categoría: ${state.filters.category === 'all' ? 'Todas' : CATEGORIES[state.filters.category]?.label || state.filters.category},
          Estado: ${state.filters.status === 'all' ? 'Todos' : DOCUMENT_STATUS[state.filters.status]?.label || state.filters.status}
        </div>

        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Categoría</th>
              <th>Estado</th>
              <th>Creación</th>
              <th>Vencimiento</th>
              <th>Propietario</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(item => `
              <tr>
                <td>${item.nombre}</td>
                <td>${item.tipo}</td>
                <td>${item.categoria}</td>
                <td>${item.estado}</td>
                <td>${item.fechaCreacion}</td>
                <td>${item.fechaVencimiento}</td>
                <td>${item.propietario}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>Documento generado por el Sistema de Gestión Documental (DMS) - APONNT</p>
          <p>Este documento es de uso interno y confidencial</p>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `);

    printWindow.document.close();
    showNotification('📕 PDF generado - Use "Guardar como PDF" en el diálogo de impresión', 'info');
  }

  function exportToWord() {
    const data = getExportData();

    if (data.length === 0) {
      showNotification('No hay datos para exportar', 'warning');
      return;
    }

    const companyName = state.user?.company?.name || 'Empresa';

    // Crear contenido HTML que Word puede abrir
    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:w="urn:schemas-microsoft-com:office:word"
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>DMS - Listado de Documentos</title>
        <style>
          body { font-family: Calibri, Arial, sans-serif; }
          h1 { color: #2c3e50; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #3498db; color: white; }
        </style>
      </head>
      <body>
        <h1>📁 Sistema de Gestión Documental</h1>
        <p><strong>Empresa:</strong> ${companyName}</p>
        <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-AR')}</p>
        <p><strong>Total registros:</strong> ${data.length}</p>

        <table>
          <tr>
            <th>Nombre</th>
            <th>Tipo</th>
            <th>Categoría</th>
            <th>Estado</th>
            <th>Creación</th>
            <th>Vencimiento</th>
            <th>Propietario</th>
          </tr>
          ${data.map(item => `
            <tr>
              <td>${item.nombre}</td>
              <td>${item.tipo}</td>
              <td>${item.categoria}</td>
              <td>${item.estado}</td>
              <td>${item.fechaCreacion}</td>
              <td>${item.fechaVencimiento}</td>
              <td>${item.propietario}</td>
            </tr>
          `).join('')}
        </table>

        <p style="margin-top: 30px; color: #95a5a6; font-size: 10px;">
          Documento generado por el Sistema de Gestión Documental (DMS) - APONNT
        </p>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `DMS_Documentos_${new Date().toISOString().split('T')[0]}.doc`;
    link.click();

    URL.revokeObjectURL(url);
    showNotification(`📘 Exportados ${data.length} registros a Word`, 'success');
  }

  function printDocuments() {
    const data = getExportData();

    if (data.length === 0) {
      showNotification('No hay datos para imprimir', 'warning');
      return;
    }

    // Usar la misma función que PDF pero sin sugerir guardar
    exportToPDF();
    showNotification('🖨️ Enviando a impresora...', 'info');
  }

  // ============================================================
  // API PÚBLICA
  // ============================================================

  window.DMS = {
    init,
    switchTab,
    navigateTo,
    openFolder,
    selectItem,
    openDocument,
    closeModal,
    downloadDocument,
    updateFilter,
    openUpload,
    createFolder,
    quickApprove,
    quickReject,
    openValidation,
    uploadForRequest,
    submitRequest,
    submitUpload,
    deleteDocument,
    // Nuevas funciones de exportación
    exportToExcel,
    exportToPDF,
    exportToWord,
    printDocuments,
    showHelp
  };

  // ============================================================
  // FUNCIÓN DE ENTRADA PARA PANEL-EMPRESA
  // ============================================================
  window.showDmsDashboardContent = function() {
    console.log('📁 [DMS] showDmsDashboardContent() llamado');

    // Usar mainContent como los demás módulos del sistema
    const mainContent = document.getElementById('mainContent');
    console.log('📁 [DMS] mainContent:', mainContent ? 'encontrado' : 'NO ENCONTRADO');

    if (mainContent) {
      // Crear contenedor específico para DMS dentro de mainContent
      mainContent.innerHTML = '<div id="dms-dashboard-container" style="width:100%; min-height:600px; padding: 20px;"></div>';
      console.log('📁 [DMS] Container DMS creado en mainContent, iniciando...');

      setTimeout(() => {
        console.log('📁 [DMS] window.DMS existe:', !!window.DMS);
        console.log('📁 [DMS] window.DMS.init existe:', !!(window.DMS && window.DMS.init));

        if (window.DMS && typeof window.DMS.init === 'function') {
          try {
            window.DMS.init();
            console.log('📁 [DMS] init() ejecutado correctamente');
          } catch (err) {
            console.error('❌ [DMS] Error en init():', err);
          }
        } else {
          console.error('❌ [DMS] window.DMS o window.DMS.init no disponible');
        }
      }, 100);
    } else {
      console.error('❌ [DMS] mainContent no encontrado');
    }
  };

  // Alias para sistema dinámico
  window.initDmsDashboard = window.showDmsDashboardContent;

})();
