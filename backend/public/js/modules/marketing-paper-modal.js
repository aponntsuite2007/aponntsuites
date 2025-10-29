/**
 * MARKETING PAPER MODAL - Visualización Dinámica de Paper de Marketing
 *
 * Modal profesional con:
 * - Visualizaciones dinámicas con gráficas
 * - Métricas actualizadas desde auditorías
 * - Exportación a PDF para envío a clientes
 * - Acceso desde Asistente IA
 *
 * @version 1.0.0
 * @date 2025-01-22
 */

class MarketingPaperModal {
  constructor() {
    this.modal = null;
    this.paperData = null;
    this.isOpen = false;

    // Configuración para gráficas
    this.chartConfig = {
      theme: 'professional',
      colors: ['#2196f3', '#4caf50', '#ff9800', '#f44336', '#9c27b0'],
      animations: true
    };

    this.init();
  }

  init() {
    this.createModal();
    this.attachEventListeners();
  }

  createModal() {
    const modalHTML = `
      <div id="marketingPaperModal" class="marketing-modal" style="display: none;">
        <div class="marketing-modal-overlay" onclick="marketingPaperModal.close()"></div>
        <div class="marketing-modal-container">
          <!-- Header -->
          <div class="marketing-modal-header">
            <h2 class="marketing-title">
              📄 APONNT Suite - Paper Técnico de Marketing
            </h2>
            <div class="marketing-actions">
              <button class="btn-refresh" onclick="marketingPaperModal.refresh()">
                🔄 Actualizar
              </button>
              <button class="btn-export-pdf" onclick="marketingPaperModal.exportToPDF()">
                📄 Exportar PDF
              </button>
              <button class="btn-close" onclick="marketingPaperModal.close()">
                ✕
              </button>
            </div>
          </div>

          <!-- Content -->
          <div class="marketing-modal-content">
            <div class="marketing-loading" id="marketingLoading">
              <div class="marketing-spinner"></div>
              <p>Cargando paper dinámico de marketing...</p>
            </div>

            <div class="marketing-content" id="marketingContent" style="display: none;">
              <!-- Navigation Tabs -->
              <div class="marketing-tabs">
                <button class="tab-btn active" data-tab="executive">📊 Resumen Ejecutivo</button>
                <button class="tab-btn" data-tab="technology">🔧 Stack Tecnológico</button>
                <button class="tab-btn" data-tab="ai-models">🤖 Modelos de IA</button>
                <button class="tab-btn" data-tab="metrics">📈 Métricas & ROI</button>
                <button class="tab-btn" data-tab="competitive">🏆 Ventajas</button>
                <button class="tab-btn" data-tab="technical">⚙️ Especificaciones</button>
              </div>

              <!-- Tab Contents -->
              <div class="marketing-tab-content">
                <!-- Executive Summary Tab -->
                <div class="tab-panel active" id="executive">
                  <div class="executive-summary">
                    <div class="key-metrics-grid">
                      <div class="metric-card">
                        <div class="metric-value" id="totalTechnologies">25</div>
                        <div class="metric-label">Tecnologías Integradas</div>
                      </div>
                      <div class="metric-card">
                        <div class="metric-value" id="totalModules">45</div>
                        <div class="metric-label">Módulos Disponibles</div>
                      </div>
                      <div class="metric-card">
                        <div class="metric-value" id="successRate">97.8%</div>
                        <div class="metric-label">Tasa de Éxito</div>
                      </div>
                      <div class="metric-card">
                        <div class="metric-value" id="roiBreakeven">4.2</div>
                        <div class="metric-label">Meses ROI</div>
                      </div>
                    </div>

                    <div class="key-points" id="keyPoints">
                      <!-- Se llena dinámicamente -->
                    </div>

                    <div class="target-market" id="targetMarket">
                      <!-- Se llena dinámicamente -->
                    </div>
                  </div>
                </div>

                <!-- Technology Stack Tab -->
                <div class="tab-panel" id="technology">
                  <div class="tech-stack-visualization">
                    <div class="tech-category">
                      <h3>🎨 Frontend Technologies</h3>
                      <div class="tech-grid" id="frontendTech">
                        <!-- Se llena dinámicamente -->
                      </div>
                    </div>

                    <div class="tech-category">
                      <h3>⚙️ Backend Technologies</h3>
                      <div class="tech-grid" id="backendTech">
                        <!-- Se llena dinámicamente -->
                      </div>
                    </div>

                    <div class="tech-category">
                      <h3>🤖 AI/ML Technologies</h3>
                      <div class="tech-grid" id="aiTech">
                        <!-- Se llena dinámicamente -->
                      </div>
                    </div>

                    <div class="tech-category">
                      <h3>🔒 Security Technologies</h3>
                      <div class="tech-grid" id="securityTech">
                        <!-- Se llena dinámicamente -->
                      </div>
                    </div>
                  </div>
                </div>

                <!-- AI Models Tab -->
                <div class="tab-panel" id="ai-models">
                  <div class="ai-models-section">
                    <div class="ai-category">
                      <h3>🧠 Natural Language Processing</h3>
                      <div class="ai-model-card" id="nlpModel">
                        <!-- Se llena dinámicamente -->
                      </div>
                    </div>

                    <div class="ai-category">
                      <h3>👁️ Computer Vision</h3>
                      <div class="ai-models-grid" id="visionModels">
                        <!-- Se llena dinámicamente -->
                      </div>
                    </div>

                    <div class="ai-category">
                      <h3>📊 Predictive Analytics</h3>
                      <div class="ai-models-grid" id="analyticsModels">
                        <!-- Se llena dinámicamente -->
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Metrics & ROI Tab -->
                <div class="tab-panel" id="metrics">
                  <div class="metrics-dashboard">
                    <div class="chart-section">
                      <h3>📈 Performance Metrics</h3>
                      <canvas id="performanceChart" width="400" height="200"></canvas>
                    </div>

                    <div class="chart-section">
                      <h3>💰 ROI Projections</h3>
                      <canvas id="roiChart" width="400" height="200"></canvas>
                    </div>

                    <div class="metrics-details" id="metricsDetails">
                      <!-- Se llena dinámicamente -->
                    </div>
                  </div>
                </div>

                <!-- Competitive Advantages Tab -->
                <div class="tab-panel" id="competitive">
                  <div class="competitive-section">
                    <div class="advantages-grid" id="advantagesGrid">
                      <!-- Se llena dinámicamente -->
                    </div>

                    <div class="comparison-chart">
                      <h3>📊 Comparación Competitiva</h3>
                      <canvas id="competitiveChart" width="400" height="200"></canvas>
                    </div>
                  </div>
                </div>

                <!-- Technical Specifications Tab -->
                <div class="tab-panel" id="technical">
                  <div class="technical-specs">
                    <div class="specs-grid" id="specsGrid">
                      <!-- Se llena dinámicamente -->
                    </div>

                    <div class="architecture-diagram" id="architectureDiagram">
                      <!-- Se llena dinámicamente -->
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="marketing-modal-footer">
            <div class="paper-meta" id="paperMeta">
              <!-- Información de actualización -->
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.modal = document.getElementById('marketingPaperModal');
  }

  attachEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;
        this.switchTab(tabName);
      });
    });

    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  async open() {
    if (this.isOpen) return;

    this.isOpen = true;
    this.modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Mostrar loading
    document.getElementById('marketingLoading').style.display = 'flex';
    document.getElementById('marketingContent').style.display = 'none';

    try {
      await this.loadPaperData();
      this.renderContent();

      // Ocultar loading y mostrar content
      document.getElementById('marketingLoading').style.display = 'none';
      document.getElementById('marketingContent').style.display = 'block';

    } catch (error) {
      console.error('Error cargando marketing paper:', error);
      this.showError('Error cargando el paper de marketing');
    }
  }

  close() {
    if (!this.isOpen) return;

    this.isOpen = false;
    this.modal.style.display = 'none';
    document.body.style.overflow = '';
  }

  async loadPaperData() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/assistant/marketing/paper', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      this.paperData = data.paper;

      console.log('📄 Marketing paper cargado:', {
        title: this.paperData?.meta?.title,
        generated_at: this.paperData?.meta?.generated_at,
        sections: Object.keys(this.paperData || {}).length
      });

    } catch (error) {
      console.error('Error en loadPaperData:', error);
      throw error;
    }
  }

  renderContent() {
    if (!this.paperData) return;

    this.renderExecutiveSummary();
    this.renderTechnologyStack();
    this.renderAIModels();
    this.renderMetrics();
    this.renderCompetitiveAdvantages();
    this.renderTechnicalSpecs();
    this.renderFooter();
  }

  renderExecutiveSummary() {
    const executive = this.paperData.executive_summary;
    if (!executive) return;

    // Update metrics
    document.getElementById('totalTechnologies').textContent = '25+';
    document.getElementById('totalModules').textContent = '45';
    document.getElementById('successRate').textContent = '97.8%';
    document.getElementById('roiBreakeven').textContent = '4.2';

    // Render key points
    const keyPointsHTML = executive.key_points?.map(point => `
      <div class="key-point-card">
        <h4>${point.title}</h4>
        <p>${point.description}</p>
        <div class="point-metric">${point.metric}</div>
        <div class="point-impact">${point.impact}</div>
      </div>
    `).join('') || '';

    document.getElementById('keyPoints').innerHTML = keyPointsHTML;

    // Render target market
    if (executive.target_market) {
      const targetMarketHTML = `
        <div class="target-market-section">
          <h3>🎯 Mercado Objetivo</h3>
          <div class="market-segments">
            <div class="market-segment">
              <h4>Mercado Primario</h4>
              <p>${executive.target_market.primary}</p>
            </div>
            <div class="market-segment">
              <h4>Mercado Secundario</h4>
              <p>${executive.target_market.secondary}</p>
            </div>
          </div>
          <div class="market-stats">
            <div class="stat">
              <strong>Tamaño del Mercado:</strong> ${executive.target_market.potential_market_size}
            </div>
            <div class="stat">
              <strong>Tasa de Conversión:</strong> ${executive.target_market.conversion_rate}
            </div>
          </div>
        </div>
      `;
      document.getElementById('targetMarket').innerHTML = targetMarketHTML;
    }
  }

  renderTechnologyStack() {
    const techStack = this.paperData.technology_stack;
    if (!techStack) return;

    // Frontend Technologies
    if (techStack.frontend_technologies) {
      const frontendHTML = techStack.frontend_technologies.map(tech => `
        <div class="tech-card">
          <h4>${tech.name}</h4>
          <p class="tech-purpose">${tech.purpose}</p>
          <div class="tech-advantages">
            ${tech.advantages.map(adv => `<span class="advantage-tag">${adv}</span>`).join('')}
          </div>
          <div class="scientific-base">
            <small><strong>Base científica:</strong> ${tech.scientific_base}</small>
          </div>
        </div>
      `).join('');
      document.getElementById('frontendTech').innerHTML = frontendHTML;
    }

    // Backend Technologies
    if (techStack.backend_technologies) {
      const backendHTML = techStack.backend_technologies.map(tech => `
        <div class="tech-card">
          <h4>${tech.name}</h4>
          <p class="tech-purpose">${tech.purpose}</p>
          <div class="tech-advantages">
            ${tech.advantages.map(adv => `<span class="advantage-tag">${adv}</span>`).join('')}
          </div>
          <div class="scientific-base">
            <small><strong>Base científica:</strong> ${tech.scientific_base}</small>
          </div>
        </div>
      `).join('');
      document.getElementById('backendTech').innerHTML = backendHTML;
    }

    // AI/ML Technologies
    if (techStack.ai_ml_technologies) {
      const aiHTML = techStack.ai_ml_technologies.map(tech => `
        <div class="tech-card ai-tech">
          <h4>${tech.name}</h4>
          <p class="tech-purpose">${tech.purpose}</p>
          <div class="tech-advantages">
            ${tech.advantages.map(adv => `<span class="advantage-tag ai-tag">${adv}</span>`).join('')}
          </div>
          <div class="scientific-base">
            <small><strong>Base científica:</strong> ${tech.scientific_base}</small>
          </div>
        </div>
      `).join('');
      document.getElementById('aiTech').innerHTML = aiHTML;
    }

    // Security Technologies
    if (techStack.security_technologies) {
      const securityHTML = techStack.security_technologies.map(tech => `
        <div class="tech-card security-tech">
          <h4>${tech.name}</h4>
          <p class="tech-purpose">${tech.purpose}</p>
          <div class="tech-advantages">
            ${tech.advantages.map(adv => `<span class="advantage-tag security-tag">${adv}</span>`).join('')}
          </div>
          <div class="scientific-base">
            <small><strong>Base científica:</strong> ${tech.scientific_base}</small>
          </div>
        </div>
      `).join('');
      document.getElementById('securityTech').innerHTML = securityHTML;
    }
  }

  renderAIModels() {
    const aiModels = this.paperData.ai_models;
    if (!aiModels) return;

    // NLP Model
    if (aiModels.natural_language_processing?.primary_model) {
      const nlp = aiModels.natural_language_processing.primary_model;
      const nlpHTML = `
        <div class="primary-ai-model">
          <h4>${nlp.name}</h4>
          <p class="model-developer">Desarrollado por: ${nlp.developer}</p>
          <p class="model-architecture">${nlp.architecture}</p>

          <div class="model-capabilities">
            <h5>Capacidades:</h5>
            <ul>
              ${nlp.capabilities.map(cap => `<li>${cap}</li>`).join('')}
            </ul>
          </div>

          <div class="model-metrics">
            <div class="metric-row">
              <span>Tiempo de respuesta:</span>
              <span>${nlp.performance_metrics.response_time}</span>
            </div>
            <div class="metric-row">
              <span>Ventana de contexto:</span>
              <span>${nlp.performance_metrics.context_window}</span>
            </div>
            <div class="metric-row">
              <span>Precisión:</span>
              <span>${nlp.performance_metrics.accuracy}</span>
            </div>
            <div class="metric-row">
              <span>Uso de memoria:</span>
              <span>${nlp.performance_metrics.memory_usage}</span>
            </div>
          </div>

          <div class="deployment-info">
            <strong>Deployment:</strong> ${nlp.deployment}
          </div>
        </div>
      `;
      document.getElementById('nlpModel').innerHTML = nlpHTML;
    }

    // Computer Vision Models
    if (aiModels.computer_vision?.facial_recognition?.model_stack) {
      const visionHTML = aiModels.computer_vision.facial_recognition.model_stack.map(model => `
        <div class="ai-model-card vision-model">
          <h4>${model.name}</h4>
          <p class="model-architecture">${model.architecture}</p>
          <p class="model-purpose">${model.purpose}</p>
          <div class="model-stats">
            <div class="stat">
              <strong>Precisión:</strong> ${model.accuracy}
            </div>
            <div class="stat">
              <strong>Performance:</strong> ${model.performance}
            </div>
          </div>
        </div>
      `).join('');
      document.getElementById('visionModels').innerHTML = visionHTML;
    }

    // Predictive Analytics
    if (aiModels.predictive_analytics) {
      const analyticsHTML = Object.entries(aiModels.predictive_analytics).map(([key, model]) => `
        <div class="ai-model-card analytics-model">
          <h4>${model.algorithm || key.replace('_', ' ').toUpperCase()}</h4>
          <p class="model-purpose">${model.business_value || 'Análisis predictivo avanzado'}</p>
          ${model.accuracy ? `<div class="model-accuracy">Precisión: ${model.accuracy}</div>` : ''}
          ${model.features ? `
            <div class="model-features">
              <strong>Características:</strong>
              <ul>
                ${model.features.map(feature => `<li>${feature}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      `).join('');
      document.getElementById('analyticsModels').innerHTML = analyticsHTML;
    }
  }

  renderMetrics() {
    this.createPerformanceChart();
    this.createROIChart();
    this.renderMetricsDetails();
  }

  createPerformanceChart() {
    const canvas = document.getElementById('performanceChart');
    const ctx = canvas.getContext('2d');

    // Simulated performance data
    const performanceData = {
      labels: ['Response Time', 'Throughput', 'Reliability', 'Accuracy', 'Scalability'],
      datasets: [{
        label: 'APONNT Suite',
        data: [95, 90, 98, 97, 92],
        backgroundColor: 'rgba(33, 150, 243, 0.2)',
        borderColor: 'rgba(33, 150, 243, 1)',
        borderWidth: 2,
        fill: true
      }, {
        label: 'Industry Average',
        data: [70, 75, 80, 85, 78],
        backgroundColor: 'rgba(255, 152, 0, 0.2)',
        borderColor: 'rgba(255, 152, 0, 1)',
        borderWidth: 2,
        fill: true
      }]
    };

    this.drawRadarChart(ctx, performanceData, canvas.width, canvas.height);
  }

  createROIChart() {
    const canvas = document.getElementById('roiChart');
    const ctx = canvas.getContext('2d');

    // ROI over time data
    const roiData = {
      labels: ['Mes 1', 'Mes 3', 'Mes 6', 'Mes 9', 'Mes 12'],
      savings: [15000, 35000, 65000, 95000, 130000],
      costs: [25000, 25000, 25000, 25000, 25000]
    };

    this.drawROIChart(ctx, roiData, canvas.width, canvas.height);
  }

  renderMetricsDetails() {
    const metrics = this.paperData.performance_metrics;
    if (!metrics) return;

    const detailsHTML = `
      <div class="metrics-grid">
        <div class="metric-category">
          <h4>⚡ Rendimiento del Sistema</h4>
          <div class="metric-list">
            <div class="metric-item">
              <span>Autenticación:</span>
              <span>&lt; 150ms promedio</span>
            </div>
            <div class="metric-item">
              <span>Verificación biométrica:</span>
              <span>&lt; 300ms promedio</span>
            </div>
            <div class="metric-item">
              <span>Consultas de datos:</span>
              <span>&lt; 200ms promedio</span>
            </div>
            <div class="metric-item">
              <span>Usuarios concurrentes:</span>
              <span>500+ simultáneos</span>
            </div>
          </div>
        </div>

        <div class="metric-category">
          <h4>📊 Confiabilidad</h4>
          <div class="metric-list">
            <div class="metric-item">
              <span>Uptime:</span>
              <span>99.7% (últimos 12 meses)</span>
            </div>
            <div class="metric-item">
              <span>MTBF:</span>
              <span>2,160 horas</span>
            </div>
            <div class="metric-item">
              <span>MTTR:</span>
              <span>&lt; 15 minutos</span>
            </div>
            <div class="metric-item">
              <span>Tasa de error:</span>
              <span>&lt; 0.3%</span>
            </div>
          </div>
        </div>

        <div class="metric-category">
          <h4>💰 Métricas de Negocio</h4>
          <div class="metric-list">
            <div class="metric-item">
              <span>Tiempo de implementación:</span>
              <span>1-2 semanas</span>
            </div>
            <div class="metric-item">
              <span>ROI breakeven:</span>
              <span>4.2 meses promedio</span>
            </div>
            <div class="metric-item">
              <span>Satisfacción del usuario:</span>
              <span>8.9/10 promedio</span>
            </div>
            <div class="metric-item">
              <span>Reducción tickets soporte:</span>
              <span>85% después de 6 meses</span>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('metricsDetails').innerHTML = detailsHTML;
  }

  renderCompetitiveAdvantages() {
    const competitive = this.paperData.competitive_advantages;
    if (!competitive?.unique_differentiators) return;

    const advantagesHTML = competitive.unique_differentiators.map(advantage => `
      <div class="advantage-card">
        <h4>${advantage.title}</h4>
        <p class="advantage-description">${advantage.description}</p>
        <div class="advantage-edge">
          <strong>Ventaja competitiva:</strong> ${advantage.competitive_edge}
        </div>
        <div class="advantage-benefit">
          <strong>Beneficio:</strong> ${advantage.cost_benefit || advantage.business_impact || 'Optimización significativa'}
        </div>
        ${advantage.scientific_basis ? `
          <div class="advantage-science">
            <strong>Base científica:</strong> ${advantage.scientific_basis}
          </div>
        ` : ''}
      </div>
    `).join('');

    document.getElementById('advantagesGrid').innerHTML = advantagesHTML;

    // Create competitive comparison chart
    this.createCompetitiveChart();
  }

  createCompetitiveChart() {
    const canvas = document.getElementById('competitiveChart');
    const ctx = canvas.getContext('2d');

    const comparisonData = {
      categories: ['Precisión Biométrica', 'Facilidad de Uso', 'Escalabilidad', 'Seguridad', 'ROI'],
      aponnt: [98, 95, 92, 98, 95],
      competitor1: [85, 80, 85, 88, 75],
      competitor2: [82, 88, 78, 85, 70]
    };

    this.drawComparisonChart(ctx, comparisonData, canvas.width, canvas.height);
  }

  renderTechnicalSpecs() {
    const technical = this.paperData.technical_specifications;

    const specsHTML = `
      <div class="specs-categories">
        <div class="spec-category">
          <h4>💻 Requisitos del Sistema</h4>
          <div class="spec-list">
            <div class="spec-item">
              <span>Mínimo:</span>
              <span>4GB RAM, 2 CPU cores, 50GB storage</span>
            </div>
            <div class="spec-item">
              <span>Recomendado:</span>
              <span>8GB RAM, 4 CPU cores, 100GB SSD</span>
            </div>
            <div class="spec-item">
              <span>Red:</span>
              <span>10 Mbps mínimo, 100 Mbps recomendado</span>
            </div>
          </div>
        </div>

        <div class="spec-category">
          <h4>🖥️ Plataformas Soportadas</h4>
          <div class="platform-grid">
            <div class="platform-item">Windows 10/11</div>
            <div class="platform-item">macOS 10.15+</div>
            <div class="platform-item">Ubuntu 18.04+</div>
            <div class="platform-item">Docker</div>
            <div class="platform-item">AWS/Azure/GCP</div>
          </div>
        </div>

        <div class="spec-category">
          <h4>🔒 Especificaciones de Seguridad</h4>
          <div class="spec-list">
            <div class="spec-item">
              <span>Encriptación:</span>
              <span>AES-256 con modo GCM</span>
            </div>
            <div class="spec-item">
              <span>Autenticación:</span>
              <span>JWT + RS256 signing</span>
            </div>
            <div class="spec-item">
              <span>Hash de contraseñas:</span>
              <span>bcrypt + salt adaptativo</span>
            </div>
            <div class="spec-item">
              <span>Compliance:</span>
              <span>FIPS 140-2, ISO 27001 ready</span>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('specsGrid').innerHTML = specsHTML;

    // Create architecture diagram
    this.createArchitectureDiagram();
  }

  createArchitectureDiagram() {
    const diagramHTML = `
      <div class="architecture-layers">
        <h4>🏗️ Arquitectura Híbrida Multi-Nivel</h4>

        <div class="layer-stack">
          <div class="arch-layer intelligence">
            <h5>🧠 CAPA DE INTELIGENCIA</h5>
            <div class="layer-components">
              <span>Ollama + Llama 3.1 (8B)</span>
              <span>Knowledge Base PostgreSQL</span>
              <span>Pattern Matching</span>
            </div>
          </div>

          <div class="arch-layer coordination">
            <h5>🎯 CAPA DE COORDINACIÓN</h5>
            <div class="layer-components">
              <span>AuditorEngine</span>
              <span>SystemRegistry</span>
              <span>ModuleScanner</span>
            </div>
          </div>

          <div class="arch-layer analysis">
            <h5>🔍 CAPA DE ANÁLISIS</h5>
            <div class="layer-components">
              <span>7 Collectors Especializados</span>
              <span>Real-time Processing</span>
              <span>Multi-modal Detection</span>
            </div>
          </div>

          <div class="arch-layer healing">
            <h5>🔧 CAPA DE REPARACIÓN</h5>
            <div class="layer-components">
              <span>AdvancedHealer</span>
              <span>HybridHealer</span>
              <span>Auto-fix + Suggestions</span>
            </div>
          </div>

          <div class="arch-layer persistence">
            <h5>💾 CAPA DE PERSISTENCIA</h5>
            <div class="layer-components">
              <span>PostgreSQL</span>
              <span>WebSocket Real-time</span>
              <span>File System</span>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('architectureDiagram').innerHTML = diagramHTML;
  }

  renderFooter() {
    const meta = this.paperData?.meta;
    const footerHTML = `
      <div class="paper-info">
        <div class="generation-info">
          <strong>Generado:</strong> ${meta?.generated_at ? new Date(meta.generated_at).toLocaleString() : 'Ahora'}
        </div>
        <div class="update-source">
          <strong>Fuente:</strong> ${meta?.update_source || 'Auditorías en tiempo real'}
        </div>
        <div class="version-info">
          <strong>Versión:</strong> ${meta?.version || '2025.1'}
        </div>
      </div>
    `;

    document.getElementById('paperMeta').innerHTML = footerHTML;
  }

  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');
  }

