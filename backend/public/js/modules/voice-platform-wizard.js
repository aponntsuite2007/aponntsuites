/**
 * VOICE PLATFORM - Wizard de Creación Inteligente
 *
 * Wizard de 4 pasos para crear experiencias con IA de similitud
 * Pasos: 1) Tipo, 2) Categoría, 3) Contexto, 4) Descripción + IA
 *
 * @version 1.0.0
 * @date 2025-12-24
 */

// ============================================================================
// GUARD: Evitar carga duplicada
// ============================================================================
if (window._voicePlatformWizardLoaded) {
  console.log('⚠️ [VOICE-WIZARD] Ya cargado, omitiendo');
} else {
window._voicePlatformWizardLoaded = true;

console.log('%c 🧙‍♂️ VOICE WIZARD v1.0 ', 'background: linear-gradient(90deg, #8B5CF6 0%, #EC4899 100%); color: white; font-size: 14px; padding: 8px 12px; border-radius: 4px; font-weight: bold;');

const VoicePlatformWizard = {
  // API Base
  API_BASE: '/api/voice-platform',

  // Estado del wizard
  state: {
    currentStep: 1,
    totalSteps: 4,
    data: {
      // Paso 1
      type: '',

      // Paso 2
      category: '',
      area: '',
      priority: 'MEDIUM',

      // Paso 3 (contexto dinámico según tipo)
      relatedProcessId: null,
      relatedDepartmentId: null,
      affectedAreas: [],
      estimatedImpact: '',

      // Paso 4
      title: '',
      description: '',
      proposedSolution: '',

      // IA
      similarExperiences: []
    }
  },

  // =========================================================================
  // AUTH
  // =========================================================================
  getAuthToken() {
    return localStorage.getItem('authToken') ||
           sessionStorage.getItem('authToken') ||
           localStorage.getItem('token');
  },

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.getAuthToken()}`
    };
  },

  // =========================================================================
  // WIZARD: INICIAR
  // =========================================================================
  start() {
    this.resetState();
    this.showWizardModal();
  },

  resetState() {
    this.state.currentStep = 1;
    this.state.data = {
      type: '',
      category: '',
      area: '',
      priority: 'MEDIUM',
      relatedProcessId: null,
      relatedDepartmentId: null,
      affectedAreas: [],
      estimatedImpact: '',
      title: '',
      description: '',
      proposedSolution: '',
      similarExperiences: []
    };
  },

  // =========================================================================
  // UI: MODAL DEL WIZARD
  // =========================================================================
  showWizardModal() {
    const modalHTML = `
      <div class="modal fade" id="voiceWizardModal" tabindex="-1" data-bs-backdrop="static">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header" style="background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%); color: white;">
              <h5 class="modal-title">
                <i class="bi bi-stars"></i> Crear Nueva Experiencia
                <small class="d-block mt-1" style="font-size: 0.85rem; opacity: 0.9;">
                  Paso <span id="wizardCurrentStep">1</span> de <span id="wizardTotalSteps">4</span>
                </small>
              </h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>

            <!-- Progress Bar -->
            <div class="progress" style="height: 5px; border-radius: 0;">
              <div id="wizardProgressBar" class="progress-bar" style="width: 25%; background: linear-gradient(90deg, #8B5CF6 0%, #EC4899 100%);"></div>
            </div>

            <div class="modal-body">
              <!-- Step Container -->
              <div id="wizardStepContainer"></div>

              <!-- Similar Experiences Alert (se muestra en paso 4) -->
              <div id="wizardSimilarExperiences" style="display: none;"></div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" id="btnWizardPrev" style="display: none;">
                <i class="bi bi-arrow-left"></i> Anterior
              </button>
              <button type="button" class="btn btn-primary" id="btnWizardNext">
                Siguiente <i class="bi bi-arrow-right"></i>
              </button>
              <button type="button" class="btn btn-success" id="btnWizardSubmit" style="display: none;">
                <i class="bi bi-check-circle"></i> Crear Experiencia
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Eliminar modal anterior si existe
    document.querySelector('#voiceWizardModal')?.remove();

    // Insertar modal
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('voiceWizardModal'));
    modal.show();

    // Renderizar paso 1
    this.renderStep(1);

    // Event listeners
    this.attachWizardListeners();
  },

  attachWizardListeners() {
    document.getElementById('btnWizardNext')?.addEventListener('click', () => {
      this.nextStep();
    });

    document.getElementById('btnWizardPrev')?.addEventListener('click', () => {
      this.prevStep();
    });

    document.getElementById('btnWizardSubmit')?.addEventListener('click', () => {
      this.submitExperience();
    });
  },

  // =========================================================================
  // NAVEGACIÓN ENTRE PASOS
  // =========================================================================
  nextStep() {
    if (!this.validateCurrentStep()) {
      return;
    }

    this.collectStepData();

    if (this.state.currentStep < this.state.totalSteps) {
      this.state.currentStep++;
      this.renderStep(this.state.currentStep);
      this.updateProgress();
    }
  },

  prevStep() {
    if (this.state.currentStep > 1) {
      this.state.currentStep--;
      this.renderStep(this.state.currentStep);
      this.updateProgress();
    }
  },

  updateProgress() {
    const percentage = (this.state.currentStep / this.state.totalSteps) * 100;
    document.getElementById('wizardProgressBar').style.width = `${percentage}%`;
    document.getElementById('wizardCurrentStep').textContent = this.state.currentStep;

    // Mostrar/ocultar botones
    document.getElementById('btnWizardPrev').style.display =
      this.state.currentStep > 1 ? 'inline-block' : 'none';

    document.getElementById('btnWizardNext').style.display =
      this.state.currentStep < this.state.totalSteps ? 'inline-block' : 'none';

    document.getElementById('btnWizardSubmit').style.display =
      this.state.currentStep === this.state.totalSteps ? 'inline-block' : 'none';
  },

  // =========================================================================
  // RENDERIZAR PASOS
  // =========================================================================
  renderStep(step) {
    const container = document.getElementById('wizardStepContainer');

    switch(step) {
      case 1:
        container.innerHTML = this.renderStep1();
        break;
      case 2:
        container.innerHTML = this.renderStep2();
        break;
      case 3:
        container.innerHTML = this.renderStep3();
        break;
      case 4:
        container.innerHTML = this.renderStep4();
        this.attachStep4Listeners();
        break;
    }

    this.updateProgress();
  },

  // =========================================================================
  // PASO 1: TIPO DE EXPERIENCIA
  // =========================================================================
  renderStep1() {
    return `
      <div class="step-content">
        <h5 class="mb-4">
          <i class="bi bi-1-circle"></i> ¿Qué tipo de experiencia deseas compartir?
        </h5>

        <div class="row g-3">
          <div class="col-md-4">
            <div class="type-card ${this.state.data.type === 'SUGGESTION' ? 'selected' : ''}"
                 data-type="SUGGESTION"
                 onclick="VoicePlatformWizard.selectType('SUGGESTION')">
              <div class="type-icon" style="font-size: 3rem; color: #3B82F6;">
                💡
              </div>
              <h6>Sugerencia</h6>
              <p class="small text-muted">
                Ideas para mejorar procesos, eficiencia o condiciones de trabajo
              </p>
            </div>
          </div>

          <div class="col-md-4">
            <div class="type-card ${this.state.data.type === 'PROBLEM' ? 'selected' : ''}"
                 data-type="PROBLEM"
                 onclick="VoicePlatformWizard.selectType('PROBLEM')">
              <div class="type-icon" style="font-size: 3rem; color: #F59E0B;">
                ⚠️
              </div>
              <h6>Problema</h6>
              <p class="small text-muted">
                Situaciones que dificultan el trabajo o generan ineficiencias
              </p>
            </div>
          </div>

          <div class="col-md-4">
            <div class="type-card ${this.state.data.type === 'SOLUTION' ? 'selected' : ''}"
                 data-type="SOLUTION"
                 onclick="VoicePlatformWizard.selectType('SOLUTION')">
              <div class="type-icon" style="font-size: 3rem; color: #10B981;">
                ✅
              </div>
              <h6>Solución</h6>
              <p class="small text-muted">
                Soluciones que funcionaron para problemas específicos
              </p>
            </div>
          </div>
        </div>

        <style>
          .type-card {
            border: 2px solid #E5E7EB;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s;
            height: 100%;
          }
          .type-card:hover {
            border-color: #8B5CF6;
            box-shadow: 0 4px 12px rgba(139, 92, 246, 0.2);
            transform: translateY(-4px);
          }
          .type-card.selected {
            border-color: #8B5CF6;
            background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%);
            box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
          }
        </style>
      </div>
    `;
  },

  selectType(type) {
    this.state.data.type = type;

    // Actualizar UI
    document.querySelectorAll('.type-card').forEach(card => {
      card.classList.remove('selected');
    });
    document.querySelector(`.type-card[data-type="${type}"]`)?.classList.add('selected');
  },

  // =========================================================================
  // PASO 2: CATEGORÍA Y ÁREA
  // =========================================================================
  renderStep2() {
    return `
      <div class="step-content">
        <h5 class="mb-4">
          <i class="bi bi-2-circle"></i> Categoría y Área
        </h5>

        <div class="mb-3">
          <label class="form-label">Área / Departamento</label>
          <select class="form-select" id="wizardArea">
            <option value="">Seleccionar...</option>
            <option value="IT">Tecnología / IT</option>
            <option value="ADMIN">Administración</option>
            <option value="PRODUCTION">Producción</option>
            <option value="QUALITY">Calidad</option>
            <option value="SAFETY">Seguridad</option>
            <option value="LOGISTICS">Logística</option>
            <option value="HR">Recursos Humanos</option>
            <option value="FINANCE">Finanzas</option>
            <option value="SALES">Ventas</option>
            <option value="CUSTOMER_SERVICE">Atención al Cliente</option>
          </select>
        </div>

        <div class="mb-3">
          <label class="form-label">Categoría</label>
          <select class="form-select" id="wizardCategory">
            <option value="">Seleccionar...</option>
            <option value="PROCESS">Proceso</option>
            <option value="SAFETY">Seguridad</option>
            <option value="HR">Recursos Humanos</option>
            <option value="QUALITY">Calidad</option>
            <option value="TOOLS">Herramientas / Equipos</option>
            <option value="COMMUNICATION">Comunicación</option>
            <option value="TRAINING">Capacitación</option>
            <option value="ENVIRONMENT">Ambiente de Trabajo</option>
          </select>
        </div>

        <div class="mb-3">
          <label class="form-label">Prioridad</label>
          <div class="btn-group w-100" role="group">
            <input type="radio" class="btn-check" name="wizardPriority" id="priorityLow" value="LOW">
            <label class="btn btn-outline-success" for="priorityLow">
              <i class="bi bi-arrow-down"></i> Baja
            </label>

            <input type="radio" class="btn-check" name="wizardPriority" id="priorityMedium" value="MEDIUM" checked>
            <label class="btn btn-outline-warning" for="priorityMedium">
              <i class="bi bi-dash"></i> Media
            </label>

            <input type="radio" class="btn-check" name="wizardPriority" id="priorityHigh" value="HIGH">
            <label class="btn btn-outline-danger" for="priorityHigh">
              <i class="bi bi-arrow-up"></i> Alta
            </label>
          </div>
        </div>
      </div>
    `;
  },

  // =========================================================================
  // PASO 3: CONTEXTO ESPECÍFICO
  // =========================================================================
  renderStep3() {
    const typeLabels = {
      'SUGGESTION': 'sugerencia',
      'PROBLEM': 'problema',
      'SOLUTION': 'solución'
    };
    const typeLabel = typeLabels[this.state.data.type] || 'experiencia';

    return `
      <div class="step-content">
        <h5 class="mb-4">
          <i class="bi bi-3-circle"></i> Contexto de tu ${typeLabel}
        </h5>

        <div class="mb-3">
          <label class="form-label">
            ¿En qué situación ocurrió?
            <small class="text-muted">(Contexto general)</small>
          </label>
          <textarea
            class="form-control"
            id="wizardContext"
            rows="3"
            placeholder="Ej: Durante el turno de la mañana, al realizar entrega de turno..."
          ></textarea>
        </div>

        ${this.state.data.type === 'PROBLEM' ? `
          <div class="mb-3">
            <label class="form-label">
              ¿Qué áreas o personas se ven afectadas?
            </label>
            <input
              type="text"
              class="form-control"
              id="wizardAffectedAreas"
              placeholder="Ej: Todo el equipo de producción, área de calidad"
            >
          </div>

          <div class="mb-3">
            <label class="form-label">Impacto estimado</label>
            <select class="form-select" id="wizardImpact">
              <option value="">Seleccionar...</option>
              <option value="LOW">Bajo - Afecta tareas menores</option>
              <option value="MEDIUM">Medio - Retrasa algunas actividades</option>
              <option value="HIGH">Alto - Bloquea procesos importantes</option>
              <option value="CRITICAL">Crítico - Detiene operaciones</option>
            </select>
          </div>
        ` : ''}

        ${this.state.data.type === 'SOLUTION' ? `
          <div class="mb-3">
            <label class="form-label">
              ¿Qué problema resolvió esta solución?
            </label>
            <textarea
              class="form-control"
              id="wizardSolvedProblem"
              rows="2"
              placeholder="Describe brevemente el problema original"
            ></textarea>
          </div>
        ` : ''}

        <div class="mb-3">
          <label class="form-label">
            Frecuencia
            <small class="text-muted">(¿Qué tan seguido ocurre?)</small>
          </label>
          <select class="form-select" id="wizardFrequency">
            <option value="DAILY">Diariamente</option>
            <option value="WEEKLY">Semanalmente</option>
            <option value="MONTHLY">Mensualmente</option>
            <option value="OCCASIONAL">Ocasionalmente</option>
            <option value="ONCE">Una sola vez</option>
          </select>
        </div>
      </div>
    `;
  },

  // =========================================================================
  // PASO 4: DESCRIPCIÓN + IA DE SIMILITUD
  // =========================================================================
  renderStep4() {
    return `
      <div class="step-content">
        <h5 class="mb-4">
          <i class="bi bi-4-circle"></i> Describe tu experiencia
        </h5>

        <div class="mb-3">
          <label class="form-label">
            Título
            <small class="text-muted">(Resumen breve)</small>
          </label>
          <input
            type="text"
            class="form-control"
            id="wizardTitle"
            placeholder="Ej: Sistema de entrega de turno no sincroniza datos"
            maxlength="200"
          >
          <div class="form-text">
            <span id="titleCharCount">0</span>/200 caracteres
          </div>
        </div>

        <div class="mb-3">
          <label class="form-label">
            Descripción Completa
          </label>
          <textarea
            class="form-control"
            id="wizardDescription"
            rows="5"
            placeholder="Describe con detalle tu experiencia, qué pasó, cómo te afectó, etc."
          ></textarea>
          <div class="form-text">
            💡 Cuanto más detallada, mejor podremos ayudarte
          </div>
        </div>

        ${this.state.data.type === 'SUGGESTION' || this.state.data.type === 'SOLUTION' ? `
          <div class="mb-3">
            <label class="form-label">
              ${this.state.data.type === 'SUGGESTION' ? 'Solución Propuesta' : 'Cómo se implementó'}
            </label>
            <textarea
              class="form-control"
              id="wizardProposedSolution"
              rows="4"
              placeholder="${this.state.data.type === 'SUGGESTION' ?
                'Describe tu idea de cómo mejorar la situación' :
                'Explica los pasos que seguiste para resolver el problema'}"
            ></textarea>
          </div>
        ` : ''}

        <!-- Loading IA -->
        <div id="wizardAILoading" style="display: none;">
          <div class="alert alert-info">
            <div class="spinner-border spinner-border-sm me-2"></div>
            Buscando experiencias similares...
          </div>
        </div>
      </div>
    `;
  },

  attachStep4Listeners() {
    // Contador de caracteres en título
    const titleInput = document.getElementById('wizardTitle');
    const charCount = document.getElementById('titleCharCount');

    if (titleInput && charCount) {
      titleInput.addEventListener('input', () => {
        charCount.textContent = titleInput.value.length;
      });

      // Buscar similares cuando escribe (debounced)
      let searchTimeout;
      titleInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          if (titleInput.value.length >= 10) {
            this.searchSimilarExperiences(titleInput.value);
          }
        }, 1000);
      });
    }
  },

  // =========================================================================
  // IA: BUSCAR EXPERIENCIAS SIMILARES
  // =========================================================================
  async searchSimilarExperiences(query) {
    try {
      document.getElementById('wizardAILoading').style.display = 'block';

      const response = await fetch(`${this.API_BASE}/experiences/search-similar`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ query })
      });

      const data = await response.json();

      if (response.ok && data.similar && data.similar.length > 0) {
        this.state.data.similarExperiences = data.similar;
        this.showSimilarExperiences(data.similar);
      } else {
        document.getElementById('wizardSimilarExperiences').style.display = 'none';
      }

    } catch (error) {
      console.error('[WIZARD] Error buscando similares:', error);
    } finally {
      document.getElementById('wizardAILoading').style.display = 'none';
    }
  },

  showSimilarExperiences(similar) {
    const container = document.getElementById('wizardSimilarExperiences');

    const html = `
      <div class="alert alert-warning">
        <h6>
          <i class="bi bi-lightbulb"></i> Encontramos experiencias similares
        </h6>
        <p class="small mb-2">Alguien ya reportó algo parecido. Revisa si es lo mismo:</p>
        <div class="list-group">
          ${similar.slice(0, 3).map(exp => `
            <div class="list-group-item">
              <div class="d-flex justify-content-between">
                <h6 class="mb-1">${exp.title}</h6>
                <small class="text-muted">${Math.round(exp.similarity * 100)}% similar</small>
              </div>
              <p class="mb-1 small">${exp.description?.substring(0, 100)}...</p>
              <small class="text-muted">
                Estado: <span class="badge bg-secondary">${exp.status}</span>
              </small>
            </div>
          `).join('')}
        </div>
        <p class="small mt-2 mb-0">
          💡 Si es lo mismo, considera votar o comentar en lugar de duplicar
        </p>
      </div>
    `;

    container.innerHTML = html;
    container.style.display = 'block';
  },

  // =========================================================================
  // VALIDACIÓN
  // =========================================================================
  validateCurrentStep() {
    switch(this.state.currentStep) {
      case 1:
        if (!this.state.data.type) {
          this.showValidationError('Por favor selecciona un tipo de experiencia');
          return false;
        }
        break;

      case 2:
        const area = document.getElementById('wizardArea')?.value;
        const category = document.getElementById('wizardCategory')?.value;

        if (!area || !category) {
          this.showValidationError('Por favor completa área y categoría');
          return false;
        }
        break;

      case 3:
        const context = document.getElementById('wizardContext')?.value.trim();
        if (!context || context.length < 20) {
          this.showValidationError('Describe el contexto con al menos 20 caracteres');
          return false;
        }
        break;

      case 4:
        const title = document.getElementById('wizardTitle')?.value.trim();
        const description = document.getElementById('wizardDescription')?.value.trim();

        if (!title || title.length < 10) {
          this.showValidationError('El título debe tener al menos 10 caracteres');
          return false;
        }

        if (!description || description.length < 30) {
          this.showValidationError('La descripción debe tener al menos 30 caracteres');
          return false;
        }
        break;
    }

    return true;
  },

  showValidationError(message) {
    // Toast de error
    const toast = document.createElement('div');
    toast.className = 'alert alert-danger position-fixed top-0 start-50 translate-middle-x mt-3';
    toast.style.zIndex = '9999';
    toast.innerHTML = `<i class="bi bi-exclamation-triangle"></i> ${message}`;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
  },

  // =========================================================================
  // RECOLECTAR DATOS DEL PASO ACTUAL
  // =========================================================================
  collectStepData() {
    switch(this.state.currentStep) {
      case 2:
        this.state.data.area = document.getElementById('wizardArea')?.value;
        this.state.data.category = document.getElementById('wizardCategory')?.value;
        this.state.data.priority = document.querySelector('input[name="wizardPriority"]:checked')?.value;
        break;

      case 3:
        this.state.data.context = document.getElementById('wizardContext')?.value;
        this.state.data.affectedAreas = document.getElementById('wizardAffectedAreas')?.value.split(',').map(a => a.trim());
        this.state.data.estimatedImpact = document.getElementById('wizardImpact')?.value;
        this.state.data.frequency = document.getElementById('wizardFrequency')?.value;
        break;

      case 4:
        this.state.data.title = document.getElementById('wizardTitle')?.value;
        this.state.data.description = document.getElementById('wizardDescription')?.value;
        this.state.data.proposedSolution = document.getElementById('wizardProposedSolution')?.value;
        break;
    }
  },

  // =========================================================================
  // SUBMIT: CREAR EXPERIENCIA
  // =========================================================================
  async submitExperience() {
    if (!this.validateCurrentStep()) {
      return;
    }

    this.collectStepData();

    try {
      // Mostrar loading
      document.getElementById('btnWizardSubmit').disabled = true;
      document.getElementById('btnWizardSubmit').innerHTML =
        '<span class="spinner-border spinner-border-sm me-2"></span>Creando...';

      const response = await fetch(`${this.API_BASE}/experiences`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          type: this.state.data.type,
          area: this.state.data.area,
          category: this.state.data.category,
          priority: this.state.data.priority,
          title: this.state.data.title,
          description: this.state.data.description,
          proposedSolution: this.state.data.proposedSolution,
          context: this.state.data.context,
          affectedAreas: this.state.data.affectedAreas,
          estimatedImpact: this.state.data.estimatedImpact,
          frequency: this.state.data.frequency
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al crear experiencia');
      }

      // Cerrar modal
      bootstrap.Modal.getInstance(document.getElementById('voiceWizardModal'))?.hide();

      // Mostrar éxito
      this.showSuccess('¡Experiencia creada exitosamente!');

      // Recargar lista si VoicePlatform está disponible
      if (window.VoicePlatform && window.VoicePlatform.loadExperiences) {
        setTimeout(() => {
          window.VoicePlatform.loadExperiences();
        }, 500);
      }

    } catch (error) {
      console.error('[WIZARD] Error creando experiencia:', error);
      this.showValidationError(error.message || 'Error al crear la experiencia');

      // Restaurar botón
      document.getElementById('btnWizardSubmit').disabled = false;
      document.getElementById('btnWizardSubmit').innerHTML =
        '<i class="bi bi-check-circle"></i> Crear Experiencia';
    }
  },

  showSuccess(message) {
    const toast = document.createElement('div');
    toast.className = 'alert alert-success position-fixed top-0 start-50 translate-middle-x mt-3';
    toast.style.zIndex = '9999';
    toast.innerHTML = `<i class="bi bi-check-circle"></i> ${message}`;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
  }
};

// Exportar globalmente
window.VoicePlatformWizard = VoicePlatformWizard;

console.log('✅ [VOICE-WIZARD] Módulo cargado correctamente');

} // Cierre del guard
