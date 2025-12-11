/**
 * ============================================================================
 * PROCESS CHAIN VISUALIZER - Componente Frontend
 * ============================================================================
 *
 * Visualiza cadenas de procesos de forma interactiva y profesional.
 *
 * Características:
 * - Muestra pasos de la cadena visualmente (stepper vertical)
 * - Indicadores de prerequisitos cumplidos/faltantes
 * - Tiempo estimado total
 * - Warnings y tips
 * - Ruta alternativa si aplica
 * - Botones de acción para iniciar proceso
 *
 * Uso:
 * const visualizer = new ProcessChainVisualizer();
 * visualizer.render(containerElement, processChainData);
 *
 * @version 1.0.0
 * @date 2025-12-11
 * ============================================================================
 */

(function() {
  'use strict';

  class ProcessChainVisualizer {
    constructor(options = {}) {
      this.config = {
        theme: options.theme || 'dark',
        showActions: options.showActions !== false,
        compact: options.compact || false,
        ...options
      };

      this.injectStyles();
    }

    /**
     * Renderiza la cadena de procesos en un contenedor
     * @param {HTMLElement} container - Contenedor donde renderizar
     * @param {Object} chainData - Datos de la cadena (del backend)
     */
    render(container, chainData) {
      if (!container) {
        console.error('[ProcessChainVisualizer] Container no válido');
        return;
      }

      if (!chainData) {
        container.innerHTML = '<p style="color: #64748b;">No hay cadena de procesos para mostrar.</p>';
        return;
      }

      // Construir HTML
      const html = this.buildChainHTML(chainData);
      container.innerHTML = html;

      // Bind eventos
      this.bindEvents(container, chainData);
    }

    /**
     * Construye el HTML completo de la cadena
     */
    buildChainHTML(chain) {
      let html = `<div class="pcv-chain ${this.config.compact ? 'compact' : ''}">`;

      // Header
      html += this.buildHeader(chain);

      // Prerequisitos faltantes (bloquea todo)
      if (chain.prerequisiteSteps && chain.prerequisiteSteps.length > 0) {
        html += this.buildPrerequisites(chain.prerequisiteSteps);
      }

      // Pasos del proceso (si puede proceder)
      if (chain.canProceed && chain.processSteps && chain.processSteps.length > 0) {
        html += this.buildSteps(chain.processSteps);
      }

      // Ruta alternativa
      if (chain.alternativeRoute) {
        html += this.buildAlternativeRoute(chain.alternativeRoute);
      }

      // Warnings
      if (chain.warnings && chain.warnings.length > 0) {
        html += this.buildWarnings(chain.warnings);
      }

      // Tips
      if (chain.tips && chain.tips.length > 0) {
        html += this.buildTips(chain.tips);
      }

      // Footer con tiempo estimado
      if (chain.estimatedTime || chain.expectedOutcome) {
        html += this.buildFooter(chain);
      }

      // Botones de acción
      if (this.config.showActions && chain.canProceed) {
        html += this.buildActions(chain);
      }

      html += '</div>';

      return html;
    }

    /**
     * Construye el header con título y estado
     */
    buildHeader(chain) {
      const canProceedClass = chain.canProceed ? 'success' : 'blocked';
      const canProceedIcon = chain.canProceed ? '' : 'L';
      const canProceedText = chain.canProceed ? 'Puede proceder' : 'Prerequisitos faltantes';

      return `
        <div class="pcv-header">
          <h3 class="pcv-title">
            <span class="pcv-icon">=</span>
            ${chain.action || 'Cadena de Procesos'}
          </h3>
          <div class="pcv-status ${canProceedClass}">
            <span>${canProceedIcon}</span>
            <span>${canProceedText}</span>
          </div>
        </div>
      `;
    }

    /**
     * Construye la sección de prerequisitos faltantes
     */
    buildPrerequisites(prereqs) {
      let html = `
        <div class="pcv-section pcv-prerequisites">
          <div class="pcv-section-header error">
            <span class="pcv-section-icon"> </span>
            <h4>Prerequisitos Faltantes (${prereqs.length})</h4>
          </div>
          <p class="pcv-section-desc">
            No puede realizar esta acción porque le faltan los siguientes datos:
          </p>
          <div class="pcv-prereq-list">
      `;

      prereqs.forEach((prereq, idx) => {
        html += `
          <div class="pcv-prereq-item">
            <div class="pcv-prereq-number">${idx + 1}</div>
            <div class="pcv-prereq-content">
              <div class="pcv-prereq-title">${prereq.missing}: ${prereq.description}</div>
              <div class="pcv-prereq-reason">Razón: ${prereq.reason}</div>
              <div class="pcv-prereq-fix">
                <strong>Cómo solucionarlo:</strong> ${prereq.howToFix}
              </div>
            </div>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;

      return html;
    }

    /**
     * Construye los pasos del proceso (stepper vertical)
     */
    buildSteps(steps) {
      let html = `
        <div class="pcv-section pcv-steps">
          <div class="pcv-section-header success">
            <span class="pcv-section-icon"></span>
            <h4>Pasos a Seguir (${steps.length})</h4>
          </div>
          <div class="pcv-stepper">
      `;

      steps.forEach((step, idx) => {
        const isLast = idx === steps.length - 1;

        html += `
          <div class="pcv-step ${isLast ? 'last' : ''}">
            <div class="pcv-step-indicator">
              <div class="pcv-step-number">${step.step || idx + 1}</div>
              ${!isLast ? '<div class="pcv-step-line"></div>' : ''}
            </div>
            <div class="pcv-step-content">
              <div class="pcv-step-description">${step.description}</div>
        `;

        if (step.validation) {
          html += `
            <div class="pcv-step-meta validation">
              <span class="pcv-meta-icon"> </span>
              <span>Validación: ${step.validation}</span>
            </div>
          `;
        }

        if (step.expectedTime) {
          html += `
            <div class="pcv-step-meta time">
              <span class="pcv-meta-icon">ñ</span>
              <span>Tiempo: ${step.expectedTime}</span>
            </div>
          `;
        }

        if (step.routingDetails) {
          html += `
            <div class="pcv-step-meta routing">
              <span class="pcv-meta-icon">=d</span>
              <span>Aprobador: ${step.routingDetails.primaryApprover.name}</span>
            </div>
          `;
        }

        html += `
            </div>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;

      return html;
    }

    /**
     * Construye la sección de ruta alternativa
     */
    buildAlternativeRoute(altRoute) {
      return `
        <div class="pcv-section pcv-alternative">
          <div class="pcv-section-header warning">
            <span class="pcv-section-icon">=</span>
            <h4>Ruta Alternativa Disponible</h4>
          </div>
          <p class="pcv-section-desc">${altRoute.reason}</p>
          <div class="pcv-alternative-module">
            Puede usar: <strong>${altRoute.module}</strong>
          </div>
        </div>
      `;
    }

    /**
     * Construye warnings
     */
    buildWarnings(warnings) {
      let html = `
        <div class="pcv-section pcv-warnings">
          <div class="pcv-section-header warning">
            <span class="pcv-section-icon"> </span>
            <h4>Advertencias</h4>
          </div>
          <ul class="pcv-warning-list">
      `;

      warnings.forEach(warning => {
        html += `<li>${warning}</li>`;
      });

      html += `
          </ul>
        </div>
      `;

      return html;
    }

    /**
     * Construye tips
     */
    buildTips(tips) {
      let html = `
        <div class="pcv-section pcv-tips">
          <div class="pcv-section-header info">
            <span class="pcv-section-icon">=¡</span>
            <h4>Tips Acumulados</h4>
          </div>
          <ul class="pcv-tips-list">
      `;

      tips.forEach(tip => {
        html += `<li>${tip}</li>`;
      });

      html += `
          </ul>
        </div>
      `;

      return html;
    }

    /**
     * Construye el footer con tiempo estimado y resultado esperado
     */
    buildFooter(chain) {
      return `
        <div class="pcv-footer">
          ${chain.estimatedTime ? `
            <div class="pcv-footer-item">
              <span class="pcv-footer-icon">ñ</span>
              <span class="pcv-footer-label">Tiempo estimado:</span>
              <span class="pcv-footer-value">${chain.estimatedTime}</span>
            </div>
          ` : ''}
          ${chain.expectedOutcome ? `
            <div class="pcv-footer-item">
              <span class="pcv-footer-icon"><¯</span>
              <span class="pcv-footer-label">Resultado esperado:</span>
              <span class="pcv-footer-value">${chain.expectedOutcome}</span>
            </div>
          ` : ''}
        </div>
      `;
    }

    /**
     * Construye botones de acción
     */
    buildActions(chain) {
      return `
        <div class="pcv-actions">
          <button class="pcv-btn pcv-btn-primary" data-action="start">
            Iniciar Proceso
          </button>
          <button class="pcv-btn pcv-btn-secondary" data-action="details">
            Ver Más Detalles
          </button>
        </div>
      `;
    }

    /**
     * Bind eventos de los botones
     */
    bindEvents(container, chainData) {
      const startBtn = container.querySelector('[data-action="start"]');
      const detailsBtn = container.querySelector('[data-action="details"]');

      if (startBtn) {
        startBtn.addEventListener('click', () => {
          this.onStartProcess(chainData);
        });
      }

      if (detailsBtn) {
        detailsBtn.addEventListener('click', () => {
          this.onShowDetails(chainData);
        });
      }
    }

    /**
     * Handler para iniciar proceso
     */
    onStartProcess(chainData) {
      console.log('[ProcessChainVisualizer] Iniciando proceso:', chainData);

      // Dispatch evento custom para que el sistema lo maneje
      window.dispatchEvent(new CustomEvent('processchain:start', {
        detail: chainData
      }));
    }

    /**
     * Handler para mostrar detalles
     */
    onShowDetails(chainData) {
      console.log('[ProcessChainVisualizer] Mostrando detalles:', chainData);

      // Abrir modal con JSON completo
      const modal = document.createElement('div');
      modal.className = 'pcv-modal';
      modal.innerHTML = `
        <div class="pcv-modal-content">
          <div class="pcv-modal-header">
            <h3>Detalles Completos de la Cadena</h3>
            <button class="pcv-modal-close">&times;</button>
          </div>
          <div class="pcv-modal-body">
            <pre>${JSON.stringify(chainData, null, 2)}</pre>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      // Cerrar modal
      modal.querySelector('.pcv-modal-close').addEventListener('click', () => {
        modal.remove();
      });

      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.remove();
        }
      });
    }

    /**
     * Inyecta estilos CSS
     */
    injectStyles() {
      if (document.getElementById('process-chain-visualizer-styles')) return;

      const styles = document.createElement('style');
      styles.id = 'process-chain-visualizer-styles';
      styles.textContent = `
        /* Process Chain Visualizer Styles */
        .pcv-chain {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 12px;
          padding: 20px;
          margin: 16px 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        .pcv-chain.compact {
          padding: 12px;
        }

        /* Header */
        .pcv-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid #334155;
        }

        .pcv-title {
          margin: 0;
          color: #f1f5f9;
          font-size: 18px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .pcv-icon {
          font-size: 24px;
        }

        .pcv-status {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .pcv-status.success {
          background: rgba(34, 197, 94, 0.15);
          color: #22c55e;
          border: 1px solid rgba(34, 197, 94, 0.3);
        }

        .pcv-status.blocked {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        /* Sections */
        .pcv-section {
          margin: 16px 0;
          padding: 16px;
          border-radius: 8px;
          border: 1px solid #334155;
        }

        .pcv-section-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
        }

        .pcv-section-header h4 {
          margin: 0;
          color: #f1f5f9;
          font-size: 15px;
        }

        .pcv-section-header.error {
          color: #ef4444;
        }

        .pcv-section-header.success {
          color: #22c55e;
        }

        .pcv-section-header.warning {
          color: #f59e0b;
        }

        .pcv-section-header.info {
          color: #3b82f6;
        }

        .pcv-section-desc {
          color: #94a3b8;
          font-size: 13px;
          margin: 0 0 12px 0;
        }

        /* Prerequisites */
        .pcv-prerequisites {
          background: rgba(239, 68, 68, 0.05);
          border-color: rgba(239, 68, 68, 0.3);
        }

        .pcv-prereq-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .pcv-prereq-item {
          display: flex;
          gap: 12px;
          background: #0f172a;
          padding: 12px;
          border-radius: 8px;
          border: 1px solid #334155;
        }

        .pcv-prereq-number {
          background: #ef4444;
          color: white;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 13px;
          flex-shrink: 0;
        }

        .pcv-prereq-content {
          flex: 1;
        }

        .pcv-prereq-title {
          color: #f1f5f9;
          font-weight: 600;
          font-size: 14px;
          margin-bottom: 6px;
        }

        .pcv-prereq-reason,
        .pcv-prereq-fix {
          color: #94a3b8;
          font-size: 12px;
          margin-bottom: 4px;
        }

        .pcv-prereq-fix strong {
          color: #f59e0b;
        }

        /* Steps Stepper */
        .pcv-steps {
          background: rgba(34, 197, 94, 0.05);
          border-color: rgba(34, 197, 94, 0.3);
        }

        .pcv-stepper {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .pcv-step {
          display: flex;
          gap: 16px;
        }

        .pcv-step-indicator {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .pcv-step-number {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 14px;
          flex-shrink: 0;
        }

        .pcv-step-line {
          width: 2px;
          background: linear-gradient(180deg, #6366f1 0%, #8b5cf6 100%);
          flex: 1;
          margin: 4px 0;
        }

        .pcv-step-content {
          flex: 1;
          padding-bottom: 20px;
        }

        .pcv-step.last .pcv-step-content {
          padding-bottom: 0;
        }

        .pcv-step-description {
          color: #e2e8f0;
          font-size: 14px;
          margin-bottom: 8px;
        }

        .pcv-step-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #94a3b8;
          margin-top: 6px;
        }

        .pcv-step-meta.validation {
          color: #f59e0b;
        }

        .pcv-step-meta.time {
          color: #3b82f6;
        }

        .pcv-step-meta.routing {
          color: #a78bfa;
        }

        .pcv-meta-icon {
          font-size: 14px;
        }

        /* Alternative Route */
        .pcv-alternative {
          background: rgba(251, 191, 36, 0.05);
          border-color: rgba(251, 191, 36, 0.3);
        }

        .pcv-alternative-module {
          background: #0f172a;
          padding: 10px 14px;
          border-radius: 6px;
          color: #f59e0b;
          font-size: 13px;
        }

        .pcv-alternative-module strong {
          color: #fbbf24;
        }

        /* Warnings */
        .pcv-warnings {
          background: rgba(251, 191, 36, 0.05);
          border-color: rgba(251, 191, 36, 0.3);
        }

        .pcv-warning-list {
          margin: 0;
          padding-left: 20px;
        }

        .pcv-warning-list li {
          color: #fbbf24;
          font-size: 13px;
          margin-bottom: 6px;
        }

        /* Tips */
        .pcv-tips {
          background: rgba(59, 130, 246, 0.05);
          border-color: rgba(59, 130, 246, 0.3);
        }

        .pcv-tips-list {
          margin: 0;
          padding-left: 20px;
        }

        .pcv-tips-list li {
          color: #93c5fd;
          font-size: 13px;
          margin-bottom: 6px;
        }

        /* Footer */
        .pcv-footer {
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid #334155;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .pcv-footer-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
        }

        .pcv-footer-icon {
          font-size: 16px;
        }

        .pcv-footer-label {
          color: #94a3b8;
        }

        .pcv-footer-value {
          color: #e2e8f0;
          font-weight: 600;
        }

        /* Actions */
        .pcv-actions {
          margin-top: 20px;
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }

        .pcv-btn {
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }

        .pcv-btn-primary {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
        }

        .pcv-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        }

        .pcv-btn-secondary {
          background: #334155;
          color: #e2e8f0;
        }

        .pcv-btn-secondary:hover {
          background: #475569;
        }

        /* Modal */
        .pcv-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
        }

        .pcv-modal-content {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 12px;
          max-width: 700px;
          max-height: 80vh;
          width: 90%;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .pcv-modal-header {
          padding: 16px 20px;
          border-bottom: 1px solid #334155;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .pcv-modal-header h3 {
          margin: 0;
          color: #f1f5f9;
          font-size: 16px;
        }

        .pcv-modal-close {
          background: none;
          border: none;
          color: #94a3b8;
          font-size: 24px;
          cursor: pointer;
        }

        .pcv-modal-body {
          padding: 20px;
          overflow-y: auto;
        }

        .pcv-modal-body pre {
          background: #0f172a;
          color: #e2e8f0;
          padding: 16px;
          border-radius: 8px;
          overflow-x: auto;
          font-size: 12px;
          line-height: 1.5;
        }
      `;

      document.head.appendChild(styles);
    }
  }

  // Exponer globalmente
  window.ProcessChainVisualizer = ProcessChainVisualizer;

  console.log('%c PROCESS CHAIN VISUALIZER v1.0 ', 'background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%); color: white; font-size: 12px; padding: 6px 10px; border-radius: 4px; font-weight: bold;');

})();
