/**
 * 📅 SHIFT CALENDAR VIEW - Visualización de Calendario de Turnos Rotativos
 *
 * Componente para mostrar la proyección anual del ciclo rotativo de un turno
 * con días de trabajo, fases, grupos y estadísticas
 */

class ShiftCalendarView {
  constructor() {
    this.currentMonth = new Date().getMonth();
    this.currentYear = new Date().getFullYear();
    this.currentShiftId = null;
    this.calendarData = null;
    this.shiftInfo = null;
  }

  /**
   * Renderiza el calendario para un turno específico
   */
  async render(shiftId) {
    this.currentShiftId = shiftId;

    const container = `
      <div class="shift-calendar-container">
        <!-- Header con controles -->
        <div class="calendar-header">
          <div class="shift-info" id="shift-info-header">
            <div class="loading-spinner"></div>
            <span>Cargando información del turno...</span>
          </div>

          <div class="view-controls">
            <button class="btn btn-secondary" onclick="shiftCalendarView.previousMonth()">
              ← Mes Anterior
            </button>
            <button class="btn btn-primary" onclick="shiftCalendarView.goToToday()">
              📅 Mes Actual
            </button>
            <button class="btn btn-secondary" onclick="shiftCalendarView.nextMonth()">
              Mes Siguiente →
            </button>
            <button class="btn btn-info" onclick="shiftCalendarView.viewYear()">
              📊 Ver Año Completo
            </button>
          </div>

          <div class="month-title">
            <h4 id="calendar-month-title">
              ${this.getMonthName(this.currentMonth)} ${this.currentYear}
            </h4>
          </div>
        </div>

        <!-- Leyenda -->
        <div class="calendar-legend">
          <h5>Leyenda:</h5>
          <div class="legend-items" id="phase-legend">
            <!-- Se llenará dinámicamente con las fases del turno -->
          </div>
        </div>

        <!-- Grid del calendario -->
        <div class="calendar-grid-wrapper">
          <div class="calendar-grid" id="shift-calendar-grid">
            <div class="loading-spinner-large"></div>
            <p>Cargando calendario...</p>
          </div>
        </div>

        <!-- Estadísticas -->
        <div class="calendar-stats" id="calendar-stats">
          <!-- Se llenará con estadísticas -->
        </div>

        <!-- Usuarios por fase -->
        <div class="users-by-phase" id="users-by-phase">
          <h4>👥 Usuarios Asignados por Fase</h4>
          <div class="users-phase-list">
            <!-- Se llenará dinámicamente -->
          </div>
        </div>
      </div>
    `;

    // Cargar datos y renderizar en segundo plano
    // No esperamos para retornar el HTML inmediatamente
    setTimeout(() => this.loadCalendarData(), 100);

    return container;
  }

