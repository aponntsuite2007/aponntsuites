/**
 * ============================================================================
 * CRITICAL PATH UI - VISTA DE CAMINO CRÍTICO CPM/PERT
 * ============================================================================
 *
 * Reemplazo completo del Gantt Chart por sistema de Camino Crítico inteligente
 *
 * ============================================================================
 */

// FUNCIÓN PARA INTEGRAR EN engineering-dashboard.js
// Reemplaza: renderGanttView()
async function renderCriticalPathView() {
  if (!this.metadata) return '<p>Cargando...</p>';

  try {
    // Fetch análisis de camino crítico
    const response = await fetch('/api/critical-path/analyze');
    const { analysis } = await response.json();

    // Fetch estadísticas
    const statsResponse = await fetch('/api/critical-path/statistics');
    const { statistics } = await statsResponse.json();

    return `
      <div class="critical-path-container" style="padding: 20px;">
        <!-- Header -->
        <div class="cp-header" style="margin-bottom: 30px;">
          <h2 style="margin: 0 0 10px 0; color: #1f2937; display: flex; align-items: center; gap: 10px;">
            <span>🎯</span>
            <span>Camino Crítico - Programación CPM/PERT</span>
          </h2>
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            Gestión inteligente de tareas basada en Critical Path Method
          </p>
        </div>

        <!-- Estadísticas Globales -->
        <div class="cp-stats" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
          <div class="stat-card critical" style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(220, 38, 38, 0.2);">
            <div style="font-size: 14px; opacity: 0.9; margin-bottom: 8px;">⚠️ Tareas Críticas</div>
            <div style="font-size: 32px; font-weight: 700; margin-bottom: 4px;">${statistics.critical}</div>
            <div style="font-size: 12px; opacity: 0.8;">de ${statistics.pending} pendientes</div>
          </div>

          <div class="stat-card" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.2);">
            <div style="font-size: 14px; opacity: 0.9; margin-bottom: 8px;">📅 Duración Proyecto</div>
            <div style="font-size: 32px; font-weight: 700; margin-bottom: 4px;">${statistics.projectDuration}</div>
            <div style="font-size: 12px; opacity: 0.8;">días estimados</div>
          </div>

          <div class="stat-card" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.2);">
            <div style="font-size: 14px; opacity: 0.9; margin-bottom: 8px;">✅ Progreso Global</div>
            <div style="font-size: 32px; font-weight: 700; margin-bottom: 4px;">${statistics.completionPercentage}%</div>
            <div style="font-size: 12px; opacity: 0.8;">${statistics.completed} de ${statistics.total} completadas</div>
          </div>

          <div class="stat-card" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(139, 92, 246, 0.2);">
            <div style="font-size: 14px; opacity: 0.9; margin-bottom: 8px;">⏱️ Holgura Promedio</div>
            <div style="font-size: 32px; font-weight: 700; margin-bottom: 4px;">${statistics.averageSlack}</div>
            <div style="font-size: 12px; opacity: 0.8;">días de slack</div>
          </div>
        </div>

        <!-- Tareas Críticas -->
        ${analysis.criticalTasks > 0 ? `
          <div class="cp-section" style="margin-bottom: 40px;">
            <h3 style="margin: 0 0 20px 0; color: #dc2626; display: flex; align-items: center; gap: 10px; font-size: 20px;">
              <span>⚠️</span>
              <span>Tareas Críticas (Slack = 0)</span>
            </h3>
            <div class="tasks-grid" style="display: flex; flex-direction: column; gap: 15px;">
              ${analysis.criticalPath.map(task => `
                <div class="task-card critical" style="background: white; border-left: 4px solid #dc2626; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: all 0.3s;" onmouseenter="this.style.transform='translateX(4px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)'" onmouseleave="this.style.transform='translateX(0)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)'">
                  <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                    <div style="flex: 1;">
                      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                        <span style="background: #fee2e2; color: #dc2626; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase;">⚠️ CRÍTICA</span>
                        <span style="background: #dbeafe; color: #2563eb; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600;">${task.phaseKey}</span>
                      </div>
                      <h4 style="margin: 0 0 8px 0; color: #1f2937; font-size: 16px; font-weight: 600;">${task.id}: ${task.name}</h4>
                      <div style="display: flex; gap: 20px; flex-wrap: wrap; font-size: 13px; color: #6b7280;">
                        <span title="Duración estimada"><strong>📅 Duración:</strong> ${task.duration} días</span>
                        <span title="Earliest Start"><strong>ES:</strong> ${task.es}</span>
                        <span title="Earliest Finish"><strong>EF:</strong> ${task.ef}</span>
                        <span title="Latest Start"><strong>LS:</strong> ${task.ls}</span>
                        <span title="Latest Finish"><strong>LF:</strong> ${task.lf}</span>
                        <span title="Slack/Float" style="color: #dc2626; font-weight: 600;"><strong>⏱️ Slack:</strong> ${task.slack} días</span>
                        <span title="Prioridad"><strong>🎯 Prioridad:</strong> ${task.priority}/10</span>
                      </div>
                    </div>
                  </div>
                  <div class="task-actions" style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button onclick="assignToClaude('${task.id}', '${task.phaseKey}')" style="flex: 1; min-width: 150px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; border: none; padding: 10px 16px; border-radius: 6px; font-weight: 500; cursor: pointer; font-size: 13px; transition: all 0.2s;" onmouseenter="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(59, 130, 246, 0.4)'" onmouseleave="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                      🤖 Asignar a Claude
                    </button>
                    <button onclick="assignToHuman('${task.id}', '${task.phaseKey}')" style="flex: 1; min-width: 150px; background: white; color: #3b82f6; border: 2px solid #3b82f6; padding: 10px 16px; border-radius: 6px; font-weight: 500; cursor: pointer; font-size: 13px; transition: all 0.2s;" onmouseenter="this.style.background='#eff6ff'" onmouseleave="this.style.background='white'">
                      👤 Asignar a Humano
                    </button>
                    <button onclick="completeTask('${task.id}', '${task.phaseKey}')" style="flex: 1; min-width: 150px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; padding: 10px 16px; border-radius: 6px; font-weight: 500; cursor: pointer; font-size: 13px; transition: all 0.2s;" onmouseenter="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(16, 185, 129, 0.4)'" onmouseleave="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                      ✅ Marcar Completada
                    </button>
                    <button onclick="updatePriority('${task.id}', '${task.phaseKey}')" style="background: white; color: #8b5cf6; border: 2px solid #8b5cf6; padding: 10px 16px; border-radius: 6px; font-weight: 500; cursor: pointer; font-size: 13px; transition: all 0.2s;" onmouseenter="this.style.background='#f5f3ff'" onmouseleave="this.style.background='white'">
                      🎯 Cambiar Prioridad
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Tareas No Críticas (con Holgura) -->
        ${analysis.tasks.filter(t => !t.isCritical && !t.done).length > 0 ? `
          <div class="cp-section">
            <h3 style="margin: 0 0 20px 0; color: #3b82f6; display: flex; align-items: center; gap: 10px; font-size: 20px;">
              <span>📋</span>
              <span>Tareas con Holgura</span>
            </h3>
            <div class="tasks-grid" style="display: flex; flex-direction: column; gap: 15px;">
              ${analysis.tasks.filter(t => !t.isCritical && !t.done).map(task => `
                <div class="task-card" style="background: white; border-left: 4px solid #3b82f6; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: all 0.3s;" onmouseenter="this.style.transform='translateX(4px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)'" onmouseleave="this.style.transform='translateX(0)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)'">
                  <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                    <div style="flex: 1;">
                      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                        <span style="background: #dbeafe; color: #2563eb; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600;">Slack: ${task.slack}d</span>
                        <span style="background: #f3f4f6; color: #6b7280; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600;">${task.phaseKey}</span>
                      </div>
                      <h4 style="margin: 0 0 8px 0; color: #1f2937; font-size: 16px; font-weight: 600;">${task.id}: ${task.name}</h4>
                      <div style="display: flex; gap: 20px; flex-wrap: wrap; font-size: 13px; color: #6b7280;">
                        <span><strong>📅 Duración:</strong> ${task.duration} días</span>
                        <span><strong>ES:</strong> ${task.es}</span>
                        <span><strong>EF:</strong> ${task.ef}</span>
                        <span><strong>LS:</strong> ${task.ls}</span>
                        <span><strong>LF:</strong> ${task.lf}</span>
                        <span style="color: #10b981; font-weight: 600;"><strong>⏱️ Slack:</strong> ${task.slack} días</span>
                        <span><strong>🎯 Prioridad:</strong> ${task.priority}/10</span>
                      </div>
                    </div>
                  </div>
                  <div class="task-actions" style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button onclick="assignToClaude('${task.id}', '${task.phaseKey}')" style="flex: 1; min-width: 150px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; border: none; padding: 10px 16px; border-radius: 6px; font-weight: 500; cursor: pointer; font-size: 13px; transition: all 0.2s;" onmouseenter="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(59, 130, 246, 0.4)'" onmouseleave="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                      🤖 Asignar a Claude
                    </button>
                    <button onclick="assignToHuman('${task.id}', '${task.phaseKey}')" style="flex: 1; min-width: 150px; background: white; color: #3b82f6; border: 2px solid #3b82f6; padding: 10px 16px; border-radius: 6px; font-weight: 500; cursor: pointer; font-size: 13px; transition: all 0.2s;" onmouseenter="this.style.background='#eff6ff'" onmouseleave="this.style.background='white'">
                      👤 Asignar a Humano
                    </button>
                    <button onclick="completeTask('${task.id}', '${task.phaseKey}')" style="flex: 1; min-width: 150px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; padding: 10px 16px; border-radius: 6px; font-weight: 500; cursor: pointer; font-size: 13px; transition: all 0.2s;" onmouseenter="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(16, 185, 129, 0.4)'" onmouseleave="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                      ✅ Marcar Completada
                    </button>
                    <button onclick="updatePriority('${task.id}', '${task.phaseKey}')" style="background: white; color: #8b5cf6; border: 2px solid #8b5cf6; padding: 10px 16px; border-radius: 6px; font-weight: 500; cursor: pointer; font-size: 13px; transition: all 0.2s;" onmouseenter="this.style.background='#f5f3ff'" onmouseleave="this.style.background='white'">
                      🎯 Cambiar Prioridad
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Análisis por Phases -->
        <div class="cp-section" style="margin-top: 40px;">
          <h3 style="margin: 0 0 20px 0; color: #1f2937; display: flex; align-items: center; gap: 10px; font-size: 20px;">
            <span>📊</span>
            <span>Análisis por Phases</span>
          </h3>
          <div style="display: grid; gap: 20px;">
            ${analysis.phases.map(phase => `
              <div class="phase-card" style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; ${phase.isCritical ? 'border-left: 4px solid #dc2626;' : ''}">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                  <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                      ${phase.isCritical ? '<span style="background: #fee2e2; color: #dc2626; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600;">⚠️ PHASE CRÍTICA</span>' : ''}
                      <span style="background: ${phase.status === 'COMPLETED' ? '#d1fae5' : phase.status === 'IN_PROGRESS' ? '#dbeafe' : '#f3f4f6'}; color: ${phase.status === 'COMPLETED' ? '#065f46' : phase.status === 'IN_PROGRESS' ? '#1e40af' : '#374151'}; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600;">${phase.status}</span>
                    </div>
                    <h4 style="margin: 0 0 8px 0; color: #1f2937; font-size: 16px; font-weight: 600;">${phase.name}</h4>
                    <div style="display: flex; gap: 20px; flex-wrap: wrap; font-size: 13px; color: #6b7280;">
                      <span><strong>Total Tareas:</strong> ${phase.totalTasks}</span>
                      <span><strong>✅ Completadas:</strong> ${phase.completedTasks}</span>
                      <span><strong>📋 Pendientes:</strong> ${phase.pendingTasks}</span>
                      <span style="${phase.criticalTasks > 0 ? 'color: #dc2626; font-weight: 600;' : ''}"><strong>⚠️ Críticas:</strong> ${phase.criticalTasks}</span>
                      <span><strong>📈 Progreso:</strong> ${phase.progress}%</span>
                    </div>
                  </div>
                </div>
                <div class="progress-bar-container" style="width: 100%; height: 8px; background: #f3f4f6; border-radius: 4px; overflow: hidden;">
                  <div class="progress-bar" style="width: ${phase.progress}%; height: 100%; background: linear-gradient(90deg, #3b82f6 0%, #10b981 100%); transition: width 0.3s;"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

      </div>

      <script>
        // ========================================================================
        // FUNCIONES DE INTERACCIÓN
        // ========================================================================

        async function assignToClaude(taskId, phaseKey) {
          try {
            const instructions = prompt('Instrucciones adicionales para Claude (opcional):');

            const response = await fetch('/api/task-intelligence/assign-to-claude', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                taskId,
                phaseKey,
                instructions: instructions || ''
              })
            });

            const data = await response.json();

            if (data.success) {
              // Crear modal con información para Claude
              const modal = document.createElement('div');
              modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 10000;';
              modal.innerHTML = \`
                <div style="background: white; border-radius: 12px; padding: 30px; max-width: 600px; max-height: 80vh; overflow-y: auto;">
                  <h3 style="margin: 0 0 20px 0;">🤖 Tarea Asignada a Claude Code</h3>
                  <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-family: monospace; font-size: 13px; overflow-x: auto;">
                    <code>\${data.claudeContext.commandToRun}</code>
                  </div>
                  <div style="background: #eff6ff; padding: 15px; border-radius: 8px; margin-bottom: 20px; white-space: pre-wrap; font-size: 13px;">
                    \${data.claudeContext.message}
                  </div>
                  <div style="display: flex; gap: 10px;">
                    <button onclick="navigator.clipboard.writeText('\${data.claudeContext.commandToRun}'); alert('Comando copiado al portapapeles')" style="flex: 1; background: #3b82f6; color: white; border: none; padding: 12px; border-radius: 6px; font-weight: 500; cursor: pointer;">
                      📋 Copiar Comando
                    </button>
                    <button onclick="this.closest('div[style*=fixed]').remove()" style="background: #6b7280; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; cursor: pointer;">
                      Cerrar
                    </button>
                  </div>
                </div>
              \`;
              document.body.appendChild(modal);
            }
          } catch (error) {
            alert('Error: ' + error.message);
          }
        }

        async function assignToHuman(taskId, phaseKey) {
          const assignedTo = prompt('¿A quién asignar esta tarea?');
          if (!assignedTo) return;

          try {
            const response = await fetch('/api/task-intelligence/assign-to-human', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ taskId, phaseKey, assignedTo })
            });

            const data = await response.json();

            if (data.success) {
              alert(\`✅ Tarea \${taskId} asignada a \${assignedTo}\`);
              location.reload();
            }
          } catch (error) {
            alert('Error: ' + error.message);
          }
        }

        async function completeTask(taskId, phaseKey) {
          if (!confirm(\`¿Marcar tarea \${taskId} como completada?\`)) return;

          try {
            const response = await fetch('/api/task-intelligence/complete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                taskId,
                phaseKey,
                completedBy: 'human'
              })
            });

            const data = await response.json();

            if (data.success) {
              alert(\`✅ Tarea completada\\n\\n\${data.result.changes.join('\\n')}\`);
              location.reload();
            }
          } catch (error) {
            alert('Error: ' + error.message);
          }
        }

        async function updatePriority(taskId, phaseKey) {
          const newPriority = prompt('Nueva prioridad (1-10):', '5');
          if (!newPriority) return;

          const priority = parseInt(newPriority);
          if (priority < 1 || priority > 10) {
            alert('La prioridad debe estar entre 1 y 10');
            return;
          }

          try {
            const response = await fetch('/api/critical-path/update-priority', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ taskId, phaseKey, priority })
            });

            const data = await response.json();

            if (data.success) {
              alert(\`✅ Prioridad actualizada\\nCamino crítico recalculado automáticamente\`);
              location.reload();
            }
          } catch (error) {
            alert('Error: ' + error.message);
          }
        }
      </script>
    `;

  } catch (error) {
    console.error('Error renderizando Critical Path:', error);
    return \`
      <div style="padding: 40px; text-align: center;">
        <h3 style="color: #dc2626;">❌ Error al cargar Camino Crítico</h3>
        <p style="color: #6b7280;">\${error.message}</p>
        <button onclick="location.reload()" style="background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; margin-top: 20px;">
          🔄 Reintentar
        </button>
      </div>
    \`;
  }
}

// Exportar para usar en engineering-dashboard.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderCriticalPathView };
}
