/**
 * 📅 USER CALENDAR TAB - Calendario Visual de Asistencia por Usuario
 *
 * Muestra calendario mensual con:
 * - Días de trabajo (turno y horario)
 * - Días franco/descanso
 * - Faltas
 * - Llegadas tarde
 * - Integrado con sistema de turnos rotativos
 */

// ============================================================================
// GUARD: Evitar carga duplicada del script
// ============================================================================
if (window.UserCalendarTab) {
    console.log('⚠️ [USER-CALENDAR-TAB] Script ya cargado, omitiendo re-declaración');
} else {

// ✅ FIX: Helpers inline para evitar ES6 modules (antes: import)
const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

// Helper para construir URLs de API
const buildApiUrl = (path) => {
  return window.progressiveAdmin?.getApiUrl(path) || path;
};

class UserCalendarTab {
  constructor() {
    this.currentMonth = new Date().getMonth();
    this.currentYear = new Date().getFullYear();
    this.currentUserId = null;
    this.calendarData = null;
  }

  /**
   * Renderiza el tab completo de calendario
   */
  render(userId) {
    this.currentUserId = userId;

    return `
      <div class="user-calendar-container">
        <!-- Header con controles -->
        <div class="calendar-header">
          <div class="month-selector">
            <button class="btn btn-sm btn-outline-primary" onclick="userCalendarTab.previousMonth()">
              ← Anterior
            </button>
            <h4 class="month-title" id="calendar-month-title">
              ${this.getMonthName(this.currentMonth)} ${this.currentYear}
            </h4>
            <button class="btn btn-sm btn-outline-primary" onclick="userCalendarTab.nextMonth()">
              Siguiente →
            </button>
            <button class="btn btn-sm btn-primary" onclick="userCalendarTab.goToToday()">
              📅 Hoy
            </button>
          </div>

          <!-- Leyenda -->
          <div class="calendar-legend">
            <div class="legend-item">
              <span class="legend-color work-day"></span>
              <span>Día de Trabajo</span>
            </div>
            <div class="legend-item">
              <span class="legend-color rest-day"></span>
              <span>Franco/Descanso</span>
            </div>
            <div class="legend-item">
              <span class="legend-color absent-day"></span>
              <span>Falta</span>
            </div>
            <div class="legend-item">
              <span class="legend-color late-day"></span>
              <span>Llegó Tarde</span>
            </div>
            <div class="legend-item">
              <span class="legend-color present-day"></span>
              <span>Asistió a Horario</span>
            </div>
          </div>
        </div>

        <!-- Loading -->
        <div id="calendar-loading" class="text-center my-4" style="display: none;">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Cargando...</span>
          </div>
          <p class="mt-2">Cargando calendario...</p>
        </div>

        <!-- Error -->
        <div id="calendar-error" class="alert alert-danger" style="display: none;">
          Error al cargar el calendario
        </div>

        <!-- Calendario -->
        <div id="calendar-grid-container" class="calendar-grid-wrapper">
          <!-- Se genera dinámicamente -->
        </div>

        <!-- Resumen del mes -->
        <div id="calendar-summary" class="calendar-summary mt-4">
          <!-- Se genera dinámicamente -->
        </div>
      </div>

      <style>
        .user-calendar-container {
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .calendar-header {
          background: white;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .month-selector {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          margin-bottom: 20px;
        }

        .month-title {
          margin: 0;
          min-width: 250px;
          text-align: center;
        }

        .calendar-legend {
          display: flex;
          justify-content: center;
          gap: 20px;
          flex-wrap: wrap;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }

        .legend-color {
          width: 24px;
          height: 24px;
          border-radius: 4px;
          border: 2px solid #ddd;
        }

        .legend-color.work-day {
          background: #e3f2fd;
          border-color: #1976d2;
        }

        .legend-color.rest-day {
          background: #f5f5f5;
          border-color: #9e9e9e;
        }

        .legend-color.absent-day {
          background: #ffebee;
          border-color: #c62828;
        }

        .legend-color.late-day {
          background: #fff3e0;
          border-color: #f57c00;
        }

        .legend-color.present-day {
          background: #e8f5e9;
          border-color: #2e7d32;
        }

        .calendar-grid-wrapper {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          overflow-x: auto;
        }

        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 8px;
          min-width: 700px;
        }

        .calendar-day-header {
          text-align: center;
          font-weight: bold;
          padding: 10px;
          background: #f5f5f5;
          border-radius: 4px;
          font-size: 14px;
        }

        .calendar-day {
          min-height: 100px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          padding: 8px;
          position: relative;
          cursor: pointer;
          transition: all 0.2s;
          background: white;
        }

        .calendar-day:hover {
          box-shadow: 0 4px 8px rgba(0,0,0,0.15);
          transform: translateY(-2px);
        }

        .calendar-day.other-month {
          opacity: 0.3;
          background: #fafafa;
        }

        .calendar-day.today {
          border-color: #1976d2;
          border-width: 3px;
          font-weight: bold;
        }

        .calendar-day.work-day {
          background: #e3f2fd;
          border-color: #1976d2;
        }

        .calendar-day.rest-day {
          background: #f5f5f5;
          border-color: #9e9e9e;
        }

        .calendar-day.absent-day {
          background: #ffebee;
          border-color: #c62828;
        }

        .calendar-day.late-day {
          background: #fff3e0;
          border-color: #f57c00;
        }

        .calendar-day.present-day {
          background: #e8f5e9;
          border-color: #2e7d32;
        }

        .day-number {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 4px;
        }

        .day-info {
          font-size: 12px;
          line-height: 1.4;
        }

        .day-shift {
          font-weight: 600;
          color: #1976d2;
          margin-bottom: 2px;
        }

        .day-hours {
          color: #666;
          margin-bottom: 2px;
        }

        .day-status {
          font-weight: 600;
          margin-top: 4px;
        }

        .day-status.absent {
          color: #c62828;
        }

        .day-status.late {
          color: #f57c00;
        }

        .day-status.present {
          color: #2e7d32;
        }

        .calendar-summary {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
        }

        .summary-card {
          padding: 15px;
          border-radius: 8px;
          border-left: 4px solid;
        }

        .summary-card.work {
          background: #e3f2fd;
          border-color: #1976d2;
        }

        .summary-card.rest {
          background: #f5f5f5;
          border-color: #9e9e9e;
        }

        .summary-card.absent {
          background: #ffebee;
          border-color: #c62828;
        }

        .summary-card.late {
          background: #fff3e0;
          border-color: #f57c00;
        }

        .summary-card.present {
          background: #e8f5e9;
          border-color: #2e7d32;
        }

        .summary-value {
          font-size: 32px;
          font-weight: bold;
          margin-bottom: 5px;
        }

        .summary-label {
          font-size: 14px;
          color: #666;
        }

        /* Tooltip personalizado */
        .calendar-tooltip {
          position: absolute;
          background: rgba(0, 0, 0, 0.9);
          color: white;
          padding: 10px;
          border-radius: 6px;
          font-size: 12px;
          z-index: 1000;
          pointer-events: none;
          max-width: 250px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        }
      </style>
    `;
  }

  /**
   * Inicializa el calendario después de renderizar
   */
  async init() {
    await this.loadCalendarData();
  }

  /**
   * Carga los datos del calendario para el mes actual
   */
  async loadCalendarData() {
    const loading = document.getElementById('calendar-loading');
    const error = document.getElementById('calendar-error');
    const container = document.getElementById('calendar-grid-container');

    try {
      loading.style.display = 'block';
      error.style.display = 'none';
      container.innerHTML = '';

      // Calcular primer y último día del mes
      const firstDay = new Date(this.currentYear, this.currentMonth, 1);
      const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);

      const startDate = firstDay.toISOString().split('T')[0];
      const endDate = lastDay.toISOString().split('T')[0];

      console.log(`📅 [CALENDAR] Cargando datos para ${startDate} a ${endDate}`);

      // Llamar al endpoint de calendario de usuario
      // Usar endpoint de calendario laboral que incluye asistencias
      const response = await fetch(
        buildApiUrl(`/api/calendario/user/${this.currentUserId}/calendar?startDate=${startDate}&endDate=${endDate}`),
        { headers: getAuthHeaders() }
      );

      if (!response.ok) {
        throw new Error('Error al cargar datos del calendario');
      }

      this.calendarData = await response.json();

      console.log('✅ [CALENDAR] Datos cargados:', this.calendarData);

      // Renderizar calendario
      this.renderCalendar();
      this.renderSummary();

      loading.style.display = 'none';
    } catch (err) {
      console.error('❌ [CALENDAR] Error:', err);
      loading.style.display = 'none';
      error.style.display = 'block';
      error.textContent = `Error: ${err.message}`;
    }
  }

  /**
   * Renderiza el grid del calendario
   */
  renderCalendar() {
    const container = document.getElementById('calendar-grid-container');

    // Calcular días del mes
    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Día de la semana del primer día (0=Domingo, 1=Lunes, etc.)
    const firstDayOfWeek = firstDay.getDay();

    // Ajustar para que empiece en Lunes (0=Lunes, 6=Domingo)
    const firstDayAdjusted = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

    // Crear grid
    let html = '<div class="calendar-grid">';

    // Headers (Lun, Mar, Mié, etc.)
    const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    dayNames.forEach(name => {
      html += `<div class="calendar-day-header">${name}</div>`;
    });

    // Días del mes anterior (relleno)
    const prevMonthLastDay = new Date(this.currentYear, this.currentMonth, 0).getDate();
    for (let i = firstDayAdjusted - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i;
      html += `<div class="calendar-day other-month">
        <div class="day-number">${day}</div>
      </div>`;
    }

    // Días del mes actual
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(this.currentYear, this.currentMonth, day);
      const dateString = date.toISOString().split('T')[0];

      // Buscar datos de este día
      const dayData = this.calendarData?.calendar?.find(d => d.date === dateString);

      const isToday =
        today.getDate() === day &&
        today.getMonth() === this.currentMonth &&
        today.getFullYear() === this.currentYear;

      html += this.renderDay(day, dayData, isToday);
    }

    // Días del próximo mes (relleno)
    const totalCells = firstDayAdjusted + daysInMonth;
    const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let day = 1; day <= remainingCells; day++) {
      html += `<div class="calendar-day other-month">
        <div class="day-number">${day}</div>
      </div>`;
    }

    html += '</div>';
    container.innerHTML = html;
  }

  /**
   * Renderiza un día del calendario
   */
  renderDay(dayNumber, dayData, isToday) {
    let classes = 'calendar-day';
    let content = '';

    if (isToday) {
      classes += ' today';
    }

    // Determinar tipo de día y contenido
    if (!dayData) {
      // No hay datos - día sin información
      content = `
        <div class="day-number">${dayNumber}</div>
        <div class="day-info">Sin datos</div>
      `;
    } else {
      // Clasificar el día
      if (dayData.attendance) {
        // Asistió
        if (dayData.attendance.status === 'late') {
          classes += ' late-day';
        } else if (dayData.attendance.status === 'present') {
          classes += ' present-day';
        }

        content = `
          <div class="day-number">${dayNumber}</div>
          <div class="day-info">
            ${dayData.shift ? `<div class="day-shift">${dayData.shift.name}</div>` : ''}
            ${dayData.shift ? `<div class="day-hours">${dayData.shift.startTime} - ${dayData.shift.endTime}</div>` : ''}
            <div class="day-status ${dayData.attendance.status}">
              ${dayData.attendance.status === 'late' ? '⏰ Tarde' : '✅ A horario'}
            </div>
            ${dayData.attendance.check_in ? `<div class="day-hours">Entrada: ${new Date(dayData.attendance.check_in).toLocaleTimeString('es-AR', {hour: '2-digit', minute: '2-digit'})}</div>` : ''}
          </div>
        `;
      } else if (dayData.shouldWork) {
        // Debía trabajar pero NO asistió (FALTA)
        classes += ' absent-day';

        content = `
          <div class="day-number">${dayNumber}</div>
          <div class="day-info">
            ${dayData.shift ? `<div class="day-shift">${dayData.shift.name}</div>` : ''}
            ${dayData.shift ? `<div class="day-hours">${dayData.shift.startTime} - ${dayData.shift.endTime}</div>` : ''}
            <div class="day-status absent">❌ Falta</div>
          </div>
        `;
      } else {
        // Día franco/descanso
        classes += ' rest-day';

        content = `
          <div class="day-number">${dayNumber}</div>
          <div class="day-info">
            <div class="day-shift">Franco</div>
            ${dayData.reason ? `<div class="day-hours">${dayData.reason}</div>` : ''}
          </div>
        `;
      }
    }

    return `<div class="${classes}" data-date="${dayData?.date || ''}">${content}</div>`;
  }

  /**
   * Renderiza el resumen del mes
   */
  renderSummary() {
    const container = document.getElementById('calendar-summary');

    if (!this.calendarData || !this.calendarData.summary) {
      container.innerHTML = '<p class="text-center">No hay datos de resumen</p>';
      return;
    }

    const summary = this.calendarData.summary;

    const html = `
      <h5 class="mb-3">📊 Resumen del Mes</h5>
      <div class="summary-grid">
        <div class="summary-card work">
          <div class="summary-value">${summary.workDays || 0}</div>
          <div class="summary-label">Días de Trabajo</div>
        </div>
        <div class="summary-card rest">
          <div class="summary-value">${summary.restDays || 0}</div>
          <div class="summary-label">Días Franco</div>
        </div>
        <div class="summary-card present">
          <div class="summary-value">${summary.presentDays || 0}</div>
          <div class="summary-label">Días Asistidos</div>
        </div>
        <div class="summary-card late">
          <div class="summary-value">${summary.lateDays || 0}</div>
          <div class="summary-label">Llegadas Tarde</div>
        </div>
        <div class="summary-card absent">
          <div class="summary-value">${summary.absentDays || 0}</div>
          <div class="summary-label">Faltas</div>
        </div>
      </div>

      ${summary.attendance_rate !== undefined ? `
        <div class="mt-4 p-3 bg-light rounded">
          <strong>Tasa de Asistencia:</strong>
          <span class="badge bg-${summary.attendance_rate >= 95 ? 'success' : summary.attendance_rate >= 85 ? 'warning' : 'danger'} ms-2">
            ${summary.attendance_rate.toFixed(1)}%
          </span>
        </div>
      ` : ''}
    `;

    container.innerHTML = html;
  }

  /**
   * Navegación de calendario
   */
  previousMonth() {
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
    this.updateMonthTitle();
    this.loadCalendarData();
  }

  nextMonth() {
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
    this.updateMonthTitle();
    this.loadCalendarData();
  }

  goToToday() {
    const today = new Date();
    this.currentMonth = today.getMonth();
    this.currentYear = today.getFullYear();
    this.updateMonthTitle();
    this.loadCalendarData();
  }

  updateMonthTitle() {
    const title = document.getElementById('calendar-month-title');
    if (title) {
      title.textContent = `${this.getMonthName(this.currentMonth)} ${this.currentYear}`;
    }
  }

  getMonthName(month) {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[month];
  }
}

// ✅ FIX: Exponer clase e instancia en window (antes: export default - removido)
window.UserCalendarTab = UserCalendarTab;
window.userCalendarTab = new UserCalendarTab();

} // Cierre del guard de carga duplicada