  /**
   * Carga los datos del calendario desde el API
   */
  async loadCalendarData() {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');

      if (!token) {
        console.error('No auth token found');
        return;
      }

      // Calcular rango del mes actual
      const startDate = new Date(this.currentYear, this.currentMonth, 1)
        .toISOString().split('T')[0];
      const endDate = new Date(this.currentYear, this.currentMonth + 1, 0)
        .toISOString().split('T')[0];

      console.log(`📅 [SHIFT-CALENDAR] Cargando calendario: ${startDate} to ${endDate}`);

      const response = await fetch(
        `/api/v1/shifts/${this.currentShiftId}/calendar?startDate=${startDate}&endDate=${endDate}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        this.calendarData = data.calendar;
        this.shiftInfo = data.shift;
        this.usersByPhase = data.usersByPhase || [];
        this.stats = data.stats || {};

        this.renderCalendar();
        this.renderStats();
        this.renderUsersByPhase();
      } else {
        console.error('Error en respuesta:', data.error);
      }
    } catch (error) {
      console.error('❌ Error cargando calendario:', error);
      document.getElementById('shift-calendar-grid').innerHTML = `
        <div class="error-message">
          <p>⚠️ Error al cargar el calendario</p>
          <p class="error-detail">${error.message}</p>
        </div>
      `;
    }
  }

  /**
   * Renderiza el grid del calendario
   */
  renderCalendar() {
    if (!this.calendarData || this.calendarData.length === 0) {
      return;
    }

    // Actualizar título
    document.getElementById('calendar-month-title').textContent =
      `${this.getMonthName(this.currentMonth)} ${this.currentYear}`;

    // Actualizar info del turno
    document.getElementById('shift-info-header').innerHTML = `
      <strong>Turno:</strong> ${this.shiftInfo.name || 'Sin nombre'}
      <span class="badge ${this.shiftInfo.shiftType === 'rotative' ? 'badge-primary' : 'badge-secondary'}">
        ${this.shiftInfo.shiftType || 'standard'}
      </span>
      ${this.shiftInfo.global_cycle_start_date ?
        `<span class="text-muted">| Ciclo inició: ${this.shiftInfo.global_cycle_start_date}</span>`
        : ''}
    `;

    // Generar leyenda de fases
    this.renderPhaseLegend();

    // Generar grid
    const grid = document.getElementById('shift-calendar-grid');
    grid.innerHTML = '';

    // Headers de días de la semana
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    dayNames.forEach(day => {
      const header = document.createElement('div');
      header.className = 'calendar-day-header';
      header.textContent = day;
      grid.appendChild(header);
    });

    // Agregar días en blanco al inicio (para alinear con día de la semana)
    const firstDay = this.calendarData[0];
    const firstDayOfWeek = new Date(firstDay.date).getDay();

    for (let i = 0; i < firstDayOfWeek; i++) {
      const emptyDay = document.createElement('div');
      emptyDay.className = 'calendar-day empty';
      grid.appendChild(emptyDay);
    }

    // Renderizar días del calendario
    this.calendarData.forEach(day => {
      const dayElement = this.createDayElement(day);
      grid.appendChild(dayElement);
    });
  }

  /**
   * Crea el elemento HTML para un día del calendario
   */
  createDayElement(day) {
    const div = document.createElement('div');
    div.className = 'calendar-day';

    // Determinar color según fase
    const phaseColor = this.getPhaseColor(day.phaseName);
    div.style.borderLeft = `4px solid ${phaseColor}`;

    if (!day.isWorkDay) {
      div.classList.add('rest-day');
    } else {
      div.classList.add('work-day');
    }

    // Día del mes
    const dayNumber = new Date(day.date).getDate();

    // Contenido
    div.innerHTML = `
      <div class="day-number">${dayNumber}</div>
      <div class="day-phase">${day.phaseName || 'Sin fase'}</div>
      ${day.shift ? `
        <div class="day-hours">
          ${day.shift.startTime || ''} - ${day.shift.endTime || ''}
        </div>
      ` : '<div class="day-label">Descanso</div>'}
      ${day.shift && day.shift.groupName ? `
        <div class="day-group">${day.shift.groupName}</div>
      ` : ''}
      <div class="day-cycle">Ciclo día ${day.dayInCycle + 1}</div>
    `;

    // Tooltip con más info
    div.title = `
      Fecha: ${day.date}
      ${day.dayName}
      Fase: ${day.phaseName}
      ${day.isWorkDay ?
        `Horario: ${day.shift?.startTime} - ${day.shift?.endTime}` :
        'Día de descanso'
      }
      Día en ciclo: ${day.dayInCycle + 1}
      Ciclo #: ${day.cycleNumber || 'N/A'}
    `;

    return div;
  }

  /**
   * Obtiene color para una fase
   */
  getPhaseColor(phaseName) {
    const colors = {
      'manana': '#2196F3',   // Azul
      'morning': '#2196F3',
      'tarde': '#FF9800',    // Naranja
      'afternoon': '#FF9800',
      'noche': '#9C27B0',    // Púrpura
      'night': '#9C27B0',
      'descanso': '#9E9E9E', // Gris
      'franco': '#9E9E9E',
      'rest': '#9E9E9E'
    };

    return colors[phaseName?.toLowerCase()] || '#607D8B'; // Default: Gris azulado
  }

  /**
   * Renderiza la leyenda de fases
   */
  renderPhaseLegend() {
    const legend = document.getElementById('phase-legend');
    if (!legend) return;

    if (!this.shiftInfo || !this.shiftInfo.phases || this.shiftInfo.phases.length === 0) {
      legend.innerHTML = '<p class="text-muted">Sin fases configuradas</p>';
      return;
    }

    legend.innerHTML = '';

    this.shiftInfo.phases.forEach(phase => {
      const color = this.getPhaseColor(phase.name);
      const item = document.createElement('div');
      item.className = 'legend-item';
      item.innerHTML = `
        <span class="legend-color" style="background-color: ${color}"></span>
        <span class="legend-label">
          <strong>${phase.name}</strong>
          ${phase.duration ? `(${phase.duration} días)` : ''}
          ${phase.startTime && phase.endTime ?
            `<br><small>${phase.startTime} - ${phase.endTime}</small>` : ''}
        </span>
      `;
      legend.appendChild(item);
    });
  }

  /**
   * Renderiza estadísticas del calendario
   */
  renderStats() {
    const statsContainer = document.getElementById('calendar-stats');
    if (!statsContainer || !this.stats) return;

    statsContainer.innerHTML = `
      <h4>📊 Estadísticas del Mes</h4>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${this.stats.totalDays || 0}</div>
          <div class="stat-label">Total Días</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${this.stats.workDays || 0}</div>
          <div class="stat-label">Días de Trabajo</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${this.stats.restDays || 0}</div>
          <div class="stat-label">Días de Descanso</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${this.stats.cyclesCompleted || 0}</div>
          <div class="stat-label">Ciclos Completados</div>
        </div>
      </div>

      ${this.stats.phasesSummary && this.stats.phasesSummary.length > 0 ? `
        <h5 class="mt-3">Distribución por Fase:</h5>
        <div class="phases-summary">
          ${this.stats.phasesSummary.map(phase => `
            <div class="phase-stat">
              <span class="phase-name" style="border-left: 4px solid ${this.getPhaseColor(phase.name)}">
                ${phase.name}
              </span>
              <span class="phase-days">${phase.days} días</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
    `;
  }

  /**
   * Renderiza usuarios agrupados por fase
   */
  renderUsersByPhase() {
    const container = document.getElementById('users-by-phase');
    if (!container) return;

    if (!this.usersByPhase || this.usersByPhase.length === 0) {
      container.innerHTML = `
        <h4>👥 Usuarios Asignados por Fase</h4>
        <p class="text-muted">No hay usuarios asignados a este turno</p>
      `;
      return;
    }

    const usersList = this.usersByPhase.map(phaseGroup => {
      const color = this.getPhaseColor(phaseGroup.phase);
      return `
        <div class="phase-group" style="border-left: 4px solid ${color}">
          <h5>
            ${phaseGroup.phase}
            <span class="badge badge-secondary">${phaseGroup.users?.length || 0} usuarios</span>
          </h5>
          ${phaseGroup.groupName ? `<p class="text-muted">Grupo: ${phaseGroup.groupName}</p>` : ''}
          ${phaseGroup.sector ? `<p class="text-muted">Sector: ${phaseGroup.sector}</p>` : ''}

          <div class="users-list">
            ${(phaseGroup.users || []).map(user => `
              <div class="user-badge">
                <span class="user-name">${user.nombre} ${user.apellido}</span>
                ${user.legajo ? `<span class="user-legajo">#${user.legajo}</span>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <h4>👥 Usuarios Asignados por Fase</h4>
      <div class="users-phase-list">
        ${usersList}
      </div>
    `;
  }

  /**
   * Navegar a mes anterior
   */
  async previousMonth() {
    this.currentMonth--;
    if (this.currentMonth < 0) {
      this.currentMonth = 11;
      this.currentYear--;
    }
    await this.loadCalendarData();
  }

  /**
   * Navegar a mes siguiente
   */
  async nextMonth() {
    this.currentMonth++;
    if (this.currentMonth > 11) {
      this.currentMonth = 0;
      this.currentYear++;
    }
    await this.loadCalendarData();
  }

  /**
   * Ir al mes actual
   */
  async goToToday() {
    const now = new Date();
    this.currentMonth = now.getMonth();
    this.currentYear = now.getFullYear();
    await this.loadCalendarData();
  }

  /**
   * Ver año completo (futuro)
   */
  viewYear() {
    alert('Vista anual en desarrollo - próximamente');
    // TODO: Implementar vista anual con 12 calendarios pequeños
  }

  /**
   * Obtiene nombre del mes
   */
  getMonthName(monthNumber) {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[monthNumber];
  }
}

// Instancia global
const shiftCalendarView = new ShiftCalendarView();

// CSS estilos
const shiftCalendarStyles = `
<style>
.shift-calendar-container {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.calendar-header {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 20px;
}

.shift-info {
  font-size: 16px;
  margin-bottom: 15px;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 4px;
}

.view-controls {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.month-title {
  text-align: center;
}

.calendar-legend {
  background: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 20px;
}

.legend-items {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-top: 10px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.legend-color {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  flex-shrink: 0;
}

.calendar-grid-wrapper {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 20px;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 10px;
}

.calendar-day-header {
  font-weight: bold;
  text-align: center;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 4px;
}

.calendar-day {
  min-height: 120px;
  padding: 8px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background: white;
  transition: all 0.2s;
  cursor: pointer;
}

.calendar-day:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
  transform: translateY(-2px);
}

.calendar-day.empty {
  border: none;
  background: transparent;
  cursor: default;
}

.calendar-day.rest-day {
  background: #f5f5f5;
  opacity: 0.8;
}

.day-number {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 5px;
}

.day-phase {
  font-size: 12px;
  font-weight: 600;
  color: #333;
  margin-bottom: 3px;
}

.day-hours {
  font-size: 11px;
  color: #666;
  margin-bottom: 3px;
}

.day-label {
  font-size: 11px;
  color: #999;
  font-style: italic;
}

.day-group {
  font-size: 10px;
  color: #888;
  margin-top: 3px;
}

.day-cycle {
  font-size: 10px;
  color: #aaa;
  margin-top: 5px;
  border-top: 1px solid #eee;
  padding-top: 3px;
}

.calendar-stats {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
  margin-top: 15px;
}

.stat-card {
  text-align: center;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 2px solid #e9ecef;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #2196F3;
}

.stat-label {
  font-size: 14px;
  color: #666;
  margin-top: 5px;
}

.phases-summary {
  display: grid;
  gap: 10px;
  margin-top: 10px;
}

.phase-stat {
  display: flex;
  justify-content: space-between;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 4px;
}

.phase-name {
  padding-left: 10px;
  font-weight: 500;
}

.users-by-phase {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.users-phase-list {
  display: grid;
  gap: 20px;
  margin-top: 15px;
}

.phase-group {
  padding: 15px;
  padding-left: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.users-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}

.user-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 20px;
  font-size: 13px;
}

.user-legajo {
  color: #888;
  font-size: 11px;
}

.loading-spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #2196F3;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-spinner-large {
  width: 50px;
  height: 50px;
  border: 5px solid #f3f3f3;
  border-top: 5px solid #2196F3;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 50px auto;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  text-align: center;
  padding: 40px;
  color: #d32f2f;
}

.error-detail {
  color: #666;
  font-size: 14px;
  margin-top: 10px;
}
</style>
`;

// Inyectar estilos
if (!document.getElementById('shift-calendar-styles')) {
  const styleEl = document.createElement('div');
  styleEl.id = 'shift-calendar-styles';
  styleEl.innerHTML = shiftCalendarStyles;
  document.head.appendChild(styleEl);
}

// ✅ EXPOSICIÓN GLOBAL
window.ShiftCalendarView = ShiftCalendarView;
