/**
 * ============================================================================
 * MÓDULO: Expediente 360° - Análisis Integral de Empleados
 * ============================================================================
 *
 * Módulo premium que consolida TODA la información de un empleado:
 * - Información personal y laboral
 * - Historial de asistencia y puntualidad
 * - Sanciones y disciplina
 * - Vacaciones y ausencias
 * - Capacitaciones
 * - Historial médico
 * - Análisis con IA (Ollama)
 * - Scoring y evaluación
 * - Timeline unificado
 * - Comparación entre empleados
 * - Exportación PDF profesional
 *
 * @version 3.0.0 Enterprise Dark Theme
 * @date 2025-12-06
 * @changelog
 *   - 3.0.0: Rediseño visual completo con Dark Theme (igual que payroll-liquidation)
 *   - 2.0.0: Agregadas tabs Enterprise: Biométrico Emocional y Compatibilidad/Reemplazos
 *   - 1.0.0: Versión inicial con tabs estándar
 * ============================================================================
 */

(function() {
    'use strict';

    // =========================================================================
    // CONFIGURACIÓN Y ESTADO
    // =========================================================================

    const MODULE_KEY = 'employee-360';
    const API_BASE = '/api/employee-360';

    let currentEmployee = null;
    let employeesList = [];
    let comparisonList = [];
    let currentReport = null;

    // =========================================================================
    // INYECCIÓN DE ESTILOS EN HEAD
    // =========================================================================

    function injectStyles() {
        // Evitar duplicados
        if (document.getElementById('employee-360-styles')) return;

        const style = document.createElement('style');
        style.id = 'employee-360-styles';
        style.textContent = `
            .employee-360-wrapper {
                padding: 20px;
                background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
                min-height: calc(100vh - 60px);
            }

            .e360-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 50%, #0369a1 100%);
                color: white;
                padding: 20px 25px;
                border-radius: 12px;
                margin-bottom: 20px;
                box-shadow: 0 4px 25px rgba(14, 165, 233, 0.3);
                border: 1px solid rgba(255,255,255,0.1);
                position: relative;
                overflow: hidden;
            }

            .e360-header h2 {
                margin: 0;
                font-size: 1.8rem;
            }

            .e360-header h2 i {
                margin-right: 10px;
            }

            .e360-subtitle {
                font-size: 0.9rem;
                opacity: 0.9;
            }

            .e360-tech-badges {
                display: flex;
                gap: 10px;
            }

            .e360-tech-badges .badge {
                padding: 8px 12px;
                border-radius: 20px;
                font-size: 0.8rem;
                display: flex;
                align-items: center;
                gap: 5px;
            }

            .badge-ai {
                background: rgba(155, 89, 182, 0.9);
            }

            .badge-scoring {
                background: rgba(46, 204, 113, 0.9);
            }

            .e360-controls {
                display: flex;
                gap: 20px;
                align-items: flex-end;
                background: rgba(255,255,255,0.03);
                padding: 20px;
                border-radius: 12px;
                margin-bottom: 20px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                border: 1px solid rgba(255,255,255,0.08);
                flex-wrap: wrap;
            }

            .e360-employee-selector {
                flex: 1;
                min-width: 250px;
            }

            .e360-employee-selector label,
            .e360-date-range label {
                display: block;
                margin-bottom: 5px;
                font-weight: 600;
                color: #e2e8f0;
            }

            .e360-employee-selector select {
                width: 100%;
            }

            .e360-date-range .date-inputs {
                display: flex;
                gap: 10px;
                align-items: center;
            }

            .e360-date-range input {
                width: 150px;
            }

            .e360-actions {
                display: flex;
                gap: 10px;
            }

            .e360-actions .btn {
                white-space: nowrap;
            }

            .e360-comparison-list {
                background: rgba(251, 191, 36, 0.1);
                border: 1px solid rgba(251, 191, 36, 0.3);
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 20px;
            }

            .e360-comparison-list h4 {
                margin: 0 0 10px 0;
                font-size: 0.95rem;
                color: #fbbf24;
            }

            #comparison-chips {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
                margin-bottom: 10px;
            }

            .comparison-chip {
                background: rgba(251, 191, 36, 0.2);
                border: 1px solid rgba(251, 191, 36, 0.4);
                color: #fbbf24;
                padding: 5px 10px;
                border-radius: 15px;
                font-size: 0.85rem;
                display: flex;
                align-items: center;
                gap: 5px;
            }

            .comparison-chip .remove {
                cursor: pointer;
                color: #fbbf24;
            }

            .e360-tabs {
                display: flex;
                gap: 5px;
                background: rgba(255,255,255,0.02);
                padding: 10px;
                border-radius: 12px 12px 0 0;
                border-bottom: 1px solid rgba(255,255,255,0.08);
                flex-wrap: wrap;
            }

            .e360-tab {
                padding: 10px 20px;
                border: 1px solid transparent;
                background: rgba(255,255,255,0.05);
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 0.9rem;
                color: #94a3b8;
            }

            .e360-tab:hover {
                background: rgba(14, 165, 233, 0.1);
                color: #0ea5e9;
                border-color: rgba(14, 165, 233, 0.3);
            }

            .e360-tab.active {
                background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
                color: white;
                border-color: transparent;
                box-shadow: 0 4px 15px rgba(14, 165, 233, 0.4);
            }

            .e360-content {
                background: rgba(255,255,255,0.02);
                border-radius: 0 0 12px 12px;
                min-height: 500px;
                padding: 25px;
                border: 1px solid rgba(255,255,255,0.05);
                border-top: none;
            }

            .e360-placeholder {
                text-align: center;
                padding: 80px 20px;
                color: #94a3b8;
            }

            .e360-placeholder i {
                color: rgba(14, 165, 233, 0.3);
                margin-bottom: 20px;
            }

            .e360-placeholder h3 {
                margin-bottom: 10px;
                color: #e2e8f0;
            }

            .e360-features {
                display: flex;
                justify-content: center;
                gap: 30px;
                margin-top: 30px;
            }

            .e360-features .feature {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
            }

            .e360-features .feature i {
                font-size: 2rem;
                color: #0ea5e9;
            }

            .e360-features .feature span {
                font-size: 0.9rem;
                color: #cbd5e1;
            }

            /* Scoring Card */
            .scoring-card {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 25px;
                border-radius: 15px;
                margin-bottom: 20px;
            }

            .scoring-main {
                display: flex;
                align-items: center;
                gap: 30px;
                margin-bottom: 20px;
            }

            .scoring-circle {
                width: 120px;
                height: 120px;
                border-radius: 50%;
                background: rgba(255,255,255,0.2);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                border: 4px solid white;
            }

            .scoring-value {
                font-size: 2.5rem;
                font-weight: 700;
            }

            .scoring-label {
                font-size: 0.8rem;
                opacity: 0.9;
            }

            .scoring-breakdown {
                flex: 1;
            }

            .scoring-category {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 8px;
            }

            .scoring-category-name {
                width: 100px;
                font-size: 0.85rem;
            }

            .scoring-bar {
                flex: 1;
                height: 8px;
                background: rgba(255,255,255,0.3);
                border-radius: 4px;
                overflow: hidden;
            }

            .scoring-bar-fill {
                height: 100%;
                background: white;
                border-radius: 4px;
                transition: width 0.5s ease;
            }

            .scoring-category-value {
                width: 40px;
                text-align: right;
                font-weight: 600;
            }

            /* Employee Info Card */
            .employee-info-card {
                display: grid;
                grid-template-columns: 150px 1fr;
                gap: 25px;
                background: rgba(255,255,255,0.03);
                padding: 20px;
                border-radius: 12px;
                margin-bottom: 20px;
                border: 1px solid rgba(255,255,255,0.08);
            }

            .employee-avatar {
                width: 150px;
                height: 150px;
                border-radius: 50%;
                background: linear-gradient(135deg, rgba(14, 165, 233, 0.2), rgba(6, 182, 212, 0.2));
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 4rem;
                color: #0ea5e9;
                border: 4px solid rgba(14, 165, 233, 0.5);
                box-shadow: 0 4px 20px rgba(14, 165, 233, 0.2);
            }

            .employee-details {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 15px;
            }

            .detail-item {
                background: rgba(255,255,255,0.05);
                padding: 12px;
                border-radius: 8px;
                border: 1px solid rgba(255,255,255,0.08);
            }

            .detail-label {
                font-size: 0.75rem;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .detail-value {
                font-size: 1rem;
                font-weight: 600;
                color: #e2e8f0;
                margin-top: 4px;
            }

            /* Stats Grid */
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 20px;
                margin-bottom: 25px;
            }

            .stat-card {
                background: rgba(255,255,255,0.03);
                padding: 20px;
                border-radius: 12px;
                text-align: center;
                border: 1px solid rgba(255,255,255,0.08);
                transition: transform 0.3s, box-shadow 0.3s, border-color 0.3s;
            }

            .stat-card:hover {
                transform: translateY(-4px);
                box-shadow: 0 8px 25px rgba(0,0,0,0.3);
                border-color: rgba(14, 165, 233, 0.3);
            }

            .stat-icon {
                width: 50px;
                height: 50px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 10px;
                font-size: 1.3rem;
            }

            .stat-icon.green { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
            .stat-icon.blue { background: rgba(14, 165, 233, 0.15); color: #0ea5e9; }
            .stat-icon.yellow { background: rgba(251, 191, 36, 0.15); color: #fbbf24; }
            .stat-icon.red { background: rgba(239, 68, 68, 0.15); color: #ef4444; }

            .stat-value {
                font-size: 1.8rem;
                font-weight: 700;
                color: #f1f5f9;
            }

            .stat-label {
                font-size: 0.85rem;
                color: #94a3b8;
            }

            /* Timeline */
            .timeline {
                position: relative;
                padding-left: 30px;
            }

            .timeline::before {
                content: '';
                position: absolute;
                left: 10px;
                top: 0;
                bottom: 0;
                width: 2px;
                background: rgba(255,255,255,0.1);
            }

            .timeline-item {
                position: relative;
                padding: 15px 20px;
                background: rgba(255,255,255,0.03);
                border-radius: 8px;
                margin-bottom: 15px;
                border: 1px solid rgba(255,255,255,0.08);
                transition: all 0.3s ease;
            }

            .timeline-item:hover {
                background: rgba(255,255,255,0.05);
                border-color: rgba(14, 165, 233, 0.3);
            }

            .timeline-item::before {
                content: '';
                position: absolute;
                left: -24px;
                top: 20px;
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background: #0ea5e9;
                border: 2px solid #1a1a2e;
                box-shadow: 0 0 10px rgba(14, 165, 233, 0.5);
            }

            .timeline-item.attendance::before { background: #0ea5e9; box-shadow: 0 0 10px rgba(14, 165, 233, 0.5); }
            .timeline-item.sanction::before { background: #ef4444; box-shadow: 0 0 10px rgba(239, 68, 68, 0.5); }
            .timeline-item.training::before { background: #22c55e; box-shadow: 0 0 10px rgba(34, 197, 94, 0.5); }
            .timeline-item.vacation::before { background: #fbbf24; box-shadow: 0 0 10px rgba(251, 191, 36, 0.5); }
            .timeline-item.medical::before { background: #a855f7; box-shadow: 0 0 10px rgba(168, 85, 247, 0.5); }
            .timeline-item.audit::before { background: #64748b; box-shadow: 0 0 10px rgba(100, 116, 139, 0.5); }

            .timeline-date {
                font-size: 0.75rem;
                color: #64748b;
                margin-bottom: 5px;
            }

            .timeline-title {
                font-weight: 600;
                margin-bottom: 5px;
                color: #e2e8f0;
            }

            .timeline-description {
                font-size: 0.9rem;
                color: #94a3b8;
            }

            /* AI Analysis */
            .ai-analysis {
                background: linear-gradient(135deg, #2c3e50 0%, #4a69bd 100%);
                color: white;
                padding: 25px;
                border-radius: 15px;
            }

            .ai-header {
                display: flex;
                align-items: center;
                gap: 15px;
                margin-bottom: 20px;
            }

            .ai-header i {
                font-size: 2rem;
            }

            .ai-header h3 {
                margin: 0;
            }

            .ai-header .badge {
                background: rgba(255,255,255,0.2);
                padding: 5px 10px;
                border-radius: 15px;
                font-size: 0.75rem;
            }

            .ai-content {
                background: rgba(255,255,255,0.1);
                padding: 20px;
                border-radius: 10px;
                line-height: 1.7;
            }

            .ai-content h4 {
                margin-top: 15px;
                margin-bottom: 10px;
                opacity: 0.9;
            }

            .ai-content ul {
                margin-left: 20px;
            }

            .ai-content li {
                margin-bottom: 8px;
            }

            .ai-metadata {
                display: flex;
                gap: 20px;
                margin-top: 15px;
                font-size: 0.8rem;
                opacity: 0.8;
            }

            /* Loading */
            .e360-loading {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 60px;
            }

            .e360-loading .spinner {
                width: 50px;
                height: 50px;
                border: 4px solid rgba(255,255,255,0.1);
                border-top-color: #0ea5e9;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }

            .e360-loading p {
                margin-top: 15px;
                color: #94a3b8;
            }

            /* Comparison View */
            .comparison-grid {
                display: grid;
                gap: 20px;
            }

            .comparison-header {
                display: grid;
                gap: 15px;
                background: rgba(255,255,255,0.03);
                padding: 15px;
                border-radius: 10px;
                margin-bottom: 20px;
                border: 1px solid rgba(255,255,255,0.08);
            }

            .comparison-row {
                display: grid;
                gap: 15px;
                padding: 10px;
                border-bottom: 1px solid rgba(255,255,255,0.08);
            }

            .comparison-row:last-child {
                border-bottom: none;
            }

            .comparison-cell {
                text-align: center;
                padding: 10px;
            }

            .comparison-employee-name {
                font-weight: 600;
                font-size: 1.1rem;
                color: #e2e8f0;
            }

            .comparison-score {
                font-size: 2rem;
                font-weight: 700;
            }

            .comparison-score.excellent { color: #22c55e; }
            .comparison-score.good { color: #0ea5e9; }
            .comparison-score.average { color: #fbbf24; }
            .comparison-score.poor { color: #ef4444; }

            /* Responsive */
            @media (max-width: 1200px) {
                .stats-grid {
                    grid-template-columns: repeat(2, 1fr);
                }
                .employee-details {
                    grid-template-columns: repeat(2, 1fr);
                }
            }

            @media (max-width: 768px) {
                .e360-header {
                    flex-direction: column;
                    text-align: center;
                    gap: 15px;
                }
                .e360-controls {
                    flex-direction: column;
                }
                .stats-grid {
                    grid-template-columns: 1fr;
                }
                .employee-info-card {
                    grid-template-columns: 1fr;
                    text-align: center;
                }
                .employee-avatar {
                    margin: 0 auto;
                }
                .employee-details {
                    grid-template-columns: 1fr;
                }
            }
            /* === ENTERPRISE TABS: BIOMETRICO Y REEMPLAZOS === */
            .e360-biometric-card {
                background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(59, 130, 246, 0.1));
                border: 1px solid rgba(139, 92, 246, 0.3);
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 16px;
            }
            .e360-correlation-card {
                background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(249, 115, 22, 0.1));
                border: 1px solid rgba(239, 68, 68, 0.3);
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 12px;
            }
            .e360-correlation-significance {
                display: inline-block;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
            }
            .e360-correlation-high { background: #ef4444; color: white; }
            .e360-correlation-medium { background: #f59e0b; color: black; }
            .e360-metric-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 16px;
                margin-bottom: 20px;
            }
            .e360-metric-box {
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 8px;
                padding: 16px;
                text-align: center;
            }
            .e360-metric-value { font-size: 28px; font-weight: 700; margin-bottom: 4px; }
            .e360-metric-label { font-size: 12px; opacity: 0.7; }
            .e360-replacement-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px 16px;
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 8px;
                margin-bottom: 8px;
            }
            .e360-replacement-score {
                padding: 6px 14px;
                border-radius: 20px;
                font-weight: 700;
                font-size: 14px;
            }
            .e360-score-high { background: #22c55e; color: white; }
            .e360-score-medium { background: #f59e0b; color: black; }
            .e360-score-low { background: #6b7280; color: white; }
            .e360-alert-danger {
                background: rgba(239, 68, 68, 0.15);
                border-left: 4px solid #ef4444;
                padding: 16px;
                border-radius: 8px;
                margin-bottom: 16px;
            }
            .e360-no-data {
                text-align: center;
                padding: 40px;
                color: #9ca3af;
                font-style: italic;
            }

            /* Dark Theme: Form Controls */
            .employee-360-wrapper .form-control,
            .employee-360-wrapper select,
            .employee-360-wrapper input[type="date"],
            .employee-360-wrapper input[type="text"] {
                background: rgba(255,255,255,0.05) !important;
                border: 1px solid rgba(255,255,255,0.15) !important;
                color: #e2e8f0 !important;
                border-radius: 8px;
                padding: 10px 14px;
                transition: all 0.3s ease;
            }

            .employee-360-wrapper .form-control:focus,
            .employee-360-wrapper select:focus,
            .employee-360-wrapper input:focus {
                background: rgba(255,255,255,0.08) !important;
                border-color: rgba(14, 165, 233, 0.5) !important;
                box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15) !important;
                outline: none;
            }

            .employee-360-wrapper select option {
                background: #1a1a2e;
                color: #e2e8f0;
            }

            /* Dark Theme: Buttons */
            .employee-360-wrapper .btn {
                border-radius: 8px;
                padding: 10px 18px;
                font-weight: 600;
                transition: all 0.3s ease;
                border: 1px solid transparent;
            }

            .employee-360-wrapper .btn-primary {
                background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
                border-color: transparent;
                color: white;
                box-shadow: 0 4px 15px rgba(14, 165, 233, 0.3);
            }

            .employee-360-wrapper .btn-primary:hover:not(:disabled) {
                background: linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%);
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(14, 165, 233, 0.4);
            }

            .employee-360-wrapper .btn-primary:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .employee-360-wrapper .btn-secondary {
                background: rgba(255,255,255,0.05);
                border-color: rgba(255,255,255,0.15);
                color: #cbd5e1;
            }

            .employee-360-wrapper .btn-secondary:hover:not(:disabled) {
                background: rgba(255,255,255,0.1);
                border-color: rgba(14, 165, 233, 0.3);
                color: #0ea5e9;
            }

            .employee-360-wrapper .btn-success {
                background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
                border-color: transparent;
                color: white;
                box-shadow: 0 4px 15px rgba(34, 197, 94, 0.3);
            }

            .employee-360-wrapper .btn-success:hover:not(:disabled) {
                background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(34, 197, 94, 0.4);
            }

            .employee-360-wrapper .btn-outline-danger {
                background: transparent;
                border-color: rgba(239, 68, 68, 0.5);
                color: #ef4444;
            }

            .employee-360-wrapper .btn-outline-danger:hover {
                background: rgba(239, 68, 68, 0.1);
                border-color: #ef4444;
            }

            /* Dark Theme: Date range separator */
            .e360-date-range .date-inputs span {
                color: #94a3b8;
            }

            /* Dark Theme: Scrollbar */
            .employee-360-wrapper ::-webkit-scrollbar {
                width: 8px;
                height: 8px;
            }

            .employee-360-wrapper ::-webkit-scrollbar-track {
                background: rgba(255,255,255,0.02);
                border-radius: 4px;
            }

            .employee-360-wrapper ::-webkit-scrollbar-thumb {
                background: rgba(255,255,255,0.1);
                border-radius: 4px;
            }

            .employee-360-wrapper ::-webkit-scrollbar-thumb:hover {
                background: rgba(14, 165, 233, 0.3);
            }

            /* Dark Theme: Tables */
            .employee-360-wrapper table {
                width: 100%;
                border-collapse: collapse;
            }

            .employee-360-wrapper table th {
                background: rgba(14, 165, 233, 0.1);
                color: #0ea5e9;
                font-weight: 600;
                text-transform: uppercase;
                font-size: 0.75rem;
                letter-spacing: 0.5px;
                padding: 12px 16px;
                text-align: left;
                border-bottom: 1px solid rgba(255,255,255,0.1);
            }

            .employee-360-wrapper table td {
                padding: 12px 16px;
                color: #e2e8f0;
                border-bottom: 1px solid rgba(255,255,255,0.05);
            }

            .employee-360-wrapper table tr:hover td {
                background: rgba(14, 165, 233, 0.05);
            }

            /* Dark Theme: Badges */
            .employee-360-wrapper .badge {
                padding: 4px 10px;
                border-radius: 12px;
                font-size: 0.75rem;
                font-weight: 600;
            }

            .employee-360-wrapper .badge-success { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
            .employee-360-wrapper .badge-warning { background: rgba(251, 191, 36, 0.2); color: #fbbf24; }
            .employee-360-wrapper .badge-danger { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
            .employee-360-wrapper .badge-info { background: rgba(14, 165, 233, 0.2); color: #0ea5e9; }
            .employee-360-wrapper .badge-secondary { background: rgba(100, 116, 139, 0.2); color: #94a3b8; }

            /* Glow effects for accent elements */
            .e360-header::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(135deg, rgba(14, 165, 233, 0.1), transparent);
                border-radius: 12px;
                pointer-events: none;
            }

        `;
        document.head.appendChild(style);
        console.log('✅ [360°] Estilos inyectados en head');
    }

    // =========================================================================
    // INICIALIZACIÓN
    // =========================================================================

    // Variable para detectar modo self-view (acceso desde Mi Espacio)
    let selfViewMode = false;

    function init() {
        console.log('🎯 [360°] Inicializando módulo Expediente 360°...');

        // Detectar si viene desde Mi Espacio (modo self-view)
        selfViewMode = window.miEspacioSelfView === true;

        if (selfViewMode) {
            console.log('🔒 [360°] MODO SELF-VIEW: Solo perfil del usuario logueado');
            renderSelfViewUI();
            loadCurrentUserReport();
        } else {
            // Modo administrador: muestra selector de empleados
            renderModuleUI();
            loadEmployeesList();
            setupEventListeners();
        }

        console.log('✅ [360°] Módulo inicializado correctamente');
    }

    /**
     * Renderizar UI para modo self-view (solo mi perfil)
     */
    function renderSelfViewUI() {
        injectStyles();

        const container = document.getElementById('mainContent');
        if (!container) {
            console.error('❌ [360°] Contenedor mainContent no encontrado');
            return;
        }

        const currentUser = window.currentUser || {};
        const userName = currentUser.firstName || currentUser.name || 'Mi Perfil';

        container.innerHTML = `
            <div id="employee-360-container" class="employee-360-wrapper">
                <!-- Header del módulo -->
                <div class="e360-header">
                    <div class="e360-header-left">
                        <h2><i class="fas fa-id-card"></i> Mi Perfil 360°</h2>
                        <span class="e360-subtitle">Vista integral de ${userName}</span>
                    </div>
                    <div class="e360-header-right">
                        <div class="e360-tech-badges">
                            <span class="badge badge-ai" title="Análisis con Inteligencia Artificial">
                                <i class="fas fa-brain"></i> Ollama + Llama 3.1
                            </span>
                            <span class="badge badge-scoring" title="Sistema de Scoring">
                                <i class="fas fa-chart-line"></i> Scoring
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Loading mientras se carga el perfil -->
                <div class="e360-content">
                    <div class="e360-loading">
                        <div class="spinner"></div>
                        <p>Cargando tu perfil 360°...</p>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Cargar reporte del usuario actual (modo self-view)
     */
    async function loadCurrentUserReport() {
        try {
            const currentUser = window.currentUser || {};
            const userId = currentUser.id || currentUser.user_id || window.miEspacioUserId;

            if (!userId) {
                console.error('❌ [360°] No se pudo determinar el ID del usuario');
                showSelfViewError('No se pudo identificar tu perfil. Por favor, vuelve a iniciar sesión.');
                return;
            }

            console.log('📊 [360°] Cargando perfil del usuario:', userId);

            // Usar el mismo endpoint pero con el ID del usuario actual
            const response = await fetch(`${API_BASE}/${userId}`, {
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            const data = await response.json();

            if (data.success && data.data) {
                currentEmployee = userId;
                currentReport = data.data;
                renderReport(currentReport);
                enableActions();
            } else {
                throw new Error(data.error || 'Error cargando perfil');
            }
        } catch (error) {
            console.error('❌ [360°] Error cargando perfil:', error);
            showSelfViewError('Error al cargar tu perfil: ' + error.message);
        }
    }

    function showSelfViewError(message) {
        const container = document.querySelector('.e360-content');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px; color: #e0e0e0;">
                    <div style="font-size: 4em; margin-bottom: 20px;">⚠️</div>
                    <h3 style="color: #e74c3c;">Error</h3>
                    <p style="color: #999;">${message}</p>
                    <button onclick="window.MiEspacio?.init()" style="
                        margin-top: 20px; padding: 12px 24px;
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        color: white; border: none; border-radius: 8px; cursor: pointer;
                    ">Volver a Mi Espacio</button>
                </div>
            `;
        }
    }

    // =========================================================================
    // RENDERIZADO DE UI
    // =========================================================================

    function renderModuleUI() {
        // Inyectar estilos en el head (evita que CSS se muestre como texto)
        injectStyles();

        // Usar mainContent como contenedor estándar del sistema
        const container = document.getElementById('mainContent');
        if (!container) {
            console.error('❌ [360°] Contenedor mainContent no encontrado');
            return;
        }

        container.innerHTML = `
            <div id="employee-360-container" class="employee-360-wrapper">
                <!-- Header del módulo -->
                <div class="e360-header">
                    <div class="e360-header-left">
                        <h2><i class="fas fa-user-circle"></i> Expediente 360°</h2>
                        <span class="e360-subtitle">Análisis Integral de Empleados con IA</span>
                    </div>
                    <div class="e360-header-right">
                        <div class="e360-tech-badges">
                            <span class="badge badge-ai" title="Análisis con Inteligencia Artificial">
                                <i class="fas fa-brain"></i> Ollama + Llama 3.1
                            </span>
                            <span class="badge badge-scoring" title="Sistema de Scoring">
                                <i class="fas fa-chart-line"></i> Scoring
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Selector de empleado y acciones -->
                <div class="e360-controls">
                    <div class="e360-employee-selector">
                        <label for="e360-employee-select">Seleccionar Empleado:</label>
                        <select id="e360-employee-select" class="form-control">
                            <option value="">-- Seleccione un empleado --</option>
                        </select>
                    </div>

                    <div class="e360-date-range">
                        <label>Período de análisis:</label>
                        <div class="date-inputs">
                            <input type="date" id="e360-date-from" class="form-control">
                            <span>a</span>
                            <input type="date" id="e360-date-to" class="form-control">
                        </div>
                    </div>

                    <div class="e360-actions">
                        <button id="btn-generate-report" class="btn btn-primary" disabled>
                            <i class="fas fa-file-alt"></i> Generar Expediente
                        </button>
                        <button id="btn-compare-employees" class="btn btn-secondary" disabled>
                            <i class="fas fa-users"></i> Comparar (<span id="compare-count">0</span>)
                        </button>
                        <button id="btn-export-pdf" class="btn btn-success" disabled>
                            <i class="fas fa-file-pdf"></i> Exportar PDF
                        </button>
                    </div>
                </div>

                <!-- Lista de empleados para comparación -->
                <div id="e360-comparison-list" class="e360-comparison-list" style="display: none;">
                    <h4>Empleados seleccionados para comparar:</h4>
                    <div id="comparison-chips"></div>
                    <button id="btn-clear-comparison" class="btn btn-sm btn-outline-danger">
                        <i class="fas fa-times"></i> Limpiar selección
                    </button>
                </div>

                <!-- Contenido principal - Las tabs se generan al crear el reporte -->
                <div class="e360-content">
                    <!-- Placeholder inicial -->
                    <div id="e360-placeholder" class="e360-placeholder">
                        <i class="fas fa-user-tie fa-5x"></i>
                        <h3>Seleccione un empleado</h3>
                        <p>Elija un empleado de la lista para generar su expediente 360° completo</p>
                        <div class="e360-features">
                            <div class="feature">
                                <i class="fas fa-chart-pie"></i>
                                <span>Scoring integral</span>
                            </div>
                            <div class="feature">
                                <i class="fas fa-brain"></i>
                                <span>Análisis con IA</span>
                            </div>
                            <div class="feature">
                                <i class="fas fa-stream"></i>
                                <span>Timeline unificado</span>
                            </div>
                            <div class="feature">
                                <i class="fas fa-file-pdf"></i>
                                <span>Exportación PDF</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // =========================================================================
    // CARGA DE DATOS
    // =========================================================================

    async function loadEmployeesList() {
        try {
            const response = await fetch(`${API_BASE}/dashboard`, {
                headers: getAuthHeaders()
            });

            if (!response.ok) throw new Error('Error cargando empleados');

            const data = await response.json();

            if (data.success && data.data.employees) {
                employeesList = data.data.employees;
                populateEmployeeSelect();
            }
        } catch (error) {
            console.error('❌ [360°] Error cargando lista:', error);
            showNotification('Error cargando lista de empleados', 'error');
        }
    }

    function populateEmployeeSelect() {
        const select = document.getElementById('e360-employee-select');
        if (!select) return;

        select.innerHTML = '<option value="">-- Seleccione un empleado --</option>';

        employeesList.forEach(emp => {
            const option = document.createElement('option');
            option.value = emp.id;
            option.textContent = `${emp.name} (${emp.employeeId || 'Sin ID'})`;
            select.appendChild(option);
        });
    }

    async function loadEmployeeReport(userId, options = {}) {
        showLoading();

        try {
            const params = new URLSearchParams();
            if (options.dateFrom) params.append('dateFrom', options.dateFrom);
            if (options.dateTo) params.append('dateTo', options.dateTo);
            params.append('includeAI', options.includeAI !== false ? 'true' : 'false');

            const response = await fetch(`${API_BASE}/${userId}/report?${params}`, {
                headers: getAuthHeaders()
            });

            if (!response.ok) throw new Error('Error cargando expediente');

            const data = await response.json();

            if (data.success) {
                currentReport = data.data;
                currentEmployee = userId;
                renderReport(data.data);
                enableActions();
            }
        } catch (error) {
            console.error('❌ [360°] Error cargando reporte:', error);
            showNotification('Error cargando expediente', 'error');
            showPlaceholder();
        }
    }

    // =========================================================================
    // RENDERIZADO DEL REPORTE
    // =========================================================================

    function renderReport(report) {
        // Recrear estructura de tabs (necesario porque showLoading() destruye el contenido)
        const container = document.querySelector('.e360-content');
        if (container) {
            container.innerHTML = `
                <!-- Placeholder inicial -->
                <div id="e360-placeholder" class="e360-placeholder" style="display: none;">
                    <i class="fas fa-user-circle" style="font-size: 64px; opacity: 0.3;"></i>
                    <p>Selecciona un empleado para ver su expediente 360°</p>
                </div>

                <!-- Tabs de navegación - EXPEDIENTE 360° COMPLETO -->
                <div class="e360-tabs">
                    <div class="e360-tab active" data-tab="overview">
                        <i class="fas fa-chart-pie"></i> Resumen
                    </div>
                    <div class="e360-tab" data-tab="personal">
                        <i class="fas fa-user-circle"></i> Personal
                    </div>
                    <div class="e360-tab" data-tab="laboral">
                        <i class="fas fa-briefcase"></i> Laboral
                    </div>
                    <div class="e360-tab" data-tab="attendance">
                        <i class="fas fa-clock"></i> Asistencia
                    </div>
                    <div class="e360-tab" data-tab="discipline">
                        <i class="fas fa-gavel"></i> Disciplina
                    </div>
                    <div class="e360-tab" data-tab="training">
                        <i class="fas fa-graduation-cap"></i> Capacitación
                    </div>
                    <div class="e360-tab" data-tab="medical">
                        <i class="fas fa-heartbeat"></i> Médico
                    </div>
                    <div class="e360-tab" data-tab="documents">
                        <i class="fas fa-folder-open"></i> Documentos
                    </div>
                    <div class="e360-tab" data-tab="timeline">
                        <i class="fas fa-history"></i> Timeline
                    </div>
                    <div class="e360-tab" data-tab="ai-analysis">
                        <i class="fas fa-robot"></i> IA
                    </div>
                    <div class="e360-tab" data-tab="biometric">
                        <i class="fas fa-brain"></i> Biométrico
                    </div>
                    <div class="e360-tab" data-tab="compatibility">
                        <i class="fas fa-people-arrows"></i> Reemplazos
                    </div>
                    <div class="e360-tab" data-tab="hour-bank">
                        <i class="fas fa-piggy-bank"></i> Banco Horas
                    </div>
                </div>

                <!-- Contenido de tabs - EXPEDIENTE 360° COMPLETO -->
                <div id="tab-overview" class="e360-tab-content" style="display: none;"></div>
                <div id="tab-personal" class="e360-tab-content" style="display: none;"></div>
                <div id="tab-laboral" class="e360-tab-content" style="display: none;"></div>
                <div id="tab-attendance" class="e360-tab-content" style="display: none;"></div>
                <div id="tab-discipline" class="e360-tab-content" style="display: none;"></div>
                <div id="tab-training" class="e360-tab-content" style="display: none;"></div>
                <div id="tab-medical" class="e360-tab-content" style="display: none;"></div>
                <div id="tab-documents" class="e360-tab-content" style="display: none;"></div>
                <div id="tab-timeline" class="e360-tab-content" style="display: none;"></div>
                <div id="tab-ai-analysis" class="e360-tab-content" style="display: none;"></div>
                <div id="tab-biometric" class="e360-tab-content" style="display: none;"></div>
                <div id="tab-compatibility" class="e360-tab-content" style="display: none;"></div>
                <div id="tab-hour-bank" class="e360-tab-content" style="display: none;"></div>
            `;

            // Reasignar event listeners a las tabs
            document.querySelectorAll('.e360-tab').forEach(tab => {
                tab.addEventListener('click', function() {
                    showTab(this.dataset.tab);
                });
            });
        }

        // Renderizar cada tab - EXPEDIENTE 360° COMPLETO
        renderOverviewTab(report);
        renderPersonalTab(report);      // NUEVO: Tab Personal Completo
        renderLaboralTab(report);       // NUEVO: Tab Laboral Completo
        renderAttendanceTab(report);
        renderDisciplineTab(report);
        renderTrainingTab(report);
        renderMedicalTab(report);
        renderDocumentsTab(report);     // NUEVO: Tab Documentos
        renderTimelineTab(report);
        renderAIAnalysisTab(report);
        renderBiometricTab(report);        // ENTERPRISE: Análisis Biométrico Emocional
        renderCompatibilityTab(report);    // ENTERPRISE: Compatibilidad y Reemplazos
        renderHourBankTab(report);         // ENTERPRISE: Banco de Horas

        // Mostrar tab activa
        showTab('overview');
    }

    function renderOverviewTab(report) {
        const container = document.getElementById('tab-overview');
        if (!container) return;
        const emp = report.employee;
        const scoring = report.scoring;
        const attendance = report.sections.attendance;
        const sanctions = report.sections.sanctions;
        const training = report.sections.training;
        const vacations = report.sections.vacations;
        const flightRisk = report.flightRisk || {};
        const behaviorPatterns = report.behaviorPatterns || [];

        container.innerHTML = `
            <!-- ROW 1: Scoring + Flight Risk Side by Side -->
            <div class="row mb-4">
                <div class="col-md-8">
                    <!-- Scoring Principal con 6 Dimensiones -->
                    <div class="scoring-card">
                        <div class="scoring-main">
                            <div class="scoring-circle" style="border-color: ${scoring.grade?.color || '#fff'}">
                                <div class="scoring-value">${scoring.total}</div>
                                <div class="scoring-label">de 100</div>
                                <div style="font-size: 1.2rem; font-weight: bold;">${scoring.grade?.letter || 'N/A'}</div>
                            </div>
                            <div class="scoring-breakdown">
                                <div class="scoring-category">
                                    <span class="scoring-category-name">Asistencia</span>
                                    <div class="scoring-bar">
                                        <div class="scoring-bar-fill" style="width: ${scoring.categories?.attendance?.score || 0}%"></div>
                                    </div>
                                    <span class="scoring-category-value">${scoring.categories?.attendance?.score || 0}</span>
                                </div>
                                <div class="scoring-category">
                                    <span class="scoring-category-name">Puntualidad</span>
                                    <div class="scoring-bar">
                                        <div class="scoring-bar-fill" style="width: ${scoring.categories?.punctuality?.score || 0}%"></div>
                                    </div>
                                    <span class="scoring-category-value">${scoring.categories?.punctuality?.score || 0}</span>
                                </div>
                                <div class="scoring-category">
                                    <span class="scoring-category-name">Disciplina</span>
                                    <div class="scoring-bar">
                                        <div class="scoring-bar-fill" style="width: ${scoring.categories?.discipline?.score || 0}%"></div>
                                    </div>
                                    <span class="scoring-category-value">${scoring.categories?.discipline?.score || 0}</span>
                                </div>
                                <div class="scoring-category">
                                    <span class="scoring-category-name">Capacitación</span>
                                    <div class="scoring-bar">
                                        <div class="scoring-bar-fill" style="width: ${scoring.categories?.training?.score || 0}%"></div>
                                    </div>
                                    <span class="scoring-category-value">${scoring.categories?.training?.score || 0}</span>
                                </div>
                                <div class="scoring-category">
                                    <span class="scoring-category-name">Estabilidad</span>
                                    <div class="scoring-bar">
                                        <div class="scoring-bar-fill" style="width: ${scoring.categories?.stability?.score || 0}%"></div>
                                    </div>
                                    <span class="scoring-category-value">${scoring.categories?.stability?.score || 0}</span>
                                </div>
                                <div class="scoring-category">
                                    <span class="scoring-category-name">Salud</span>
                                    <div class="scoring-bar">
                                        <div class="scoring-bar-fill" style="width: ${scoring.categories?.health?.score || 0}%"></div>
                                    </div>
                                    <span class="scoring-category-value">${scoring.categories?.health?.score || 0}</span>
                                </div>
                            </div>
                        </div>
                        <div style="text-align: center; opacity: 0.9;">
                            <strong>Grado:</strong> ${scoring.grade?.letter || 'N/A'} - ${scoring.grade?.label || ''} |
                            <strong>Tendencia:</strong> ${scoring.trend || 'Estable'}
                            ${scoring.additionalRolesBonus?.applied ? `| <strong>Bonus Roles:</strong> +${scoring.additionalRolesBonus.totalBonusPercent}` : ''}
                        </div>
                    </div>
                </div>

                <div class="col-md-4">
                    <!-- Flight Risk Meter -->
                    <div class="card h-100" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white;">
                        <div class="card-header" style="background: transparent; border-bottom: 1px solid rgba(255,255,255,0.1);">
                            <i class="fas fa-running"></i> Índice de Riesgo de Fuga
                        </div>
                        <div class="card-body text-center">
                            <div style="position: relative; width: 120px; height: 120px; margin: 0 auto 15px;">
                                <svg viewBox="0 0 36 36" style="transform: rotate(-90deg);">
                                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                        fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="3"/>
                                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                        fill="none" stroke="${flightRisk.color || '#22c55e'}" stroke-width="3"
                                        stroke-dasharray="${flightRisk.score || 0}, 100"/>
                                </svg>
                                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center;">
                                    <div style="font-size: 1.8rem; font-weight: bold;">${flightRisk.score || 0}%</div>
                                    <div style="font-size: 0.7rem; opacity: 0.8;">${flightRisk.label || 'BAJO'}</div>
                                </div>
                            </div>
                            <p style="font-size: 0.85rem; opacity: 0.9; margin-bottom: 10px;">${flightRisk.insight || 'Sin datos suficientes'}</p>
                            ${flightRisk.factors && flightRisk.factors.length > 0 ? `
                                <div style="text-align: left; font-size: 0.75rem; background: rgba(255,255,255,0.1); padding: 10px; border-radius: 8px; max-height: 100px; overflow-y: auto;">
                                    ${flightRisk.factors.slice(0, 3).map(f => `
                                        <div style="margin-bottom: 5px;">
                                            <span style="color: ${f.status === 'critical' ? '#ef4444' : f.status === 'warning' ? '#f59e0b' : '#22c55e'};">●</span>
                                            ${f.factor}: +${f.impact}pts
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>

            <!-- ROW 2: Data Sheet Completo del Empleado -->
            <div class="card mb-4">
                <div class="card-header" style="background: #2c3e50; color: white;">
                    <i class="fas fa-id-card"></i> Data Sheet del Empleado
                </div>
                <div class="card-body">
                    <div class="row">
                        <!-- Foto y datos básicos -->
                        <div class="col-md-3 text-center">
                            <div class="employee-avatar" style="width: 120px; height: 120px; margin: 0 auto 15px;">
                                ${emp.photo ? `<img src="${emp.photo}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">` : '<i class="fas fa-user"></i>'}
                            </div>
                            <h5 class="mb-1">${emp.fullName || 'N/A'}</h5>
                            <p class="text-muted mb-0">${emp.position || emp.role || 'Sin cargo'}</p>
                            <span class="badge ${emp.isActive ? 'badge-success' : 'badge-danger'}">${emp.isActive ? 'Activo' : 'Inactivo'}</span>
                        </div>

                        <!-- Datos de Identificación y Personales -->
                        <div class="col-md-3">
                            <h6 class="text-primary"><i class="fas fa-fingerprint"></i> Identificación</h6>
                            <table class="table table-sm table-borderless">
                                <tr><td class="text-muted">ID Sistema:</td><td><strong>${emp.id || 'N/A'}</strong></td></tr>
                                <tr><td class="text-muted">Legajo:</td><td><strong>${emp.legajo || emp.employeeId || 'N/A'}</strong></td></tr>
                                <tr><td class="text-muted">DNI:</td><td><strong>${emp.dni || 'N/A'}</strong></td></tr>
                                <tr><td class="text-muted">CUIL:</td><td><strong>${emp.cuil || 'N/A'}</strong></td></tr>
                            </table>
                            <h6 class="text-primary mt-3"><i class="fas fa-user"></i> Datos Personales</h6>
                            <table class="table table-sm table-borderless">
                                <tr><td class="text-muted">Email:</td><td><strong>${emp.email || 'N/A'}</strong></td></tr>
                                <tr><td class="text-muted">Teléfono:</td><td><strong>${emp.phone || 'N/A'}</strong></td></tr>
                                <tr><td class="text-muted">Nacimiento:</td><td><strong>${formatDate(emp.birthDate) || 'N/A'}</strong></td></tr>
                                <tr><td class="text-muted">Edad:</td><td><strong>${emp.age ? emp.age + ' años' : 'N/A'}</strong></td></tr>
                            </table>
                        </div>

                        <!-- Datos Laborales -->
                        <div class="col-md-3">
                            <h6 class="text-primary"><i class="fas fa-briefcase"></i> Datos Laborales</h6>
                            <table class="table table-sm table-borderless">
                                <tr><td class="text-muted">Departamento:</td><td><strong>${emp.department?.name || 'Sin asignar'}</strong></td></tr>
                                <tr><td class="text-muted">Empresa:</td><td><strong>${emp.company?.name || 'N/A'}</strong></td></tr>
                                <tr><td class="text-muted">Ingreso:</td><td><strong>${formatDate(emp.hireDate) || 'N/A'}</strong></td></tr>
                                <tr><td class="text-muted">Antigüedad:</td><td><strong>${emp.tenure?.formatted || 'N/A'}</strong></td></tr>
                                <tr><td class="text-muted">Horario:</td><td><strong>${emp.workSchedule || 'Estándar'}</strong></td></tr>
                                <tr><td class="text-muted">Flex:</td><td><strong>${emp.hasFlexibleSchedule ? 'Sí' : 'No'}</strong></td></tr>
                            </table>
                            <h6 class="text-primary mt-3"><i class="fas fa-phone-alt"></i> Emergencia</h6>
                            <p class="mb-0"><small>${emp.emergencyContact || 'No registrado'}</small></p>
                        </div>

                        <!-- Permisos y Biométricos -->
                        <div class="col-md-3">
                            <h6 class="text-primary"><i class="fas fa-key"></i> Autorizaciones</h6>
                            <table class="table table-sm table-borderless">
                                <tr><td class="text-muted">App Móvil:</td><td>${emp.canUseMobileApp ? '<i class="fas fa-check text-success"></i>' : '<i class="fas fa-times text-danger"></i>'}</td></tr>
                                <tr><td class="text-muted">Kiosk:</td><td>${emp.canUseKiosk ? '<i class="fas fa-check text-success"></i>' : '<i class="fas fa-times text-danger"></i>'}</td></tr>
                                <tr><td class="text-muted">Auth Tardanzas:</td><td>${emp.canAuthorizeLateArrivals ? '<i class="fas fa-check text-success"></i>' : '<i class="fas fa-times text-danger"></i>'}</td></tr>
                            </table>
                            <h6 class="text-primary mt-3"><i class="fas fa-fingerprint"></i> Biométricos</h6>
                            <table class="table table-sm table-borderless">
                                <tr><td class="text-muted">Huella:</td><td>${emp.hasFingerprint ? '<i class="fas fa-check text-success"></i>' : '<i class="fas fa-times text-danger"></i>'}</td></tr>
                                <tr><td class="text-muted">Rostro:</td><td>${emp.hasFacialData ? '<i class="fas fa-check text-success"></i>' : '<i class="fas fa-times text-danger"></i>'}</td></tr>
                                <tr><td class="text-muted">2FA:</td><td>${emp.twoFactorEnabled ? '<i class="fas fa-check text-success"></i>' : '<i class="fas fa-times text-danger"></i>'}</td></tr>
                            </table>
                            ${emp.additionalRoles && emp.additionalRoles.length > 0 ? `
                                <h6 class="text-primary mt-3"><i class="fas fa-user-tag"></i> Roles Adicionales</h6>
                                <div>${emp.additionalRoles.map(r => `<span class="badge badge-info mr-1">${r.roleName || r.role_key}</span>`).join('')}</div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>

            <!-- ROW 3: Patrones de Comportamiento -->
            ${behaviorPatterns.length > 0 ? `
                <div class="card mb-4">
                    <div class="card-header" style="background: #8e44ad; color: white;">
                        <i class="fas fa-brain"></i> Patrones de Comportamiento Detectados
                    </div>
                    <div class="card-body">
                        <div class="row">
                            ${behaviorPatterns.map(pattern => `
                                <div class="col-md-3 mb-3">
                                    <div class="card h-100" style="border-left: 4px solid ${pattern.status === 'critical' ? '#dc3545' : pattern.status === 'warning' ? '#ffc107' : '#28a745'};">
                                        <div class="card-body">
                                            <h6 class="card-title">${pattern.name}</h6>
                                            <span class="badge ${pattern.status === 'critical' ? 'badge-danger' : pattern.status === 'warning' ? 'badge-warning' : 'badge-success'}">${pattern.statusLabel}</span>
                                            <p class="card-text mt-2 small text-muted">${pattern.stats}</p>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            ` : ''}

            <!-- ROW 4: Stats Grid -->
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon green"><i class="fas fa-check-circle"></i></div>
                    <div class="stat-value">${attendance.attendanceRate || 0}%</div>
                    <div class="stat-label">Tasa de Asistencia</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon blue"><i class="fas fa-clock"></i></div>
                    <div class="stat-value">${attendance.punctualityRate || 0}%</div>
                    <div class="stat-label">Puntualidad</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon yellow"><i class="fas fa-exclamation-triangle"></i></div>
                    <div class="stat-value">${sanctions.total || 0}</div>
                    <div class="stat-label">Sanciones</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon green"><i class="fas fa-graduation-cap"></i></div>
                    <div class="stat-value">${training.completed || 0}</div>
                    <div class="stat-label">Capacitaciones</div>
                </div>
            </div>

            <!-- ROW 5: Resumen rápido -->
            <div class="row">
                <div class="col-md-6">
                    <div class="card mb-3">
                        <div class="card-header"><i class="fas fa-chart-bar"></i> Resumen de Asistencia</div>
                        <div class="card-body">
                            <p><strong>Días trabajados:</strong> ${attendance.totalDays || 0}</p>
                            <p><strong>Llegadas tarde:</strong> ${attendance.lateArrivals || 0}</p>
                            <p><strong>Salidas tempranas:</strong> ${attendance.earlyDepartures || 0}</p>
                            <p><strong>Ausencias:</strong> ${attendance.absences || 0}</p>
                            <p><strong>Horas trabajadas:</strong> ${attendance.totalHoursWorked || 0}h</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card mb-3">
                        <div class="card-header"><i class="fas fa-umbrella-beach"></i> Vacaciones y Licencias</div>
                        <div class="card-body">
                            <p><strong>Días aprobados:</strong> ${vacations.totalDaysApproved || 0}</p>
                            <p><strong>Días pendientes:</strong> ${vacations.pending || 0}</p>
                            <p><strong>Solicitudes:</strong> ${vacations.totalRequests || 0}</p>
                            <p><strong>Rechazadas:</strong> ${vacations.rejected || 0}</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ROW 6: Flight Risk Recommendations -->
            ${flightRisk.recommendations && flightRisk.recommendations.length > 0 ? `
                <div class="card mb-4">
                    <div class="card-header" style="background: #e74c3c; color: white;">
                        <i class="fas fa-lightbulb"></i> Recomendaciones de Retención
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-sm">
                                <thead>
                                    <tr><th>Prioridad</th><th>Acción</th><th>Plazo</th></tr>
                                </thead>
                                <tbody>
                                    ${flightRisk.recommendations.map(r => `
                                        <tr>
                                            <td><span class="badge ${r.priority === 'ALTA' ? 'badge-danger' : r.priority === 'MEDIA' ? 'badge-warning' : 'badge-info'}">${r.priority}</span></td>
                                            <td>${r.action}</td>
                                            <td>${r.timeframe}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ` : ''}

            <!-- Metadata del reporte -->
            <div class="text-muted text-center" style="font-size: 0.8rem;">
                <i class="fas fa-info-circle"></i> Expediente generado: ${formatDateTime(report.generatedAt)} |
                Período: ${formatDate(report.period?.from)} - ${formatDate(report.period?.to)} |
                Completitud de datos: ${report.metadata?.dataCompleteness || 0}% |
                Versión: ${report.metadata?.version || '1.0'}
            </div>
        `;
    }

    function renderAttendanceTab(report) {
        const container = document.getElementById('tab-attendance');
        if (!container) return; // Guard against missing DOM element
        const attendance = report.sections.attendance;

        container.innerHTML = `
            <h3><i class="fas fa-clock"></i> Análisis de Asistencia</h3>

            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon green"><i class="fas fa-calendar-check"></i></div>
                    <div class="stat-value">${attendance.totalDays || 0}</div>
                    <div class="stat-label">Días Trabajados</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon green"><i class="fas fa-percentage"></i></div>
                    <div class="stat-value">${attendance.attendanceRate || 0}%</div>
                    <div class="stat-label">Tasa de Asistencia</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon blue"><i class="fas fa-clock"></i></div>
                    <div class="stat-value">${attendance.punctualityRate || 0}%</div>
                    <div class="stat-label">Puntualidad</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon yellow"><i class="fas fa-hourglass-half"></i></div>
                    <div class="stat-value">${attendance.avgHoursPerDay || 0}h</div>
                    <div class="stat-label">Promedio Diario</div>
                </div>
            </div>

            <div class="row mt-4">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header bg-warning text-dark">
                            <i class="fas fa-exclamation-circle"></i> Llegadas Tardías
                        </div>
                        <div class="card-body">
                            <h2 class="text-center">${attendance.lateArrivals || 0}</h2>
                            <p class="text-center text-muted">veces en el período</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header bg-info text-white">
                            <i class="fas fa-sign-out-alt"></i> Salidas Tempranas
                        </div>
                        <div class="card-body">
                            <h2 class="text-center">${attendance.earlyDepartures || 0}</h2>
                            <p class="text-center text-muted">veces en el período</p>
                        </div>
                    </div>
                </div>
            </div>

            ${attendance.patterns ? `
                <div class="card mt-4">
                    <div class="card-header">
                        <i class="fas fa-chart-line"></i> Patrones Detectados
                    </div>
                    <div class="card-body">
                        <ul>
                            ${attendance.patterns.worstDayForLate ?
                                `<li><strong>Día con más tardanzas:</strong> ${attendance.patterns.worstDayForLate.day} (${attendance.patterns.worstDayForLate.count} veces)</li>` : ''}
                            ${attendance.patterns.lateByDayOfWeek ?
                                Object.entries(attendance.patterns.lateByDayOfWeek)
                                    .filter(([_, count]) => count > 0)
                                    .map(([day, count]) => `<li>Tardanzas los ${day}: ${count}</li>`)
                                    .join('') : ''}
                        </ul>
                    </div>
                </div>
            ` : ''}
        `;
    }

    function renderDisciplineTab(report) {
        const container = document.getElementById('tab-discipline');
        if (!container) return; // Guard against missing DOM element
        const sanctions = report.sections.sanctions;

        container.innerHTML = `
            <h3><i class="fas fa-gavel"></i> Historial Disciplinario</h3>

            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon ${sanctions.total > 0 ? 'red' : 'green'}">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="stat-value">${sanctions.total || 0}</div>
                    <div class="stat-label">Total Sanciones</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon yellow">
                        <i class="fas fa-file-alt"></i>
                    </div>
                    <div class="stat-value">${sanctions.severity?.written || 0}</div>
                    <div class="stat-label">Amonestaciones Escritas</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon red">
                        <i class="fas fa-ban"></i>
                    </div>
                    <div class="stat-value">${sanctions.severity?.suspension || 0}</div>
                    <div class="stat-label">Suspensiones</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon blue">
                        <i class="fas fa-comment"></i>
                    </div>
                    <div class="stat-value">${sanctions.severity?.verbal || 0}</div>
                    <div class="stat-label">Amonestaciones Verbales</div>
                </div>
            </div>

            ${sanctions.list && sanctions.list.length > 0 ? `
                <div class="card mt-4">
                    <div class="card-header">
                        <i class="fas fa-list"></i> Detalle de Sanciones
                    </div>
                    <div class="card-body">
                        <table class="table table-striped">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Tipo</th>
                                    <th>Motivo</th>
                                    <th>Aplicado por</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${sanctions.list.map(s => `
                                    <tr>
                                        <td>${formatDate(s.date)}</td>
                                        <td><span class="badge badge-${getSanctionBadgeClass(s.type)}">${s.type}</span></td>
                                        <td>${s.reason}</td>
                                        <td>${s.appliedBy || 'Sistema'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            ` : `
                <div class="alert alert-success mt-4">
                    <i class="fas fa-check-circle"></i> Este empleado no tiene sanciones registradas.
                </div>
            `}
        `;
    }

    function renderTrainingTab(report) {
        const container = document.getElementById('tab-training');
        if (!container) return; // Guard against missing DOM element
        const training = report.sections.training;

        container.innerHTML = `
            <h3><i class="fas fa-graduation-cap"></i> Capacitaciones</h3>

            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon green">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="stat-value">${training.completed || 0}</div>
                    <div class="stat-label">Completadas</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon yellow">
                        <i class="fas fa-hourglass-half"></i>
                    </div>
                    <div class="stat-value">${training.pending || 0}</div>
                    <div class="stat-label">Pendientes</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon blue">
                        <i class="fas fa-clock"></i>
                    </div>
                    <div class="stat-value">${training.totalHours || 0}h</div>
                    <div class="stat-label">Horas Totales</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon green">
                        <i class="fas fa-certificate"></i>
                    </div>
                    <div class="stat-value">${training.certifications || 0}</div>
                    <div class="stat-label">Certificaciones</div>
                </div>
            </div>

            ${training.list && training.list.length > 0 ? `
                <div class="card mt-4">
                    <div class="card-header">
                        <i class="fas fa-list"></i> Historial de Capacitaciones
                    </div>
                    <div class="card-body">
                        <table class="table table-striped">
                            <thead>
                                <tr>
                                    <th>Capacitación</th>
                                    <th>Fecha</th>
                                    <th>Duración</th>
                                    <th>Estado</th>
                                    <th>Calificación</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${training.list.map(t => `
                                    <tr>
                                        <td>${t.name}</td>
                                        <td>${formatDate(t.date)}</td>
                                        <td>${t.duration || 'N/A'}</td>
                                        <td><span class="badge badge-${t.status === 'completed' ? 'success' : 'warning'}">${t.status}</span></td>
                                        <td>${t.score || 'N/A'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            ` : `
                <div class="alert alert-info mt-4">
                    <i class="fas fa-info-circle"></i> No hay capacitaciones registradas para este empleado.
                </div>
            `}
        `;
    }

    function renderMedicalTab(report) {
        const container = document.getElementById('tab-medical');
        if (!container) return; // Guard against missing DOM element
        const medical = report.sections.medical;

        container.innerHTML = `
            <h3><i class="fas fa-heartbeat"></i> Historial Médico</h3>

            <div class="alert alert-info">
                <i class="fas fa-shield-alt"></i>
                <strong>Información confidencial:</strong> Este registro es de acceso restringido según normativas de privacidad.
            </div>

            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon blue">
                        <i class="fas fa-stethoscope"></i>
                    </div>
                    <div class="stat-value">${medical.totalRecords || 0}</div>
                    <div class="stat-label">Registros Médicos</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon yellow">
                        <i class="fas fa-bed"></i>
                    </div>
                    <div class="stat-value">${medical.totalDaysOff || 0}</div>
                    <div class="stat-label">Días de Licencia</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon green">
                        <i class="fas fa-clipboard-check"></i>
                    </div>
                    <div class="stat-value">${medical.examsUpToDate ? 'Sí' : 'No'}</div>
                    <div class="stat-label">Exámenes al Día</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon ${medical.aptForWork ? 'green' : 'red'}">
                        <i class="fas fa-user-check"></i>
                    </div>
                    <div class="stat-value">${medical.aptForWork ? 'Apto' : 'Revisar'}</div>
                    <div class="stat-label">Estado Laboral</div>
                </div>
            </div>

            ${medical.summary ? `
                <div class="card mt-4">
                    <div class="card-header">
                        <i class="fas fa-notes-medical"></i> Resumen Médico
                    </div>
                    <div class="card-body">
                        <p>${medical.summary}</p>
                    </div>
                </div>
            ` : ''}
        `;
    }

    function renderTimelineTab(report) {
        const container = document.getElementById('tab-timeline');
        if (!container) return; // Guard against missing DOM element
        const timeline = report.timeline || [];

        container.innerHTML = `
            <h3><i class="fas fa-history"></i> Timeline de Eventos</h3>

            ${timeline.length > 0 ? `
                <div class="timeline">
                    ${timeline.map(event => `
                        <div class="timeline-item ${event.type}">
                            <div class="timeline-date">${formatDateTime(event.date)}</div>
                            <div class="timeline-title">${event.title}</div>
                            <div class="timeline-description">${event.description}</div>
                        </div>
                    `).join('')}
                </div>
            ` : `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i> No hay eventos registrados en el timeline.
                </div>
            `}
        `;
    }

    function renderAIAnalysisTab(report) {
        const container = document.getElementById('tab-ai-analysis');
        if (!container) return; // Guard against missing DOM element
        const ai = report.aiAnalysis;

        if (!ai) {
            container.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-robot"></i>
                    <strong>Análisis IA no disponible</strong><br>
                    El servicio de Ollama no está activo o no se pudo generar el análisis.
                    <br><br>
                    <button class="btn btn-primary btn-sm" onclick="window.Employee360.regenerateAIAnalysis()">
                        <i class="fas fa-sync"></i> Intentar Nuevamente
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="ai-analysis">
                <div class="ai-header">
                    <i class="fas fa-robot"></i>
                    <div>
                        <h3>Análisis con Inteligencia Artificial</h3>
                        <span class="badge">Ollama + Llama 3.1</span>
                    </div>
                </div>

                <div class="ai-content">
                    ${formatAIContent(ai.analysis)}
                </div>

                <div class="ai-metadata">
                    <span><i class="fas fa-clock"></i> Generado: ${formatDateTime(ai.generatedAt)}</span>
                    <span><i class="fas fa-microchip"></i> Modelo: ${ai.model || 'llama3.1:8b'}</span>
                    <span><i class="fas fa-chart-line"></i> Confianza: ${ai.confidence || 'Alta'}</span>
                </div>
            </div>
        `;
    }

    // =========================================================================
    // NUEVOS TABS - EXPEDIENTE 360° COMPLETO v3.0
    // =========================================================================

    /**
     * Tab Personal: Grupo Familiar, Educación, Consentimientos
     */
    function renderPersonalTab(report) {
        const container = document.getElementById('tab-personal');
        if (!container) return;

        const userData = report.completeUserData || {};
        const family = userData.family || {};
        const education = userData.education || {};
        const consents = userData.consents || {};
        const emp = report.employee || {};

        container.innerHTML = `
            <h4 class="mb-4"><i class="fas fa-user-circle"></i> Información Personal Completa</h4>

            <!-- Grupo Familiar -->
            <div class="card mb-4">
                <div class="card-header" style="background: #3498db; color: white;">
                    <i class="fas fa-users"></i> Grupo Familiar
                    <span class="badge badge-light float-right">${family.totalMembers || 0} miembros</span>
                </div>
                <div class="card-body">
                    <div class="row">
                        <!-- Estado Civil -->
                        <div class="col-md-4">
                            <h6 class="text-primary"><i class="fas fa-ring"></i> Estado Civil</h6>
                            ${family.maritalStatus ? `
                                <table class="table table-sm table-borderless">
                                    <tr><td class="text-muted">Estado:</td><td><strong>${family.maritalStatus.status || 'No especificado'}</strong></td></tr>
                                    <tr><td class="text-muted">Desde:</td><td>${formatDate(family.maritalStatus.since) || 'N/A'}</td></tr>
                                    ${family.maritalStatus.spouse_name ? `<tr><td class="text-muted">Cónyuge:</td><td>${family.maritalStatus.spouse_name}</td></tr>` : ''}
                                </table>
                            ` : '<p class="text-muted">Sin información registrada</p>'}
                        </div>

                        <!-- Hijos -->
                        <div class="col-md-4">
                            <h6 class="text-primary"><i class="fas fa-baby"></i> Hijos (${family.children?.length || 0})</h6>
                            ${family.children && family.children.length > 0 ? `
                                <ul class="list-unstyled">
                                    ${family.children.map(child => `
                                        <li class="mb-2">
                                            <i class="fas fa-child text-info"></i>
                                            <strong>${child.name || 'Sin nombre'}</strong>
                                            ${child.birth_date ? `<small class="text-muted">(${calculateAge(child.birth_date)} años)</small>` : ''}
                                        </li>
                                    `).join('')}
                                </ul>
                            ` : '<p class="text-muted">Sin hijos registrados</p>'}
                        </div>

                        <!-- Otros familiares -->
                        <div class="col-md-4">
                            <h6 class="text-primary"><i class="fas fa-user-friends"></i> Otros Familiares</h6>
                            ${family.familyMembers && family.familyMembers.length > 0 ? `
                                <ul class="list-unstyled">
                                    ${family.familyMembers.slice(0, 5).map(member => `
                                        <li class="mb-1">
                                            <i class="fas fa-user text-secondary"></i>
                                            ${member.name || 'Sin nombre'}
                                            <small class="text-muted">(${member.relationship || 'familiar'})</small>
                                        </li>
                                    `).join('')}
                                </ul>
                                ${family.familyMembers.length > 5 ? `<small class="text-muted">y ${family.familyMembers.length - 5} más...</small>` : ''}
                            ` : '<p class="text-muted">Sin familiares registrados</p>'}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Educación -->
            <div class="card mb-4">
                <div class="card-header" style="background: #9b59b6; color: white;">
                    <i class="fas fa-graduation-cap"></i> Formación Académica
                    <span class="badge badge-light float-right">${education.totalRecords || 0} registros</span>
                </div>
                <div class="card-body">
                    ${education.education && education.education.length > 0 ? `
                        <div class="table-responsive">
                            <table class="table table-sm">
                                <thead class="thead-light">
                                    <tr>
                                        <th>Nivel</th>
                                        <th>Institución</th>
                                        <th>Título</th>
                                        <th>Estado</th>
                                        <th>Año</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${education.education.map(edu => `
                                        <tr>
                                            <td><span class="badge badge-info">${edu.level || edu.degree_type || 'N/A'}</span></td>
                                            <td>${edu.institution || 'N/A'}</td>
                                            <td>${edu.title || edu.degree_name || 'N/A'}</td>
                                            <td>
                                                ${edu.completed ?
                                                    '<span class="badge badge-success">Completo</span>' :
                                                    '<span class="badge badge-warning">En curso</span>'}
                                            </td>
                                            <td>${edu.graduation_year || edu.year_completed || 'N/A'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                        ${education.highestDegree ? `
                            <div class="alert alert-info mt-3 mb-0">
                                <i class="fas fa-award"></i> <strong>Máximo nivel alcanzado:</strong> ${education.highestDegree}
                            </div>
                        ` : ''}
                    ` : '<p class="text-muted text-center py-3">Sin formación académica registrada</p>'}
                </div>
            </div>

            <!-- Consentimientos -->
            <div class="card mb-4">
                <div class="card-header" style="background: #1abc9c; color: white;">
                    <i class="fas fa-check-circle"></i> Consentimientos y Autorizaciones
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-4 text-center">
                            ${(() => {
                                const details = consents.biometricConsentDetails;
                                const hasConsent = consents.hasBiometricConsent;
                                let bgClass = hasConsent ? 'bg-success' : 'bg-danger';
                                let expiryBadge = '';
                                let expiryInfo = '';

                                if (hasConsent && details) {
                                    if (details.expiryStatus === 'expired') {
                                        bgClass = 'bg-danger';
                                        expiryBadge = '<span class="badge bg-dark mt-1">VENCIDO</span>';
                                    } else if (details.expiryStatus === 'expiring_soon') {
                                        bgClass = 'bg-warning';
                                        expiryBadge = `<span class="badge bg-danger mt-1">Vence en ${details.daysUntilExpiry} días</span>`;
                                    }

                                    if (details.expiresAt) {
                                        const expiryDate = new Date(details.expiresAt).toLocaleDateString('es-AR');
                                        expiryInfo = `<small class="d-block mt-1 opacity-75">Vence: ${expiryDate}</small>`;
                                    }
                                }

                                return `
                                    <div class="p-3 ${bgClass} text-white rounded">
                                        <i class="fas fa-fingerprint fa-2x mb-2"></i>
                                        <h6>Biométrico</h6>
                                        <span>${hasConsent ? 'Autorizado' : 'No autorizado'}</span>
                                        ${expiryBadge}
                                        ${expiryInfo}
                                    </div>
                                `;
                            })()}
                        </div>
                        <div class="col-md-4 text-center">
                            <div class="p-3 ${consents.hasEmotionalAnalysisConsent ? 'bg-success' : 'bg-warning'} text-white rounded">
                                <i class="fas fa-brain fa-2x mb-2"></i>
                                <h6>Análisis Emocional</h6>
                                <span>${consents.hasEmotionalAnalysisConsent ? 'Autorizado' : 'No autorizado'}</span>
                            </div>
                        </div>
                        <div class="col-md-4 text-center">
                            <div class="p-3 ${emp.canUseMobileApp ? 'bg-success' : 'bg-secondary'} text-white rounded">
                                <i class="fas fa-mobile-alt fa-2x mb-2"></i>
                                <h6>App Móvil</h6>
                                <span>${emp.canUseMobileApp ? 'Habilitado' : 'Deshabilitado'}</span>
                            </div>
                        </div>
                    </div>
                    ${consents.consents && consents.consents.length > 0 ? `
                        <div class="mt-4">
                            <h6>Historial de Consentimientos:</h6>
                            <ul class="list-group">
                                ${consents.consents.slice(0, 5).map(c => `
                                    <li class="list-group-item d-flex justify-content-between align-items-center">
                                        <span><i class="fas fa-file-signature"></i> ${c.consent_type || c.type || 'Consentimiento'}</span>
                                        <small class="text-muted">${formatDate(c.granted_at || c.created_at)}</small>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            </div>

            <!-- Contacto de Emergencia -->
            <div class="card">
                <div class="card-header" style="background: #e74c3c; color: white;">
                    <i class="fas fa-phone-alt"></i> Contacto de Emergencia
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <p><strong>Contacto:</strong> ${emp.emergencyContact || 'No registrado'}</p>
                            <p><strong>Teléfono:</strong> ${emp.emergencyPhone || 'No registrado'}</p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>Relación:</strong> ${emp.emergencyRelation || 'No especificada'}</p>
                            <p><strong>Dirección:</strong> ${emp.address || 'No registrada'}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Tab Laboral: Historial, Salario, Turnos, Tareas, Permisos
     */
    function renderLaboralTab(report) {
        const container = document.getElementById('tab-laboral');
        if (!container) return;

        const userData = report.completeUserData || {};
        const workHistory = userData.previousWorkHistory || {};
        const salary = userData.salary || {};
        const shifts = userData.assignedShifts || {};
        const tasks = userData.tasks || {};
        const permissions = userData.permissionRequests || {};
        const unionLegal = userData.unionAndLegal || {};
        const emp = report.employee || {};

        container.innerHTML = `
            <h4 class="mb-4"><i class="fas fa-briefcase"></i> Información Laboral Completa</h4>

            <!-- Datos Laborales Actuales -->
            <div class="card mb-4">
                <div class="card-header" style="background: #2c3e50; color: white;">
                    <i class="fas fa-building"></i> Situación Laboral Actual
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-3">
                            <h6 class="text-primary">Posición</h6>
                            <p class="mb-1"><strong>${emp.position || emp.role || 'Sin cargo'}</strong></p>
                            <p class="text-muted">${emp.department?.name || 'Sin departamento'}</p>
                        </div>
                        <div class="col-md-3">
                            <h6 class="text-primary">Antigüedad</h6>
                            <p class="mb-1"><strong>${emp.tenure?.formatted || 'N/A'}</strong></p>
                            <p class="text-muted">Desde: ${formatDate(emp.hireDate)}</p>
                        </div>
                        <div class="col-md-3">
                            <h6 class="text-primary">Empresa</h6>
                            <p class="mb-1"><strong>${emp.company?.name || 'N/A'}</strong></p>
                            <p class="text-muted">ID: ${emp.companyId || 'N/A'}</p>
                        </div>
                        <div class="col-md-3">
                            <h6 class="text-primary">Tipo Contrato</h6>
                            <p class="mb-1"><strong>${emp.contractType || 'Tiempo completo'}</strong></p>
                            <p class="text-muted">${emp.workSchedule || 'Horario estándar'}</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Configuración Salarial -->
            <div class="card mb-4">
                <div class="card-header" style="background: #27ae60; color: white;">
                    <i class="fas fa-money-bill-wave"></i> Configuración Salarial
                    ${salary.hasConfiguredSalary ? '<span class="badge badge-light float-right">Configurado</span>' : ''}
                </div>
                <div class="card-body">
                    ${salary.currentSalary ? `
                        <div class="row">
                            <div class="col-md-3 text-center">
                                <div class="p-3 bg-light rounded">
                                    <h4 class="text-success mb-0">$${formatNumber(salary.currentSalary.base_salary || 0)}</h4>
                                    <small class="text-muted">Salario Base</small>
                                </div>
                            </div>
                            <div class="col-md-3 text-center">
                                <div class="p-3 bg-light rounded">
                                    <h4 class="text-info mb-0">${salary.currentSalary.currency || 'ARS'}</h4>
                                    <small class="text-muted">Moneda</small>
                                </div>
                            </div>
                            <div class="col-md-3 text-center">
                                <div class="p-3 bg-light rounded">
                                    <h4 class="text-primary mb-0">${salary.currentSalary.payment_frequency || 'Mensual'}</h4>
                                    <small class="text-muted">Frecuencia</small>
                                </div>
                            </div>
                            <div class="col-md-3 text-center">
                                <div class="p-3 bg-light rounded">
                                    <h4 class="text-warning mb-0">${formatDate(salary.currentSalary.effective_date) || 'N/A'}</h4>
                                    <small class="text-muted">Vigente desde</small>
                                </div>
                            </div>
                        </div>
                    ` : '<p class="text-muted text-center py-3">Sin configuración salarial registrada</p>'}
                </div>
            </div>

            <!-- Turnos Asignados -->
            <div class="card mb-4">
                <div class="card-header" style="background: #8e44ad; color: white;">
                    <i class="fas fa-clock"></i> Turnos Asignados
                    <span class="badge badge-light float-right">${shifts.totalAssigned || 0} turnos</span>
                </div>
                <div class="card-body">
                    ${shifts.shifts && shifts.shifts.length > 0 ? `
                        <div class="table-responsive">
                            <table class="table table-sm">
                                <thead class="thead-light">
                                    <tr>
                                        <th>Turno</th>
                                        <th>Horario</th>
                                        <th>Días</th>
                                        <th>Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${shifts.shifts.map(shift => `
                                        <tr ${shift.is_primary ? 'class="table-primary"' : ''}>
                                            <td>
                                                <strong>${shift.shift_name || shift.name || 'Sin nombre'}</strong>
                                                ${shift.is_primary ? '<span class="badge badge-primary ml-2">Principal</span>' : ''}
                                            </td>
                                            <td>${shift.start_time || 'N/A'} - ${shift.end_time || 'N/A'}</td>
                                            <td>${shift.days || 'L-V'}</td>
                                            <td>${shift.is_active !== false ?
                                                '<span class="badge badge-success">Activo</span>' :
                                                '<span class="badge badge-secondary">Inactivo</span>'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : '<p class="text-muted text-center py-3">Sin turnos asignados</p>'}
                </div>
            </div>

            <!-- Historial Laboral Previo -->
            <div class="card mb-4">
                <div class="card-header" style="background: #34495e; color: white;">
                    <i class="fas fa-history"></i> Historial Laboral Previo
                    <span class="badge badge-light float-right">${workHistory.totalRecords || 0} empleos anteriores</span>
                </div>
                <div class="card-body">
                    ${workHistory.previousJobs && workHistory.previousJobs.length > 0 ? `
                        <div class="timeline-vertical">
                            ${workHistory.previousJobs.map(job => `
                                <div class="timeline-item mb-3 pb-3 border-bottom">
                                    <div class="row">
                                        <div class="col-md-3">
                                            <strong>${job.company_name || 'Empresa'}</strong><br>
                                            <small class="text-muted">${formatDate(job.start_date)} - ${job.end_date ? formatDate(job.end_date) : 'Presente'}</small>
                                        </div>
                                        <div class="col-md-3">
                                            <span class="badge badge-info">${job.position || job.job_title || 'Cargo'}</span>
                                        </div>
                                        <div class="col-md-3">
                                            ${job.reason_for_leaving ? `<small>Salida: ${job.reason_for_leaving}</small>` : ''}
                                        </div>
                                        <div class="col-md-3">
                                            ${job.reference_contact ? `<small><i class="fas fa-phone"></i> ${job.reference_contact}</small>` : ''}
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        ${workHistory.totalExperience ? `
                            <div class="alert alert-info mt-3 mb-0">
                                <i class="fas fa-briefcase"></i> <strong>Experiencia total:</strong> ${workHistory.totalExperience}
                            </div>
                        ` : ''}
                    ` : '<p class="text-muted text-center py-3">Sin historial laboral previo registrado</p>'}
                </div>
            </div>

            <!-- Información Sindical y Legal -->
            <div class="card mb-4">
                <div class="card-header" style="background: #c0392b; color: white;">
                    <i class="fas fa-balance-scale"></i> Información Sindical y Legal
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <h6 class="text-primary"><i class="fas fa-users-cog"></i> Afiliación Sindical</h6>
                            ${unionLegal.unionAffiliation ? `
                                <table class="table table-sm table-borderless">
                                    <tr><td class="text-muted">Sindicato:</td><td><strong>${unionLegal.unionAffiliation.union_name || 'N/A'}</strong></td></tr>
                                    <tr><td class="text-muted">N° Afiliado:</td><td>${unionLegal.unionAffiliation.member_id || 'N/A'}</td></tr>
                                    <tr><td class="text-muted">Desde:</td><td>${formatDate(unionLegal.unionAffiliation.since)}</td></tr>
                                    <tr><td class="text-muted">Delegado:</td><td>${unionLegal.isDelegate ? '<span class="badge badge-warning">Sí</span>' : 'No'}</td></tr>
                                </table>
                            ` : '<p class="text-muted">No afiliado a sindicato</p>'}
                        </div>
                        <div class="col-md-6">
                            <h6 class="text-primary"><i class="fas fa-gavel"></i> Cuestiones Legales</h6>
                            ${unionLegal.legalIssues && unionLegal.legalIssues.length > 0 ? `
                                <ul class="list-group">
                                    ${unionLegal.legalIssues.slice(0, 3).map(issue => `
                                        <li class="list-group-item list-group-item-${issue.status === 'resolved' ? 'success' : 'warning'}">
                                            <strong>${issue.type || 'Caso'}</strong> - ${issue.status || 'En proceso'}
                                            <br><small>${issue.description || ''}</small>
                                        </li>
                                    `).join('')}
                                </ul>
                            ` : '<p class="text-muted">Sin cuestiones legales registradas</p>'}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tareas Asignadas -->
            <div class="card mb-4">
                <div class="card-header" style="background: #16a085; color: white;">
                    <i class="fas fa-tasks"></i> Tareas Asignadas
                    <span class="badge badge-light float-right">
                        ${tasks.pendingTasks || 0} pendientes / ${tasks.completedTasks || 0} completadas
                    </span>
                </div>
                <div class="card-body">
                    ${tasks.tasks && tasks.tasks.length > 0 ? `
                        <div class="row mb-3">
                            <div class="col-md-4 text-center">
                                <h4 class="text-warning">${tasks.pendingTasks || 0}</h4>
                                <small>Pendientes</small>
                            </div>
                            <div class="col-md-4 text-center">
                                <h4 class="text-success">${tasks.completedTasks || 0}</h4>
                                <small>Completadas</small>
                            </div>
                            <div class="col-md-4 text-center">
                                <h4 class="text-danger">${tasks.overdueTasks || 0}</h4>
                                <small>Vencidas</small>
                            </div>
                        </div>
                        <div class="table-responsive">
                            <table class="table table-sm">
                                <thead class="thead-light">
                                    <tr><th>Tarea</th><th>Prioridad</th><th>Fecha límite</th><th>Estado</th></tr>
                                </thead>
                                <tbody>
                                    ${tasks.tasks.slice(0, 10).map(task => `
                                        <tr class="${task.status === 'overdue' ? 'table-danger' : ''}">
                                            <td>${task.title || task.description || 'Tarea'}</td>
                                            <td><span class="badge badge-${task.priority === 'high' ? 'danger' : task.priority === 'medium' ? 'warning' : 'info'}">${task.priority || 'Normal'}</span></td>
                                            <td>${formatDate(task.due_date)}</td>
                                            <td><span class="badge badge-${task.status === 'completed' ? 'success' : task.status === 'overdue' ? 'danger' : 'secondary'}">${task.status || 'Pendiente'}</span></td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : '<p class="text-muted text-center py-3">Sin tareas asignadas</p>'}
                </div>
            </div>

            <!-- Solicitudes de Permisos -->
            <div class="card">
                <div class="card-header" style="background: #f39c12; color: white;">
                    <i class="fas fa-calendar-check"></i> Solicitudes de Permisos (período)
                    <span class="badge badge-light float-right">
                        ${permissions.approved || 0} aprobados / ${permissions.rejected || 0} rechazados
                    </span>
                </div>
                <div class="card-body">
                    ${permissions.requests && permissions.requests.length > 0 ? `
                        <div class="table-responsive">
                            <table class="table table-sm">
                                <thead class="thead-light">
                                    <tr><th>Tipo</th><th>Fecha</th><th>Motivo</th><th>Estado</th></tr>
                                </thead>
                                <tbody>
                                    ${permissions.requests.slice(0, 10).map(perm => `
                                        <tr>
                                            <td><span class="badge badge-info">${perm.type || perm.permission_type || 'Permiso'}</span></td>
                                            <td>${formatDate(perm.date || perm.request_date)}</td>
                                            <td>${perm.reason || 'Sin especificar'}</td>
                                            <td><span class="badge badge-${perm.status === 'approved' ? 'success' : perm.status === 'rejected' ? 'danger' : 'warning'}">${perm.status || 'Pendiente'}</span></td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : '<p class="text-muted text-center py-3">Sin solicitudes de permisos en el período</p>'}
                </div>
            </div>
        `;
    }

    /**
     * Tab Documentos: Documentos generales, médicos, licencias
     */
    function renderDocumentsTab(report) {
        const container = document.getElementById('tab-documents');
        if (!container) return;

        const userData = report.completeUserData || {};
        const docs = userData.documents || {};

        container.innerHTML = `
            <h4 class="mb-4"><i class="fas fa-folder-open"></i> Documentos y Licencias</h4>

            <!-- Resumen de documentación -->
            <div class="row mb-4">
                <div class="col-md-3">
                    <div class="card text-center">
                        <div class="card-body">
                            <h3 class="text-primary">${docs.summary?.totalDocuments || 0}</h3>
                            <small>Documentos Generales</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card text-center">
                        <div class="card-body">
                            <h3 class="text-info">${docs.summary?.totalMedical || 0}</h3>
                            <small>Docs. Médicos</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card text-center">
                        <div class="card-body">
                            <h3 class="${docs.driverLicense ? 'text-success' : 'text-muted'}">${docs.driverLicense ? 'Sí' : 'No'}</h3>
                            <small>Licencia de Conducir</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card text-center">
                        <div class="card-body">
                            <h3 class="text-warning">${docs.professionalLicenses?.length || 0}</h3>
                            <small>Licencias Profesionales</small>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Documentos Generales -->
            <div class="card mb-4">
                <div class="card-header" style="background: #3498db; color: white;">
                    <i class="fas fa-file-alt"></i> Documentos Generales
                </div>
                <div class="card-body">
                    ${docs.generalDocuments && docs.generalDocuments.length > 0 ? `
                        <div class="table-responsive">
                            <table class="table table-sm">
                                <thead class="thead-light">
                                    <tr><th>Documento</th><th>Tipo</th><th>Fecha</th><th>Vencimiento</th><th>Estado</th></tr>
                                </thead>
                                <tbody>
                                    ${docs.generalDocuments.map(doc => `
                                        <tr>
                                            <td><i class="fas fa-file"></i> ${doc.name || doc.document_name || 'Documento'}</td>
                                            <td><span class="badge badge-secondary">${doc.type || doc.document_type || 'General'}</span></td>
                                            <td>${formatDate(doc.issue_date || doc.created_at)}</td>
                                            <td>${doc.expiry_date ? formatDate(doc.expiry_date) : 'N/A'}</td>
                                            <td>${getDocumentStatusBadge(doc)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : '<p class="text-muted text-center py-3">Sin documentos generales</p>'}
                </div>
            </div>

            <!-- Documentos Médicos -->
            <div class="card mb-4">
                <div class="card-header" style="background: #e74c3c; color: white;">
                    <i class="fas fa-file-medical"></i> Documentos Médicos
                </div>
                <div class="card-body">
                    ${docs.medicalDocuments && docs.medicalDocuments.length > 0 ? `
                        <div class="table-responsive">
                            <table class="table table-sm">
                                <thead class="thead-light">
                                    <tr><th>Documento</th><th>Tipo</th><th>Fecha</th><th>Médico</th></tr>
                                </thead>
                                <tbody>
                                    ${docs.medicalDocuments.map(doc => `
                                        <tr>
                                            <td><i class="fas fa-file-medical-alt"></i> ${doc.name || doc.document_name || 'Certificado'}</td>
                                            <td><span class="badge badge-danger">${doc.type || 'Médico'}</span></td>
                                            <td>${formatDate(doc.date || doc.created_at)}</td>
                                            <td>${doc.doctor_name || doc.physician || 'N/A'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : '<p class="text-muted text-center py-3">Sin documentos médicos</p>'}
                </div>
            </div>

            <!-- Licencia de Conducir -->
            <div class="card mb-4">
                <div class="card-header" style="background: #9b59b6; color: white;">
                    <i class="fas fa-car"></i> Licencia de Conducir
                </div>
                <div class="card-body">
                    ${docs.driverLicense ? `
                        <div class="row">
                            <div class="col-md-4">
                                <p><strong>Número:</strong> ${docs.driverLicense.license_number || 'N/A'}</p>
                                <p><strong>Categoría:</strong> <span class="badge badge-info">${docs.driverLicense.category || docs.driverLicense.license_class || 'N/A'}</span></p>
                            </div>
                            <div class="col-md-4">
                                <p><strong>Emisión:</strong> ${formatDate(docs.driverLicense.issue_date)}</p>
                                <p><strong>Vencimiento:</strong> ${formatDate(docs.driverLicense.expiry_date)}</p>
                            </div>
                            <div class="col-md-4">
                                <p><strong>Estado:</strong> ${getDocumentStatusBadge(docs.driverLicense)}</p>
                                <p><strong>Jurisdicción:</strong> ${docs.driverLicense.jurisdiction || 'N/A'}</p>
                            </div>
                        </div>
                    ` : '<p class="text-muted text-center py-3">Sin licencia de conducir registrada</p>'}
                </div>
            </div>

            <!-- Licencias Profesionales -->
            <div class="card">
                <div class="card-header" style="background: #f39c12; color: white;">
                    <i class="fas fa-certificate"></i> Licencias y Certificaciones Profesionales
                </div>
                <div class="card-body">
                    ${docs.professionalLicenses && docs.professionalLicenses.length > 0 ? `
                        <div class="row">
                            ${docs.professionalLicenses.map(lic => `
                                <div class="col-md-6 mb-3">
                                    <div class="card h-100 border-left-warning" style="border-left: 4px solid #f39c12;">
                                        <div class="card-body">
                                            <h6><i class="fas fa-award text-warning"></i> ${lic.name || lic.license_type || 'Licencia'}</h6>
                                            <p class="mb-1"><strong>N°:</strong> ${lic.license_number || 'N/A'}</p>
                                            <p class="mb-1"><strong>Otorgado por:</strong> ${lic.issuing_authority || 'N/A'}</p>
                                            <p class="mb-1"><strong>Vencimiento:</strong> ${formatDate(lic.expiry_date)}</p>
                                            <p class="mb-0">${getDocumentStatusBadge(lic)}</p>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p class="text-muted text-center py-3">Sin licencias profesionales registradas</p>'}
                </div>
            </div>
        `;
    }

    // Helper para badges de estado de documentos
    function getDocumentStatusBadge(doc) {
        if (!doc.expiry_date) return '<span class="badge badge-secondary">Sin vencimiento</span>';

        const expiry = new Date(doc.expiry_date);
        const today = new Date();
        const daysUntilExpiry = Math.floor((expiry - today) / (1000 * 60 * 60 * 24));

        if (daysUntilExpiry < 0) {
            return '<span class="badge badge-danger">Vencido</span>';
        } else if (daysUntilExpiry <= 30) {
            return '<span class="badge badge-warning">Por vencer</span>';
        } else {
            return '<span class="badge badge-success">Vigente</span>';
        }
    }

    // Helper para calcular edad
    function calculateAge(birthDate) {
        if (!birthDate) return 'N/A';
        const birth = new Date(birthDate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    }

    // Helper para formatear números
    function formatNumber(num) {
        if (!num) return '0';
        return new Intl.NumberFormat('es-AR').format(num);
    }

    // =========================================================================
    // ENTERPRISE: TAB BIOMÉTRICO EMOCIONAL
    // =========================================================================

    function renderBiometricTab(report) {
        const container = document.getElementById('tab-biometric');
        if (!container) return;

        const biometric = report.biometricAnalysis || {};
        const hasModule = biometric.hasModule;
        const emotionalHistory = biometric.emotionalHistory || [];
        const correlations = biometric.correlations || [];
        const correlatedEvents = biometric.correlatedEvents || [];
        const alerts = biometric.alerts || [];

        if (!hasModule) {
            container.innerHTML = `
                <div class="alert alert-info" style="margin: 20px; padding: 30px; text-align: center;">
                    <i class="fas fa-brain fa-3x mb-3" style="color: #6c757d;"></i>
                    <h4>Módulo Biométrico Emocional No Activado</h4>
                    <p>Este módulo enterprise permite analizar patrones emocionales y correlacionarlos con eventos laborales.</p>
                    <p class="text-muted">Contacte a su administrador para activar esta funcionalidad.</p>
                </div>
            `;
            return;
        }

        // Agrupar historial emocional por emoción
        const emotionSummary = {};
        emotionalHistory.forEach(record => {
            const emotion = record.emotion || record.primary_emotion || 'neutral';
            if (!emotionSummary[emotion]) {
                emotionSummary[emotion] = { count: 0, avgConfidence: 0, confidences: [] };
            }
            emotionSummary[emotion].count++;
            emotionSummary[emotion].confidences.push(record.confidence || record.emotion_confidence || 0.5);
        });
        Object.keys(emotionSummary).forEach(emotion => {
            const data = emotionSummary[emotion];
            data.avgConfidence = data.confidences.length > 0
                ? (data.confidences.reduce((a, b) => a + b, 0) / data.confidences.length * 100).toFixed(1)
                : 0;
        });

        const emotionColors = {
            'happy': '#27ae60', 'feliz': '#27ae60',
            'neutral': '#95a5a6', 'neutro': '#95a5a6',
            'sad': '#3498db', 'triste': '#3498db',
            'angry': '#e74c3c', 'enojado': '#e74c3c',
            'surprised': '#f39c12', 'sorprendido': '#f39c12',
            'fearful': '#9b59b6', 'temeroso': '#9b59b6',
            'disgusted': '#1abc9c', 'disgustado': '#1abc9c'
        };

        const getEmotionIcon = (emotion) => {
            const icons = {
                'happy': 'fa-smile', 'feliz': 'fa-smile',
                'neutral': 'fa-meh', 'neutro': 'fa-meh',
                'sad': 'fa-frown', 'triste': 'fa-frown',
                'angry': 'fa-angry', 'enojado': 'fa-angry',
                'surprised': 'fa-surprise', 'sorprendido': 'fa-surprise',
                'fearful': 'fa-grimace', 'temeroso': 'fa-grimace',
                'disgusted': 'fa-dizzy', 'disgustado': 'fa-dizzy'
            };
            return icons[emotion.toLowerCase()] || 'fa-meh';
        };

        container.innerHTML = `
            <div style="padding: 20px;">
                <!-- Header Enterprise -->
                <div style="background: linear-gradient(135deg, #2c3e50 0%, #9b59b6 100%); color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                    <h3><i class="fas fa-brain"></i> Análisis Biométrico Emocional</h3>
                    <p style="margin: 0; opacity: 0.9;">Correlación de estados emocionales con eventos laborales - Datos reales del sistema biométrico</p>
                </div>

                <!-- Alertas de Patrones -->
                ${alerts.length > 0 ? `
                    <div class="card mb-4" style="border-left: 4px solid #e74c3c;">
                        <div class="card-header" style="background: #fdf2f2; color: #c0392b;">
                            <i class="fas fa-exclamation-triangle"></i> Alertas de Patrones Detectados
                        </div>
                        <div class="card-body">
                            ${alerts.map(alert => `
                                <div class="alert alert-${alert.severity === 'high' ? 'danger' : alert.severity === 'medium' ? 'warning' : 'info'}" style="margin-bottom: 10px;">
                                    <strong><i class="fas fa-bell"></i> ${alert.type || 'Alerta'}:</strong> ${alert.message || alert.description}
                                    ${alert.recommendation ? `<br><small class="text-muted"><i class="fas fa-lightbulb"></i> ${alert.recommendation}</small>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Resumen Emocional -->
                <div class="card mb-4">
                    <div class="card-header" style="background: #8e44ad; color: white;">
                        <i class="fas fa-chart-pie"></i> Distribución Emocional (${emotionalHistory.length} registros)
                    </div>
                    <div class="card-body">
                        ${Object.keys(emotionSummary).length > 0 ? `
                            <div class="row">
                                ${Object.entries(emotionSummary).map(([emotion, data]) => `
                                    <div class="col-md-3 col-sm-6 mb-3">
                                        <div style="background: ${emotionColors[emotion.toLowerCase()] || '#95a5a6'}; color: white; padding: 15px; border-radius: 8px; text-align: center;">
                                            <i class="fas ${getEmotionIcon(emotion)} fa-2x mb-2"></i>
                                            <h5 style="margin: 0; text-transform: capitalize;">${emotion}</h5>
                                            <p style="margin: 5px 0 0 0; font-size: 1.5rem; font-weight: bold;">${data.count}</p>
                                            <small>Confianza: ${data.avgConfidence}%</small>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <p class="text-muted text-center">Sin registros emocionales disponibles</p>
                        `}
                    </div>
                </div>

                <!-- Correlaciones con Eventos -->
                <div class="card mb-4">
                    <div class="card-header" style="background: #2980b9; color: white;">
                        <i class="fas fa-link"></i> Correlaciones Detectadas (Emoción ↔ Eventos)
                    </div>
                    <div class="card-body">
                        ${correlations.length > 0 ? `
                            <div class="table-responsive">
                                <table class="table table-hover">
                                    <thead class="thead-dark">
                                        <tr>
                                            <th>Patrón</th>
                                            <th>Correlación</th>
                                            <th>Eventos Asociados</th>
                                            <th>Confianza</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${correlations.map(corr => `
                                            <tr>
                                                <td>
                                                    <i class="fas ${getEmotionIcon(corr.emotion || 'neutral')}" style="color: ${emotionColors[(corr.emotion || 'neutral').toLowerCase()] || '#95a5a6'};"></i>
                                                    ${corr.emotion || 'N/A'} → ${corr.pattern || corr.event_type || 'N/A'}
                                                </td>
                                                <td>
                                                    <span class="badge badge-${corr.strength === 'strong' ? 'danger' : corr.strength === 'moderate' ? 'warning' : 'info'}">
                                                        ${corr.strength || 'N/A'}
                                                    </span>
                                                </td>
                                                <td>${corr.event_count || corr.occurrences || 0} eventos</td>
                                                <td>
                                                    <div class="progress" style="height: 20px;">
                                                        <div class="progress-bar bg-success" style="width: ${(corr.confidence || 0) * 100}%">
                                                            ${((corr.confidence || 0) * 100).toFixed(0)}%
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        ` : `
                            <p class="text-muted text-center py-3">No se detectaron correlaciones significativas aún</p>
                        `}
                    </div>
                </div>

                <!-- Eventos Correlacionados -->
                <div class="card mb-4">
                    <div class="card-header" style="background: #16a085; color: white;">
                        <i class="fas fa-calendar-check"></i> Timeline de Eventos Correlacionados
                    </div>
                    <div class="card-body">
                        ${correlatedEvents.length > 0 ? `
                            <div class="timeline" style="position: relative; padding-left: 30px;">
                                ${correlatedEvents.slice(0, 10).map(event => `
                                    <div style="border-left: 3px solid ${emotionColors[(event.emotion || 'neutral').toLowerCase()] || '#95a5a6'}; padding: 10px 0 10px 20px; margin-bottom: 15px; position: relative;">
                                        <div style="position: absolute; left: -8px; top: 12px; width: 12px; height: 12px; background: ${emotionColors[(event.emotion || 'neutral').toLowerCase()] || '#95a5a6'}; border-radius: 50%;"></div>
                                        <div style="display: flex; justify-content: space-between; align-items: center;">
                                            <div>
                                                <strong>${event.event_type || event.type || 'Evento'}:</strong> ${event.description || event.details || 'Sin descripción'}
                                                <br><small class="text-muted">${formatDate(event.event_date || event.date)}</small>
                                            </div>
                                            <span class="badge" style="background: ${emotionColors[(event.emotion || 'neutral').toLowerCase()] || '#95a5a6'}; color: white;">
                                                <i class="fas ${getEmotionIcon(event.emotion || 'neutral')}"></i> ${event.emotion || 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                            ${correlatedEvents.length > 10 ? `<p class="text-muted text-center">... y ${correlatedEvents.length - 10} eventos más</p>` : ''}
                        ` : `
                            <p class="text-muted text-center py-3">Sin eventos correlacionados disponibles</p>
                        `}
                    </div>
                </div>
            </div>
        `;
    }

    // =========================================================================
    // ENTERPRISE: TAB COMPATIBILIDAD Y REEMPLAZOS
    // =========================================================================

    function renderCompatibilityTab(report) {
        const container = document.getElementById('tab-compatibility');
        if (!container) return;

        const compatibility = report.taskCompatibility || {};
        const hasModule = compatibility.hasModule;
        const replacements = compatibility.replacements || [];
        const canReplace = compatibility.canReplace || [];
        const hasNoReplacement = compatibility.hasNoReplacement;
        const alert = compatibility.alert;

        if (!hasModule) {
            container.innerHTML = `
                <div class="alert alert-info" style="margin: 20px; padding: 30px; text-align: center;">
                    <i class="fas fa-people-arrows fa-3x mb-3" style="color: #6c757d;"></i>
                    <h4>Módulo de Compatibilidad No Activado</h4>
                    <p>Este módulo enterprise permite analizar quién puede reemplazar a quién basado en skills y tareas.</p>
                    <p class="text-muted">Contacte a su administrador para activar esta funcionalidad.</p>
                </div>
            `;
            return;
        }

        const emp = report.employee || {};

        container.innerHTML = `
            <div style="padding: 20px;">
                <!-- Header Enterprise -->
                <div style="background: linear-gradient(135deg, #2c3e50 0%, #e67e22 100%); color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                    <h3><i class="fas fa-people-arrows"></i> Análisis de Compatibilidad y Reemplazos</h3>
                    <p style="margin: 0; opacity: 0.9;">Quién puede reemplazar a ${emp.first_name || ''} ${emp.last_name || ''} y a quién puede reemplazar</p>
                </div>

                <!-- Alerta de Riesgo -->
                ${hasNoReplacement && alert ? `
                    <div class="alert alert-danger" style="border-left: 5px solid #c0392b; margin-bottom: 20px;">
                        <h5><i class="fas fa-exclamation-circle"></i> Alerta de Riesgo Operativo</h5>
                        <p style="margin: 0;">${alert}</p>
                        <hr>
                        <small><i class="fas fa-lightbulb"></i> Recomendación: Identificar y capacitar personal para cubrir este rol crítico.</small>
                    </div>
                ` : ''}

                <!-- Quién puede reemplazar a este empleado -->
                <div class="card mb-4">
                    <div class="card-header" style="background: #27ae60; color: white;">
                        <i class="fas fa-user-friends"></i> Quién Puede Reemplazar a Este Empleado (${replacements.length})
                    </div>
                    <div class="card-body">
                        ${replacements.length > 0 ? `
                            <div class="row">
                                ${replacements.map(rep => `
                                    <div class="col-md-4 mb-3">
                                        <div class="card h-100" style="border-left: 4px solid #27ae60;">
                                            <div class="card-body">
                                                <h6><i class="fas fa-user"></i> ${rep.name || rep.full_name || 'Empleado'}</h6>
                                                <p class="text-muted mb-2">${rep.position || rep.job_title || 'Sin cargo'}</p>
                                                <div class="mb-2">
                                                    <small><strong>Compatibilidad:</strong></small>
                                                    <div class="progress" style="height: 20px;">
                                                        <div class="progress-bar bg-success" style="width: ${rep.compatibility_score || rep.score || 0}%">
                                                            ${rep.compatibility_score || rep.score || 0}%
                                                        </div>
                                                    </div>
                                                </div>
                                                ${rep.matching_skills && rep.matching_skills.length > 0 ? `
                                                    <small><strong>Skills compartidos:</strong></small>
                                                    <div>
                                                        ${rep.matching_skills.slice(0, 3).map(skill => `
                                                            <span class="badge badge-success mr-1">${skill}</span>
                                                        `).join('')}
                                                        ${rep.matching_skills.length > 3 ? `<span class="badge badge-secondary">+${rep.matching_skills.length - 3}</span>` : ''}
                                                    </div>
                                                ` : ''}
                                                ${rep.training_needed ? `
                                                    <div class="mt-2">
                                                        <small class="text-warning"><i class="fas fa-graduation-cap"></i> Requiere capacitación</small>
                                                    </div>
                                                ` : ''}
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <div class="text-center py-4">
                                <i class="fas fa-user-slash fa-3x mb-3" style="color: #e74c3c;"></i>
                                <h5>Sin Reemplazos Identificados</h5>
                                <p class="text-muted">No hay empleados con skills compatibles para reemplazar este rol.</p>
                            </div>
                        `}
                    </div>
                </div>

                <!-- A quién puede reemplazar este empleado -->
                <div class="card mb-4">
                    <div class="card-header" style="background: #3498db; color: white;">
                        <i class="fas fa-user-check"></i> A Quién Puede Reemplazar Este Empleado (${canReplace.length})
                    </div>
                    <div class="card-body">
                        ${canReplace.length > 0 ? `
                            <div class="table-responsive">
                                <table class="table table-hover">
                                    <thead class="thead-light">
                                        <tr>
                                            <th>Empleado</th>
                                            <th>Cargo</th>
                                            <th>Departamento</th>
                                            <th>Compatibilidad</th>
                                            <th>Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${canReplace.map(emp => `
                                            <tr>
                                                <td><i class="fas fa-user"></i> ${emp.name || emp.full_name || 'N/A'}</td>
                                                <td>${emp.position || emp.job_title || 'N/A'}</td>
                                                <td>${emp.department || 'N/A'}</td>
                                                <td>
                                                    <div class="progress" style="height: 20px; min-width: 100px;">
                                                        <div class="progress-bar ${(emp.compatibility_score || emp.score || 0) >= 80 ? 'bg-success' : (emp.compatibility_score || emp.score || 0) >= 60 ? 'bg-warning' : 'bg-danger'}" style="width: ${emp.compatibility_score || emp.score || 0}%">
                                                            ${emp.compatibility_score || emp.score || 0}%
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    ${emp.ready ?
                                                        '<span class="badge badge-success"><i class="fas fa-check"></i> Listo</span>' :
                                                        '<span class="badge badge-warning"><i class="fas fa-clock"></i> Requiere prep.</span>'
                                                    }
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        ` : `
                            <div class="text-center py-4">
                                <i class="fas fa-user-times fa-3x mb-3" style="color: #95a5a6;"></i>
                                <h5>Sin Capacidad de Reemplazo</h5>
                                <p class="text-muted">Este empleado no tiene skills registrados para reemplazar otros roles.</p>
                            </div>
                        `}
                    </div>
                </div>

                <!-- Resumen de Skills -->
                ${compatibility.skillsAnalysis ? `
                    <div class="card">
                        <div class="card-header" style="background: #9b59b6; color: white;">
                            <i class="fas fa-cogs"></i> Análisis de Skills
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <h6>Skills Principales</h6>
                                    ${compatibility.skillsAnalysis.primary && compatibility.skillsAnalysis.primary.length > 0 ?
                                        compatibility.skillsAnalysis.primary.map(skill => `
                                            <span class="badge badge-primary mr-1 mb-1">${skill}</span>
                                        `).join('') :
                                        '<span class="text-muted">Sin skills registrados</span>'
                                    }
                                </div>
                                <div class="col-md-6">
                                    <h6>Skills Secundarios</h6>
                                    ${compatibility.skillsAnalysis.secondary && compatibility.skillsAnalysis.secondary.length > 0 ?
                                        compatibility.skillsAnalysis.secondary.map(skill => `
                                            <span class="badge badge-secondary mr-1 mb-1">${skill}</span>
                                        `).join('') :
                                        '<span class="text-muted">Sin skills secundarios</span>'
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    // =========================================================================
    // ENTERPRISE: TAB BANCO DE HORAS
    // =========================================================================

    async function renderHourBankTab(report) {
        const container = document.getElementById('tab-hour-bank');
        if (!container) return;

        const emp = report.employee || {};
        const userId = emp.user_id || emp.id;

        // Mostrar loading inicial
        container.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="sr-only">Cargando...</span>
                </div>
                <p class="mt-3 text-muted">Cargando datos del banco de horas...</p>
            </div>
        `;

        try {
            // Cargar datos del banco de horas desde API
            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
            const response = await fetch(`/api/hour-bank/employee-summary/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('No se pudo cargar el banco de horas');
            }

            const data = await response.json();
            const summary = data.data || {};
            const health = summary.health || {};
            const transactions = summary.transactions || [];
            const trends = summary.trends || {};

            container.innerHTML = `
                <div style="padding: 20px;">
                    <!-- Header Enterprise -->
                    <div style="background: linear-gradient(135deg, #00897b 0%, #00695c 50%, #004d40 100%); color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(0,137,123,0.3);">
                        <h3><i class="fas fa-piggy-bank"></i> Banco de Horas - ${emp.first_name || ''} ${emp.last_name || ''}</h3>
                        <p style="margin: 0; opacity: 0.9;">Cuenta corriente de horas extras: acumulación, devolución y tendencias</p>
                    </div>

                    <!-- Métricas Principales -->
                    <div class="row mb-4">
                        <!-- Balance Actual -->
                        <div class="col-md-3">
                            <div class="card h-100" style="background: rgba(0,200,150,0.1); border: 1px solid rgba(0,200,150,0.3);">
                                <div class="card-body text-center">
                                    <i class="fas fa-wallet fa-2x mb-2" style="color: #00e5a0;"></i>
                                    <h2 style="color: #00e5a0; margin: 0;">${(summary.balance || 0).toFixed(1)}h</h2>
                                    <small class="text-muted">Balance Actual</small>
                                    ${summary.balance > 0 ? `
                                        <div class="mt-2">
                                            <span class="badge badge-success">
                                                <i class="fas fa-arrow-up"></i> A favor
                                            </span>
                                        </div>
                                    ` : summary.balance < 0 ? `
                                        <div class="mt-2">
                                            <span class="badge badge-danger">
                                                <i class="fas fa-arrow-down"></i> En deuda
                                            </span>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        </div>

                        <!-- Salud de la Cuenta -->
                        <div class="col-md-3">
                            <div class="card h-100" style="background: ${getHealthColor(health.health_score, 0.1)}; border: 1px solid ${getHealthColor(health.health_score, 0.3)};">
                                <div class="card-body text-center">
                                    <i class="fas fa-heartbeat fa-2x mb-2" style="color: ${getHealthTextColor(health.health_score)};"></i>
                                    <h2 style="color: ${getHealthTextColor(health.health_score)}; margin: 0;">${health.health_score || 0}/100</h2>
                                    <small class="text-muted">Salud de Cuenta</small>
                                    <div class="mt-2">
                                        <span class="badge" style="background: ${getHealthTextColor(health.health_score)}20; color: ${getHealthTextColor(health.health_score)};">
                                            ${health.status || 'Sin evaluar'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Total Acumulado -->
                        <div class="col-md-3">
                            <div class="card h-100" style="background: rgba(33,150,243,0.1); border: 1px solid rgba(33,150,243,0.3);">
                                <div class="card-body text-center">
                                    <i class="fas fa-plus-circle fa-2x mb-2" style="color: #64b5f6;"></i>
                                    <h2 style="color: #64b5f6; margin: 0;">${(summary.total_accrued || 0).toFixed(1)}h</h2>
                                    <small class="text-muted">Total Acumulado</small>
                                </div>
                            </div>
                        </div>

                        <!-- Total Usado -->
                        <div class="col-md-3">
                            <div class="card h-100" style="background: rgba(255,152,0,0.1); border: 1px solid rgba(255,152,0,0.3);">
                                <div class="card-body text-center">
                                    <i class="fas fa-minus-circle fa-2x mb-2" style="color: #ffb74d;"></i>
                                    <h2 style="color: #ffb74d; margin: 0;">${(summary.total_used || 0).toFixed(1)}h</h2>
                                    <small class="text-muted">Total Usado</small>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Tendencias y Análisis -->
                    <div class="row mb-4">
                        <!-- Gráfico de Tendencia -->
                        <div class="col-md-8">
                            <div class="card h-100" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1);">
                                <div class="card-header" style="background: rgba(0,0,0,0.2); border-bottom: 1px solid rgba(255,255,255,0.1);">
                                    <i class="fas fa-chart-line"></i> Tendencia de Uso (Últimos 6 meses)
                                </div>
                                <div class="card-body">
                                    <div class="row text-center">
                                        <div class="col-md-4">
                                            <div class="p-3" style="background: rgba(0,200,150,0.1); border-radius: 8px;">
                                                <h4 style="color: #00e5a0;">${trends.avg_monthly_accrual?.toFixed(1) || '0.0'}h</h4>
                                                <small class="text-muted">Prom. Mensual Acumulado</small>
                                            </div>
                                        </div>
                                        <div class="col-md-4">
                                            <div class="p-3" style="background: rgba(255,152,0,0.1); border-radius: 8px;">
                                                <h4 style="color: #ffb74d;">${trends.avg_monthly_usage?.toFixed(1) || '0.0'}h</h4>
                                                <small class="text-muted">Prom. Mensual Usado</small>
                                            </div>
                                        </div>
                                        <div class="col-md-4">
                                            <div class="p-3" style="background: ${(trends.net_trend || 0) >= 0 ? 'rgba(0,200,150,0.1)' : 'rgba(255,82,82,0.1)'}; border-radius: 8px;">
                                                <h4 style="color: ${(trends.net_trend || 0) >= 0 ? '#00e5a0' : '#ff5252'};">
                                                    ${(trends.net_trend || 0) >= 0 ? '+' : ''}${trends.net_trend?.toFixed(1) || '0.0'}h
                                                </h4>
                                                <small class="text-muted">Tendencia Neta</small>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="mt-4">
                                        <h6 class="text-muted"><i class="fas fa-chart-pie"></i> Distribución HE Generadas</h6>
                                        <div class="progress" style="height: 30px; border-radius: 15px;">
                                            <div class="progress-bar" style="width: ${trends.percent_to_bank || 50}%; background: linear-gradient(90deg, #00897b, #00e5a0);">
                                                🏦 ${trends.percent_to_bank?.toFixed(0) || 50}% Banco
                                            </div>
                                            <div class="progress-bar" style="width: ${trends.percent_to_pay || 50}%; background: linear-gradient(90deg, #2196f3, #64b5f6);">
                                                💵 ${trends.percent_to_pay?.toFixed(0) || 50}% Pago
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Alertas y Recomendaciones -->
                        <div class="col-md-4">
                            <div class="card h-100" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1);">
                                <div class="card-header" style="background: rgba(0,0,0,0.2); border-bottom: 1px solid rgba(255,255,255,0.1);">
                                    <i class="fas fa-exclamation-triangle"></i> Estado y Alertas
                                </div>
                                <div class="card-body">
                                    ${health.factors && health.factors.length > 0 ? `
                                        <ul class="list-unstyled mb-3">
                                            ${health.factors.map(factor => `
                                                <li class="mb-2">
                                                    <i class="fas fa-info-circle text-info"></i> ${factor}
                                                </li>
                                            `).join('')}
                                        </ul>
                                    ` : '<p class="text-muted">Sin factores de riesgo detectados</p>'}

                                    ${health.recommendations && health.recommendations.length > 0 ? `
                                        <hr>
                                        <h6><i class="fas fa-lightbulb text-warning"></i> Recomendaciones</h6>
                                        <ul class="list-unstyled">
                                            ${health.recommendations.map(rec => `
                                                <li class="mb-2 text-muted">
                                                    <i class="fas fa-chevron-right"></i> ${rec}
                                                </li>
                                            `).join('')}
                                        </ul>
                                    ` : ''}

                                    ${summary.vicious_cycle_risk ? `
                                        <div class="alert ${summary.vicious_cycle_risk.is_vicious_cycle ? 'alert-danger' : 'alert-warning'} mt-3" style="border-radius: 8px;">
                                            <strong><i class="fas fa-sync-alt"></i> Ciclo Vicioso</strong>
                                            <p class="mb-1 small">Ratio: ${summary.vicious_cycle_risk.ratio?.toFixed(2) || 'N/A'}</p>
                                            <p class="mb-0 small">${summary.vicious_cycle_risk.recommendation || ''}</p>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Historial de Transacciones -->
                    <div class="card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1);">
                        <div class="card-header" style="background: rgba(0,0,0,0.2); border-bottom: 1px solid rgba(255,255,255,0.1);">
                            <i class="fas fa-history"></i> Últimas Transacciones
                        </div>
                        <div class="card-body p-0">
                            <div class="table-responsive">
                                <table class="table table-dark table-hover mb-0">
                                    <thead>
                                        <tr style="background: rgba(0,0,0,0.3);">
                                            <th>Fecha</th>
                                            <th>Tipo</th>
                                            <th>Horas</th>
                                            <th>Motivo</th>
                                            <th>Balance</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${transactions.length > 0 ? transactions.slice(0, 10).map(tx => `
                                            <tr>
                                                <td>${formatDate(tx.transaction_date || tx.created_at)}</td>
                                                <td>
                                                    ${tx.transaction_type === 'accrual' ?
                                                        '<span class="badge badge-success"><i class="fas fa-plus"></i> Acumulación</span>' :
                                                        tx.transaction_type === 'usage' ?
                                                        '<span class="badge badge-warning"><i class="fas fa-minus"></i> Uso</span>' :
                                                        tx.transaction_type === 'adjustment' ?
                                                        '<span class="badge badge-info"><i class="fas fa-edit"></i> Ajuste</span>' :
                                                        '<span class="badge badge-secondary">' + tx.transaction_type + '</span>'
                                                    }
                                                </td>
                                                <td style="color: ${tx.hours_amount >= 0 ? '#00e5a0' : '#ff5252'};">
                                                    ${tx.hours_amount >= 0 ? '+' : ''}${tx.hours_amount?.toFixed(1) || 0}h
                                                </td>
                                                <td class="text-muted">${tx.description || tx.reason || '-'}</td>
                                                <td><strong>${tx.balance_after?.toFixed(1) || '-'}h</strong></td>
                                            </tr>
                                        `).join('') : `
                                            <tr>
                                                <td colspan="5" class="text-center py-4 text-muted">
                                                    <i class="fas fa-inbox fa-2x mb-2"></i><br>
                                                    Sin transacciones registradas
                                                </td>
                                            </tr>
                                        `}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error cargando banco de horas:', error);
            container.innerHTML = `
                <div class="alert alert-warning" style="margin: 20px; padding: 30px; text-align: center;">
                    <i class="fas fa-piggy-bank fa-3x mb-3" style="color: #6c757d;"></i>
                    <h4>Banco de Horas No Disponible</h4>
                    <p>No se pudo cargar la información del banco de horas para este empleado.</p>
                    <p class="text-muted small">${error.message || 'Error desconocido'}</p>
                </div>
            `;
        }
    }

    // Helpers para el tab de banco de horas
    function getHealthColor(score, opacity) {
        if (score >= 80) return `rgba(0, 200, 150, ${opacity})`;
        if (score >= 60) return `rgba(255, 193, 7, ${opacity})`;
        if (score >= 40) return `rgba(255, 152, 0, ${opacity})`;
        return `rgba(255, 82, 82, ${opacity})`;
    }

    function getHealthTextColor(score) {
        if (score >= 80) return '#00e5a0';
        if (score >= 60) return '#ffc107';
        if (score >= 40) return '#ff9800';
        return '#ff5252';
    }

    function formatDate(dateStr) {
        if (!dateStr) return '-';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch {
            return dateStr;
        }
    }

    // =========================================================================
    // COMPARACIÓN DE EMPLEADOS
    // =========================================================================

    function addToComparison(userId, name) {
        if (comparisonList.length >= 10) {
            showNotification('Máximo 10 empleados para comparar', 'warning');
            return;
        }

        if (comparisonList.find(e => e.id === userId)) {
            showNotification('Empleado ya está en la lista', 'info');
            return;
        }

        comparisonList.push({ id: userId, name });
        updateComparisonUI();
    }

    function removeFromComparison(userId) {
        comparisonList = comparisonList.filter(e => e.id !== userId);
        updateComparisonUI();
    }

    function updateComparisonUI() {
        const listContainer = document.getElementById('e360-comparison-list');
        const chipsContainer = document.getElementById('comparison-chips');
        const countSpan = document.getElementById('compare-count');
        const compareBtn = document.getElementById('btn-compare-employees');

        countSpan.textContent = comparisonList.length;

        if (comparisonList.length > 0) {
            listContainer.style.display = 'block';
            chipsContainer.innerHTML = comparisonList.map(emp => `
                <span class="comparison-chip">
                    ${emp.name}
                    <i class="fas fa-times remove" onclick="window.Employee360.removeFromComparison('${emp.id}')"></i>
                </span>
            `).join('');
            compareBtn.disabled = comparisonList.length < 2;
        } else {
            listContainer.style.display = 'none';
            compareBtn.disabled = true;
        }
    }

    async function compareEmployees() {
        if (comparisonList.length < 2) {
            showNotification('Seleccione al menos 2 empleados para comparar', 'warning');
            return;
        }

        showLoading();

        try {
            const dateFrom = document.getElementById('e360-date-from').value;
            const dateTo = document.getElementById('e360-date-to').value;

            const response = await fetch(`${API_BASE}/compare`, {
                method: 'POST',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userIds: comparisonList.map(e => e.id),
                    dateFrom,
                    dateTo
                })
            });

            if (!response.ok) throw new Error('Error comparando empleados');

            const data = await response.json();

            if (data.success) {
                renderComparisonView(data.data);
            }
        } catch (error) {
            console.error('❌ [360°] Error en comparación:', error);
            showNotification('Error comparando empleados', 'error');
        }
    }

    function renderComparisonView(comparison) {
        // Ocultar placeholder (con verificación null)
        const placeholder = document.getElementById('e360-placeholder');
        if (placeholder) {
            placeholder.style.display = 'none';
        }

        // Mostrar en tab overview
        const container = document.getElementById('tab-overview');
        if (!container) return; // Guard against missing DOM element
        const employees = comparison.employees;
        const numEmployees = employees.length;

        container.innerHTML = `
            <h3><i class="fas fa-users"></i> Comparación de ${numEmployees} Empleados</h3>

            <div class="comparison-grid" style="grid-template-columns: 150px repeat(${numEmployees}, 1fr);">
                <!-- Header -->
                <div class="comparison-header" style="grid-template-columns: 150px repeat(${numEmployees}, 1fr);">
                    <div class="comparison-cell"><strong>Métrica</strong></div>
                    ${employees.map(e => `
                        <div class="comparison-cell">
                            <div class="comparison-employee-name">${e.employee.fullName}</div>
                        </div>
                    `).join('')}
                </div>

                <!-- Score Total -->
                <div class="comparison-row" style="grid-template-columns: 150px repeat(${numEmployees}, 1fr);">
                    <div class="comparison-cell"><strong>Score Total</strong></div>
                    ${employees.map(e => `
                        <div class="comparison-cell">
                            <div class="comparison-score ${getScoreClass(e.scoring.total)}">${e.scoring.total}</div>
                        </div>
                    `).join('')}
                </div>

                <!-- Asistencia -->
                <div class="comparison-row" style="grid-template-columns: 150px repeat(${numEmployees}, 1fr);">
                    <div class="comparison-cell">Asistencia</div>
                    ${employees.map(e => `
                        <div class="comparison-cell">${e.sections.attendance.attendanceRate || 0}%</div>
                    `).join('')}
                </div>

                <!-- Puntualidad -->
                <div class="comparison-row" style="grid-template-columns: 150px repeat(${numEmployees}, 1fr);">
                    <div class="comparison-cell">Puntualidad</div>
                    ${employees.map(e => `
                        <div class="comparison-cell">${e.sections.attendance.punctualityRate || 0}%</div>
                    `).join('')}
                </div>

                <!-- Sanciones -->
                <div class="comparison-row" style="grid-template-columns: 150px repeat(${numEmployees}, 1fr);">
                    <div class="comparison-cell">Sanciones</div>
                    ${employees.map(e => `
                        <div class="comparison-cell">${e.sections.sanctions.total || 0}</div>
                    `).join('')}
                </div>

                <!-- Capacitaciones -->
                <div class="comparison-row" style="grid-template-columns: 150px repeat(${numEmployees}, 1fr);">
                    <div class="comparison-cell">Capacitaciones</div>
                    ${employees.map(e => `
                        <div class="comparison-cell">${e.sections.training.completed || 0}</div>
                    `).join('')}
                </div>
            </div>

            ${comparison.analysis ? `
                <div class="ai-analysis mt-4">
                    <div class="ai-header">
                        <i class="fas fa-robot"></i>
                        <h3>Análisis Comparativo con IA</h3>
                    </div>
                    <div class="ai-content">
                        ${formatAIContent(comparison.analysis)}
                    </div>
                </div>
            ` : ''}
        `;

        showTab('overview');
    }

    // =========================================================================
    // EXPORTACIÓN PDF
    // =========================================================================

    async function exportToPDF() {
        if (!currentEmployee || !currentReport) {
            showNotification('Primero genere un expediente', 'warning');
            return;
        }

        showNotification('Preparando exportación PDF...', 'info');

        try {
            const response = await fetch(`${API_BASE}/${currentEmployee}/export/pdf`, {
                headers: getAuthHeaders()
            });

            if (!response.ok) throw new Error('Error exportando PDF');

            const data = await response.json();

            if (data.success) {
                // Por ahora, generamos PDF del lado del cliente usando los datos
                generateClientSidePDF(data.data.report);
            }
        } catch (error) {
            console.error('❌ [360°] Error exportando PDF:', error);
            showNotification('Error generando PDF', 'error');
        }
    }

    function generateClientSidePDF(report) {
        // Usar jsPDF si está disponible, sino mostrar mensaje
        if (typeof jspdf === 'undefined' && typeof jsPDF === 'undefined') {
            // Mostrar versión imprimible
            const printWindow = window.open('', '_blank');
            printWindow.document.write(generatePrintableHTML(report));
            printWindow.document.close();
            printWindow.print();
            return;
        }

        // TODO: Implementar generación con jsPDF
        showNotification('Funcionalidad PDF en desarrollo. Se abrió versión imprimible.', 'info');
        const printWindow = window.open('', '_blank');
        printWindow.document.write(generatePrintableHTML(report));
        printWindow.document.close();
        printWindow.print();
    }

    function generatePrintableHTML(report) {
        const emp = report.employee;
        const scoring = report.scoring;
        const flightRisk = report.flightRisk || {};
        const behaviorPatterns = report.behaviorPatterns || [];
        const attendance = report.sections?.attendance || {};
        const sanctions = report.sections?.sanctions || {};
        const training = report.sections?.training || {};
        const medical = report.sections?.medical || {};

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Expediente 360° - ${emp.fullName}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 40px; font-size: 12px; }
                    h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
                    h2 { color: #34495e; border-bottom: 1px solid #bdc3c7; padding-bottom: 5px; margin-top: 25px; }
                    h3 { color: #7f8c8d; margin-top: 20px; }
                    .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
                    .score-box { background: #f8f9fa; padding: 20px; border-radius: 10px; text-align: center; }
                    .score-value { font-size: 3rem; font-weight: bold; color: #3498db; }
                    .score-grade { font-size: 1.5rem; font-weight: bold; color: ${scoring.grade?.color || '#333'}; }
                    .section { margin-bottom: 30px; page-break-inside: avoid; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background: #3498db; color: white; }
                    .footer { margin-top: 40px; font-size: 0.8rem; color: #7f8c8d; text-align: center; border-top: 1px solid #ddd; padding-top: 15px; }
                    .risk-box { padding: 15px; border-radius: 8px; margin: 10px 0; }
                    .risk-low { background: #d4edda; border-left: 4px solid #28a745; }
                    .risk-medium { background: #fff3cd; border-left: 4px solid #ffc107; }
                    .risk-high { background: #f8d7da; border-left: 4px solid #dc3545; }
                    .risk-critical { background: #f5c6cb; border-left: 4px solid #c82333; }
                    .pattern-card { display: inline-block; padding: 10px 15px; margin: 5px; background: #f8f9fa; border-radius: 5px; border-left: 3px solid #6c757d; }
                    .pattern-ok { border-left-color: #28a745; }
                    .pattern-warning { border-left-color: #ffc107; }
                    .pattern-critical { border-left-color: #dc3545; }
                    .data-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
                    .data-item { background: #f8f9fa; padding: 10px; border-radius: 5px; }
                    .data-label { font-size: 0.75rem; color: #6c757d; text-transform: uppercase; }
                    .data-value { font-weight: bold; color: #2c3e50; }
                    @media print {
                        body { padding: 20px; }
                        .page-break { page-break-before: always; }
                    }
                </style>
            </head>
            <body>
                <!-- HEADER -->
                <div class="header">
                    <div>
                        <h1>Expediente 360° Premium</h1>
                        <p><strong>${emp.fullName}</strong></p>
                        <p>Legajo: ${emp.legajo || emp.employeeId || 'N/A'} | DNI: ${emp.dni || 'N/A'} | CUIL: ${emp.cuil || 'N/A'}</p>
                        <p>Departamento: ${emp.department?.name || 'Sin asignar'} | Cargo: ${emp.position || emp.role || 'N/A'}</p>
                        <p>Antigüedad: ${emp.tenure?.formatted || 'N/A'} | Estado: ${emp.isActive ? 'Activo' : 'Inactivo'}</p>
                    </div>
                    <div class="score-box">
                        <div class="score-value">${scoring.total}</div>
                        <div class="score-grade">${scoring.grade?.letter || 'N/A'}</div>
                        <div>${scoring.grade?.label || ''}</div>
                    </div>
                </div>

                <!-- SCORING 6 DIMENSIONES -->
                <div class="section">
                    <h2>Scoring Integral (6 Dimensiones)</h2>
                    <table>
                        <tr><th>Categoría</th><th>Puntaje</th><th>Peso</th></tr>
                        <tr><td>Asistencia</td><td>${scoring.categories?.attendance?.score || 0}</td><td>20%</td></tr>
                        <tr><td>Puntualidad</td><td>${scoring.categories?.punctuality?.score || 0}</td><td>20%</td></tr>
                        <tr><td>Disciplina</td><td>${scoring.categories?.discipline?.score || 0}</td><td>15%</td></tr>
                        <tr><td>Capacitación</td><td>${scoring.categories?.training?.score || 0}</td><td>15%</td></tr>
                        <tr><td>Estabilidad</td><td>${scoring.categories?.stability?.score || 0}</td><td>15%</td></tr>
                        <tr><td>Salud</td><td>${scoring.categories?.health?.score || 0}</td><td>15%</td></tr>
                    </table>
                    ${scoring.additionalRolesBonus?.applied ? `<p><strong>Bonus por Roles Adicionales:</strong> +${scoring.additionalRolesBonus.totalBonusPercent}</p>` : ''}
                </div>

                <!-- ÍNDICE DE RIESGO DE FUGA -->
                <div class="section">
                    <h2>Índice de Riesgo de Fuga</h2>
                    <div class="risk-box risk-${flightRisk.level || 'low'}">
                        <strong>Riesgo: ${flightRisk.score || 0}% - ${flightRisk.label || 'BAJO'}</strong>
                        <p>${flightRisk.insight || 'Sin datos suficientes para calcular riesgo.'}</p>
                    </div>
                    ${flightRisk.factors && flightRisk.factors.length > 0 ? `
                        <h3>Factores de Riesgo Detectados:</h3>
                        <ul>
                            ${flightRisk.factors.map(f => `<li><strong>${f.factor}:</strong> +${f.impact} pts - ${f.detail || ''}</li>`).join('')}
                        </ul>
                    ` : ''}
                    ${flightRisk.recommendations && flightRisk.recommendations.length > 0 ? `
                        <h3>Recomendaciones de Retención:</h3>
                        <table>
                            <tr><th>Prioridad</th><th>Acción</th><th>Plazo</th></tr>
                            ${flightRisk.recommendations.map(r => `<tr><td>${r.priority}</td><td>${r.action}</td><td>${r.timeframe}</td></tr>`).join('')}
                        </table>
                    ` : ''}
                </div>

                <!-- PATRONES DE COMPORTAMIENTO -->
                ${behaviorPatterns.length > 0 ? `
                    <div class="section">
                        <h2>Patrones de Comportamiento Detectados</h2>
                        ${behaviorPatterns.map(p => `
                            <div class="pattern-card pattern-${p.status}">
                                <strong>${p.name}</strong> - ${p.statusLabel}<br>
                                <small>${p.stats}</small>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}

                <!-- DATA SHEET DEL EMPLEADO -->
                <div class="section page-break">
                    <h2>Data Sheet Completo</h2>
                    <div class="data-grid">
                        <div class="data-item"><div class="data-label">Email</div><div class="data-value">${emp.email || 'N/A'}</div></div>
                        <div class="data-item"><div class="data-label">Teléfono</div><div class="data-value">${emp.phone || 'N/A'}</div></div>
                        <div class="data-item"><div class="data-label">Fecha Nacimiento</div><div class="data-value">${emp.birthDate ? new Date(emp.birthDate).toLocaleDateString('es-AR') : 'N/A'}</div></div>
                        <div class="data-item"><div class="data-label">Edad</div><div class="data-value">${emp.age ? emp.age + ' años' : 'N/A'}</div></div>
                        <div class="data-item"><div class="data-label">Fecha Ingreso</div><div class="data-value">${emp.hireDate ? new Date(emp.hireDate).toLocaleDateString('es-AR') : 'N/A'}</div></div>
                        <div class="data-item"><div class="data-label">Horario</div><div class="data-value">${emp.workSchedule || 'Estándar'}</div></div>
                        <div class="data-item"><div class="data-label">Contacto Emergencia</div><div class="data-value">${emp.emergencyContact || 'No registrado'}</div></div>
                        <div class="data-item"><div class="data-label">Último Login</div><div class="data-value">${emp.lastLogin ? new Date(emp.lastLogin).toLocaleString('es-AR') : 'N/A'}</div></div>
                    </div>
                    <h3>Autorizaciones</h3>
                    <p>App Móvil: ${emp.canUseMobileApp ? 'Sí' : 'No'} | Kiosk: ${emp.canUseKiosk ? 'Sí' : 'No'} | Autorizar Tardanzas: ${emp.canAuthorizeLateArrivals ? 'Sí' : 'No'}</p>
                    <h3>Datos Biométricos</h3>
                    <p>Huella: ${emp.hasFingerprint ? 'Registrada' : 'No'} | Rostro: ${emp.hasFacialData ? 'Registrado' : 'No'} | 2FA: ${emp.twoFactorEnabled ? 'Activo' : 'No'}</p>
                </div>

                <!-- RESUMEN DE ASISTENCIA -->
                <div class="section">
                    <h2>Resumen de Asistencia</h2>
                    <table>
                        <tr><th>Métrica</th><th>Valor</th></tr>
                        <tr><td>Días Trabajados</td><td>${attendance.totalDays || 0}</td></tr>
                        <tr><td>Tasa de Asistencia</td><td>${attendance.attendanceRate || 0}%</td></tr>
                        <tr><td>Tasa de Puntualidad</td><td>${attendance.punctualityRate || 0}%</td></tr>
                        <tr><td>Llegadas Tarde</td><td>${attendance.lateArrivals || 0}</td></tr>
                        <tr><td>Salidas Tempranas</td><td>${attendance.earlyDepartures || 0}</td></tr>
                        <tr><td>Ausencias</td><td>${attendance.absences || 0}</td></tr>
                        <tr><td>Horas Trabajadas</td><td>${attendance.totalHoursWorked || 0}h</td></tr>
                    </table>
                </div>

                <!-- HISTORIAL DISCIPLINARIO -->
                <div class="section">
                    <h2>Historial Disciplinario</h2>
                    <p>Total Sanciones: ${sanctions.total || 0}</p>
                    ${sanctions.total > 0 ? `
                        <p>Desglose: Escritas: ${sanctions.severity?.written || 0} | Suspensiones: ${sanctions.severity?.suspension || 0} | Verbales: ${sanctions.severity?.verbal || 0}</p>
                    ` : '<p>Sin sanciones registradas.</p>'}
                </div>

                <!-- CAPACITACIONES -->
                <div class="section">
                    <h2>Capacitaciones</h2>
                    <p>Completadas: ${training.completed || 0} | Pendientes: ${training.pending || 0} | Horas Totales: ${training.totalTrainingHours || 0}h</p>
                    <p>Tasa de Completitud: ${training.completionRate || 0}%</p>
                </div>

                <!-- HISTORIAL MÉDICO -->
                <div class="section">
                    <h2>Historial Médico (Confidencial)</h2>
                    <p>Certificados Médicos: ${medical.totalCertificates || 0} | Días de Licencia: ${medical.totalDaysOff || 0}</p>
                </div>

                <!-- ============================================= -->
                <!-- SECCIONES NUEVAS - EXPEDIENTE 360° COMPLETO v3.0 -->
                <!-- ============================================= -->

                ${generateFamilySection(report)}
                ${generateEducationSection(report)}
                ${generateLaboralSection(report)}
                ${generateDocumentsSection(report)}

                <!-- ANÁLISIS IA -->
                ${report.aiAnalysis?.analysis ? `
                    <div class="section page-break">
                        <h2>Análisis con Inteligencia Artificial</h2>
                        <p><em>Generado por: ${report.aiAnalysis.model || 'Llama 3.1'}</em></p>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                            ${report.aiAnalysis.analysis.replace(/\n/g, '<br>')}
                        </div>
                    </div>
                ` : ''}

                <!-- FOOTER -->
                <div class="footer">
                    <p><strong>DOCUMENTO CONFIDENCIAL - USO INTERNO</strong></p>
                    <p>Expediente generado el ${new Date().toLocaleString('es-AR')} | Sistema de Expediente 360° v${report.metadata?.version || '2.0'}</p>
                    <p>Período analizado: ${report.period?.from ? new Date(report.period.from).toLocaleDateString('es-AR') : 'N/A'} - ${report.period?.to ? new Date(report.period.to).toLocaleDateString('es-AR') : 'N/A'}</p>
                    <p>Completitud de datos: ${report.metadata?.dataCompleteness || 0}%</p>
                </div>
            </body>
            </html>
        `;
    }

    // =========================================================================
    // FUNCIONES HELPER PARA PDF - EXPEDIENTE 360° COMPLETO v3.0
    // =========================================================================

    function generateFamilySection(report) {
        const userData = report.completeUserData || {};
        const family = userData.family || {};
        const consents = userData.consents || {};

        return `
            <div class="section page-break">
                <h2>Grupo Familiar y Consentimientos</h2>

                <!-- Estado Civil -->
                <h3>Estado Civil</h3>
                ${family.maritalStatus ? `
                    <p><strong>Estado:</strong> ${family.maritalStatus.status || 'No especificado'}
                    ${family.maritalStatus.spouse_name ? ` | <strong>Cónyuge:</strong> ${family.maritalStatus.spouse_name}` : ''}
                    ${family.maritalStatus.since ? ` | <strong>Desde:</strong> ${new Date(family.maritalStatus.since).toLocaleDateString('es-AR')}` : ''}</p>
                ` : '<p>Sin información de estado civil registrada.</p>'}

                <!-- Hijos -->
                <h3>Hijos (${family.children?.length || 0})</h3>
                ${family.children && family.children.length > 0 ? `
                    <table>
                        <tr><th>Nombre</th><th>Fecha Nacimiento</th></tr>
                        ${family.children.map(c => `<tr><td>${c.name || 'Sin nombre'}</td><td>${c.birth_date ? new Date(c.birth_date).toLocaleDateString('es-AR') : 'N/A'}</td></tr>`).join('')}
                    </table>
                ` : '<p>Sin hijos registrados.</p>'}

                <!-- Otros Familiares -->
                ${family.familyMembers && family.familyMembers.length > 0 ? `
                    <h3>Otros Familiares</h3>
                    <table>
                        <tr><th>Nombre</th><th>Relación</th><th>Contacto</th></tr>
                        ${family.familyMembers.map(m => `<tr><td>${m.name || 'N/A'}</td><td>${m.relationship || 'N/A'}</td><td>${m.phone || 'N/A'}</td></tr>`).join('')}
                    </table>
                ` : ''}

                <!-- Consentimientos -->
                <h3>Consentimientos y Autorizaciones</h3>
                <table>
                    <tr><th>Tipo</th><th>Estado</th></tr>
                    <tr><td>Datos Biométricos</td><td>${consents.hasBiometricConsent ? 'AUTORIZADO' : 'NO AUTORIZADO'}</td></tr>
                    <tr><td>Análisis Emocional</td><td>${consents.hasEmotionalAnalysisConsent ? 'AUTORIZADO' : 'NO AUTORIZADO'}</td></tr>
                </table>
            </div>
        `;
    }

    function generateEducationSection(report) {
        const userData = report.completeUserData || {};
        const education = userData.education || {};

        if (!education.education || education.education.length === 0) {
            return `
                <div class="section">
                    <h2>Formación Académica</h2>
                    <p>Sin formación académica registrada.</p>
                </div>
            `;
        }

        return `
            <div class="section">
                <h2>Formación Académica</h2>
                ${education.highestDegree ? `<p><strong>Máximo nivel alcanzado:</strong> ${education.highestDegree}</p>` : ''}
                <table>
                    <tr><th>Nivel</th><th>Institución</th><th>Título</th><th>Estado</th><th>Año</th></tr>
                    ${education.education.map(edu => `
                        <tr>
                            <td>${edu.level || edu.degree_type || 'N/A'}</td>
                            <td>${edu.institution || 'N/A'}</td>
                            <td>${edu.title || edu.degree_name || 'N/A'}</td>
                            <td>${edu.completed ? 'Completo' : 'En curso'}</td>
                            <td>${edu.graduation_year || edu.year_completed || 'N/A'}</td>
                        </tr>
                    `).join('')}
                </table>
            </div>
        `;
    }

    function generateLaboralSection(report) {
        const userData = report.completeUserData || {};
        const workHistory = userData.previousWorkHistory || {};
        const salary = userData.salary || {};
        const shifts = userData.assignedShifts || {};
        const tasks = userData.tasks || {};
        const permissions = userData.permissionRequests || {};
        const unionLegal = userData.unionAndLegal || {};

        return `
            <div class="section page-break">
                <h2>Información Laboral Completa</h2>

                <!-- Configuración Salarial -->
                <h3>Configuración Salarial</h3>
                ${salary.currentSalary ? `
                    <table>
                        <tr><th>Concepto</th><th>Valor</th></tr>
                        <tr><td>Salario Base</td><td>$${salary.currentSalary.base_salary || 0}</td></tr>
                        <tr><td>Moneda</td><td>${salary.currentSalary.currency || 'ARS'}</td></tr>
                        <tr><td>Frecuencia de Pago</td><td>${salary.currentSalary.payment_frequency || 'Mensual'}</td></tr>
                        <tr><td>Vigente desde</td><td>${salary.currentSalary.effective_date ? new Date(salary.currentSalary.effective_date).toLocaleDateString('es-AR') : 'N/A'}</td></tr>
                    </table>
                ` : '<p>Sin configuración salarial registrada.</p>'}

                <!-- Turnos Asignados -->
                <h3>Turnos Asignados (${shifts.totalAssigned || 0})</h3>
                ${shifts.shifts && shifts.shifts.length > 0 ? `
                    <table>
                        <tr><th>Turno</th><th>Horario</th><th>Tipo</th></tr>
                        ${shifts.shifts.map(s => `
                            <tr>
                                <td>${s.shift_name || s.name || 'Sin nombre'}${s.is_primary ? ' (Principal)' : ''}</td>
                                <td>${s.start_time || 'N/A'} - ${s.end_time || 'N/A'}</td>
                                <td>${s.is_active !== false ? 'Activo' : 'Inactivo'}</td>
                            </tr>
                        `).join('')}
                    </table>
                ` : '<p>Sin turnos asignados.</p>'}

                <!-- Historial Laboral Previo -->
                <h3>Historial Laboral Previo (${workHistory.totalRecords || 0} empleos)</h3>
                ${workHistory.previousJobs && workHistory.previousJobs.length > 0 ? `
                    <table>
                        <tr><th>Empresa</th><th>Cargo</th><th>Período</th><th>Motivo Salida</th></tr>
                        ${workHistory.previousJobs.map(job => `
                            <tr>
                                <td>${job.company_name || 'N/A'}</td>
                                <td>${job.position || job.job_title || 'N/A'}</td>
                                <td>${job.start_date ? new Date(job.start_date).toLocaleDateString('es-AR') : 'N/A'} - ${job.end_date ? new Date(job.end_date).toLocaleDateString('es-AR') : 'Presente'}</td>
                                <td>${job.reason_for_leaving || 'N/A'}</td>
                            </tr>
                        `).join('')}
                    </table>
                ` : '<p>Sin historial laboral previo registrado.</p>'}

                <!-- Información Sindical -->
                <h3>Información Sindical y Legal</h3>
                ${unionLegal.unionAffiliation ? `
                    <p><strong>Sindicato:</strong> ${unionLegal.unionAffiliation.union_name || 'N/A'} |
                    <strong>N° Afiliado:</strong> ${unionLegal.unionAffiliation.member_id || 'N/A'} |
                    <strong>Delegado:</strong> ${unionLegal.isDelegate ? 'Sí' : 'No'}</p>
                ` : '<p>No afiliado a sindicato.</p>'}
                ${unionLegal.legalIssues && unionLegal.legalIssues.length > 0 ? `
                    <p><strong>Cuestiones Legales:</strong> ${unionLegal.legalIssues.length} casos registrados</p>
                ` : ''}

                <!-- Tareas -->
                <h3>Tareas Asignadas</h3>
                <p>Pendientes: ${tasks.pendingTasks || 0} | Completadas: ${tasks.completedTasks || 0} | Vencidas: ${tasks.overdueTasks || 0}</p>

                <!-- Permisos -->
                <h3>Solicitudes de Permisos (Período)</h3>
                <p>Aprobados: ${permissions.approved || 0} | Rechazados: ${permissions.rejected || 0} | Pendientes: ${permissions.pending || 0}</p>
            </div>
        `;
    }

    function generateDocumentsSection(report) {
        const userData = report.completeUserData || {};
        const docs = userData.documents || {};

        return `
            <div class="section page-break">
                <h2>Documentos y Licencias</h2>

                <!-- Resumen -->
                <p><strong>Documentos Generales:</strong> ${docs.summary?.totalDocuments || 0} |
                <strong>Documentos Médicos:</strong> ${docs.summary?.totalMedical || 0} |
                <strong>Licencias Profesionales:</strong> ${docs.professionalLicenses?.length || 0}</p>

                <!-- Licencia de Conducir -->
                <h3>Licencia de Conducir</h3>
                ${docs.driverLicense ? `
                    <table>
                        <tr><th>Campo</th><th>Valor</th></tr>
                        <tr><td>Número</td><td>${docs.driverLicense.license_number || 'N/A'}</td></tr>
                        <tr><td>Categoría</td><td>${docs.driverLicense.category || docs.driverLicense.license_class || 'N/A'}</td></tr>
                        <tr><td>Emisión</td><td>${docs.driverLicense.issue_date ? new Date(docs.driverLicense.issue_date).toLocaleDateString('es-AR') : 'N/A'}</td></tr>
                        <tr><td>Vencimiento</td><td>${docs.driverLicense.expiry_date ? new Date(docs.driverLicense.expiry_date).toLocaleDateString('es-AR') : 'N/A'}</td></tr>
                    </table>
                ` : '<p>Sin licencia de conducir registrada.</p>'}

                <!-- Licencias Profesionales -->
                ${docs.professionalLicenses && docs.professionalLicenses.length > 0 ? `
                    <h3>Licencias y Certificaciones Profesionales</h3>
                    <table>
                        <tr><th>Licencia</th><th>Número</th><th>Otorgante</th><th>Vencimiento</th></tr>
                        ${docs.professionalLicenses.map(lic => `
                            <tr>
                                <td>${lic.name || lic.license_type || 'N/A'}</td>
                                <td>${lic.license_number || 'N/A'}</td>
                                <td>${lic.issuing_authority || 'N/A'}</td>
                                <td>${lic.expiry_date ? new Date(lic.expiry_date).toLocaleDateString('es-AR') : 'N/A'}</td>
                            </tr>
                        `).join('')}
                    </table>
                ` : ''}

                <!-- Documentos Generales -->
                ${docs.generalDocuments && docs.generalDocuments.length > 0 ? `
                    <h3>Documentos Generales</h3>
                    <table>
                        <tr><th>Documento</th><th>Tipo</th><th>Fecha</th><th>Vencimiento</th></tr>
                        ${docs.generalDocuments.slice(0, 10).map(doc => `
                            <tr>
                                <td>${doc.name || doc.document_name || 'Documento'}</td>
                                <td>${doc.type || doc.document_type || 'General'}</td>
                                <td>${doc.issue_date ? new Date(doc.issue_date).toLocaleDateString('es-AR') : 'N/A'}</td>
                                <td>${doc.expiry_date ? new Date(doc.expiry_date).toLocaleDateString('es-AR') : 'N/A'}</td>
                            </tr>
                        `).join('')}
                    </table>
                    ${docs.generalDocuments.length > 10 ? `<p><em>... y ${docs.generalDocuments.length - 10} documentos más.</em></p>` : ''}
                ` : ''}
            </div>
        `;
    }

    // =========================================================================
    // EVENT LISTENERS
    // =========================================================================

    function setupEventListeners() {
        // Selector de empleado
        document.getElementById('e360-employee-select')?.addEventListener('change', function() {
            const userId = this.value;
            if (userId) {
                document.getElementById('btn-generate-report').disabled = false;
                // Agregar a comparación con doble click
            } else {
                document.getElementById('btn-generate-report').disabled = true;
            }
        });

        // Botón generar reporte
        document.getElementById('btn-generate-report')?.addEventListener('click', function() {
            const userId = document.getElementById('e360-employee-select').value;
            if (userId) {
                const dateFrom = document.getElementById('e360-date-from').value;
                const dateTo = document.getElementById('e360-date-to').value;
                loadEmployeeReport(userId, { dateFrom, dateTo });
            }
        });

        // Botón comparar
        document.getElementById('btn-compare-employees')?.addEventListener('click', compareEmployees);

        // Botón exportar PDF
        document.getElementById('btn-export-pdf')?.addEventListener('click', exportToPDF);

        // Botón limpiar comparación
        document.getElementById('btn-clear-comparison')?.addEventListener('click', function() {
            comparisonList = [];
            updateComparisonUI();
        });

        // Tabs
        document.querySelectorAll('.e360-tab').forEach(tab => {
            tab.addEventListener('click', function() {
                showTab(this.dataset.tab);
            });
        });

        // Doble click para agregar a comparación
        document.getElementById('e360-employee-select')?.addEventListener('dblclick', function() {
            const userId = this.value;
            const selectedOption = this.options[this.selectedIndex];
            if (userId && selectedOption) {
                addToComparison(userId, selectedOption.textContent);
            }
        });
    }

    // =========================================================================
    // UTILIDADES
    // =========================================================================

    function showTab(tabName) {
        // Ocultar todos los contenidos
        document.querySelectorAll('.e360-tab-content').forEach(el => {
            el.style.display = 'none';
        });

        // Desactivar todos los tabs
        document.querySelectorAll('.e360-tab').forEach(el => {
            el.classList.remove('active');
        });

        // Mostrar contenido seleccionado
        const content = document.getElementById(`tab-${tabName}`);
        if (content) {
            content.style.display = 'block';
        }

        // Activar tab seleccionado
        const tab = document.querySelector(`.e360-tab[data-tab="${tabName}"]`);
        if (tab) {
            tab.classList.add('active');
        }
    }

    function showLoading() {
        const container = document.querySelector('.e360-content');
        if (!container) return; // Guard against missing DOM element
        container.innerHTML = `
            <div class="e360-loading">
                <div class="spinner"></div>
                <p>Generando expediente 360°...</p>
            </div>
        `;
    }

    function showPlaceholder() {
        const placeholder = document.getElementById('e360-placeholder');
        if (placeholder) {
            placeholder.style.display = 'block';
        }
        document.querySelectorAll('.e360-tab-content').forEach(el => {
            el.style.display = 'none';
        });
    }

    function enableActions() {
        const btnExport = document.getElementById('btn-export-pdf');
        if (btnExport) {
            btnExport.disabled = false;
        }
    }

    function getAuthHeaders() {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || window.authToken;
        return {
            'Authorization': `Bearer ${token}`
        };
    }

    function formatDate(dateStr) {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-AR');
    }

    function formatDateTime(dateStr) {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleString('es-AR');
    }

    function formatAIContent(content) {
        if (!content) return '';
        // Convertir markdown básico a HTML
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/^### (.*$)/gm, '<h4>$1</h4>')
            .replace(/^## (.*$)/gm, '<h3>$1</h3>')
            .replace(/^# (.*$)/gm, '<h2>$1</h2>')
            .replace(/^- (.*$)/gm, '<li>$1</li>')
            .replace(/\n/g, '<br>');
    }

    function getSanctionBadgeClass(type) {
        const classes = {
            'verbal': 'info',
            'written': 'warning',
            'suspension': 'danger',
            'termination': 'dark'
        };
        return classes[type] || 'secondary';
    }

    function getScoreClass(score) {
        if (score >= 90) return 'excellent';
        if (score >= 75) return 'good';
        if (score >= 60) return 'average';
        return 'poor';
    }

    function showNotification(message, type = 'info') {
        // Usar el sistema de notificaciones del panel si existe
        if (window.showToast) {
            window.showToast(message, type);
        } else if (window.Swal) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: type,
                title: message,
                showConfirmButton: false,
                timer: 3000
            });
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
            alert(message);
        }
    }

    async function regenerateAIAnalysis() {
        if (!currentEmployee) return;

        showNotification('Regenerando análisis IA...', 'info');

        try {
            const response = await fetch(`${API_BASE}/${currentEmployee}/ai-analysis`, {
                headers: getAuthHeaders()
            });

            if (!response.ok) throw new Error('Error regenerando análisis');

            const data = await response.json();

            if (data.success && data.data.aiAnalysis) {
                currentReport.aiAnalysis = data.data.aiAnalysis;
                renderAIAnalysisTab(currentReport);
                showTab('ai-analysis');
                showNotification('Análisis IA regenerado', 'success');
            }
        } catch (error) {
            console.error('❌ [360°] Error regenerando análisis IA:', error);
            showNotification('Error regenerando análisis IA', 'error');
        }
    }

    // =========================================================================
    // EXPOSICIÓN GLOBAL
    // =========================================================================

    window.Employee360 = {
        init,
        loadEmployeeReport,
        addToComparison,
        removeFromComparison,
        compareEmployees,
        exportToPDF,
        regenerateAIAnalysis
    };

    // Alias para sistema de carga dinámica (patrón estándar del sistema)
    window.showEmployee360Content = init;
    window['showEmployee-360Content'] = init;  // Para DYNAMIC-LOAD

    // Auto-inicialización removida - el sistema de carga dinámica llama a init()
    // La función showEmployee360Content se encarga de la inicialización

})();