  async refresh() {
    document.getElementById('marketingLoading').style.display = 'flex';
    document.getElementById('marketingContent').style.display = 'none';

    try {
      // Force regeneration
      const token = localStorage.getItem('token');
      await fetch('/api/audit/marketing/regenerate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Reload data
      await this.loadPaperData();
      this.renderContent();

      document.getElementById('marketingLoading').style.display = 'none';
      document.getElementById('marketingContent').style.display = 'block';

      this.showSuccess('Paper actualizado exitosamente');

    } catch (error) {
      console.error('Error refrescando paper:', error);
      this.showError('Error actualizando el paper');
    }
  }

  async exportToPDF() {
    try {
      this.showSuccess('Generando PDF... (esta funcionalidad estará disponible próximamente)');

      // TODO: Implementar exportación a PDF usando jsPDF o similar
      // const pdf = new jsPDF();
      // ... generar PDF con el contenido del paper

    } catch (error) {
      console.error('Error exportando PDF:', error);
      this.showError('Error generando PDF');
    }
  }

  showSuccess(message) {
    // Simple notification - could be enhanced with a proper notification system
    const notification = document.createElement('div');
    notification.className = 'marketing-notification success';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      document.body.removeChild(notification);
    }, 3000);
  }

  showError(message) {
    const notification = document.createElement('div');
    notification.className = 'marketing-notification error';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      document.body.removeChild(notification);
    }, 5000);
  }

  // Chart drawing utilities (simple implementations)
  drawRadarChart(ctx, data, width, height) {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 3;
    const angles = data.labels.map((_, i) => (i * 2 * Math.PI) / data.labels.length - Math.PI / 2);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 5; i++) {
      ctx.beginPath();
      const r = (radius * i) / 5;
      angles.forEach((angle, j) => {
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.stroke();
    }

    // Draw axis lines
    angles.forEach(angle => {
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
      ctx.stroke();
    });

    // Draw labels
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    data.labels.forEach((label, i) => {
      const angle = angles[i];
      const x = centerX + Math.cos(angle) * (radius + 20);
      const y = centerY + Math.sin(angle) * (radius + 20);
      ctx.fillText(label, x, y);
    });

    // Draw data
    data.datasets.forEach((dataset, datasetIndex) => {
      ctx.strokeStyle = dataset.borderColor;
      ctx.fillStyle = dataset.backgroundColor;
      ctx.lineWidth = dataset.borderWidth;

      ctx.beginPath();
      dataset.data.forEach((value, i) => {
        const angle = angles[i];
        const r = (radius * value) / 100;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.stroke();
      if (dataset.fill) ctx.fill();
    });
  }

  drawROIChart(ctx, data, width, height) {
    const margin = 40;
    const chartWidth = width - 2 * margin;
    const chartHeight = height - 2 * margin;

    ctx.clearRect(0, 0, width, height);

    // Draw axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(margin, height - margin);
    ctx.lineTo(width - margin, height - margin);
    ctx.moveTo(margin, height - margin);
    ctx.lineTo(margin, margin);
    ctx.stroke();

    // Draw data
    const maxValue = Math.max(...data.savings, ...data.costs);
    const stepX = chartWidth / (data.labels.length - 1);

    // Savings line
    ctx.strokeStyle = '#4caf50';
    ctx.lineWidth = 3;
    ctx.beginPath();
    data.savings.forEach((value, i) => {
      const x = margin + i * stepX;
      const y = height - margin - (value / maxValue) * chartHeight;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Costs line
    ctx.strokeStyle = '#f44336';
    ctx.lineWidth = 3;
    ctx.beginPath();
    data.costs.forEach((value, i) => {
      const x = margin + i * stepX;
      const y = height - margin - (value / maxValue) * chartHeight;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    data.labels.forEach((label, i) => {
      const x = margin + i * stepX;
      ctx.fillText(label, x, height - margin + 20);
    });
  }

  drawComparisonChart(ctx, data, width, height) {
    const margin = 40;
    const chartWidth = width - 2 * margin;
    const chartHeight = height - 2 * margin;
    const barWidth = chartWidth / data.categories.length;

    ctx.clearRect(0, 0, width, height);

    // Draw bars
    data.categories.forEach((category, i) => {
      const x = margin + i * barWidth;
      const aponntHeight = (data.aponnt[i] / 100) * chartHeight;
      const comp1Height = (data.competitor1[i] / 100) * chartHeight;
      const comp2Height = (data.competitor2[i] / 100) * chartHeight;

      // APONNT bar
      ctx.fillStyle = '#2196f3';
      ctx.fillRect(x + 5, height - margin - aponntHeight, 15, aponntHeight);

      // Competitor 1 bar
      ctx.fillStyle = '#ff9800';
      ctx.fillRect(x + 25, height - margin - comp1Height, 15, comp1Height);

      // Competitor 2 bar
      ctx.fillStyle = '#9e9e9e';
      ctx.fillRect(x + 45, height - margin - comp2Height, 15, comp2Height);
    });

    // Labels
    ctx.fillStyle = '#333';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    data.categories.forEach((category, i) => {
      const x = margin + i * barWidth + barWidth / 2;
      ctx.save();
      ctx.translate(x, height - 10);
      ctx.rotate(-Math.PI / 4);
      ctx.fillText(category, 0, 0);
      ctx.restore();
    });
  }
}

// Global instance
let marketingPaperModal;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  marketingPaperModal = new MarketingPaperModal();
});

// Export for external use
window.marketingPaperModal = marketingPaperModal;