/**
 * Script para analizar tareas disponibles en plugAndPlayDependencyAudit
 */
const http = require('http');

http.get('http://localhost:9998/api/engineering/roadmap', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    const pp = json.data && json.data.plugAndPlayDependencyAudit;

    if (!pp) {
      console.log('NO HAY plugAndPlayDependencyAudit');
      return;
    }

    console.log('=== ESTRUCTURA DE TAREAS EN PLUG & PLAY ===');
    console.log('Tareas principales (PP-X):', pp.tasks ? pp.tasks.length : 0);

    // Contar implementationTasks
    let totalImpl = 0;
    let availableImpl = 0;
    const availableTasks = [];
    const criticalTasks = [];

    (pp.tasks || []).forEach(task => {
      if (task.implementationTasks) {
        totalImpl += task.implementationTasks.length;
        task.implementationTasks.forEach(impl => {
          if (impl.status === 'AVAILABLE') {
            availableImpl++;
            const taskInfo = {
              id: impl.id,
              name: impl.name,
              priority: impl.priority || 'MEDIUM',
              assignedTo: impl.assignedTo || 'Sin asignar',
              estimatedEffort: impl.estimatedEffort || 'N/A',
              parentId: task.id,
              dependencies: impl.dependencies || []
            };
            availableTasks.push(taskInfo);

            if (impl.priority === 'CRITICAL') {
              criticalTasks.push(taskInfo);
            }
          }
        });
      }
    });

    console.log('Tareas de implementación totales:', totalImpl);
    console.log('Tareas AVAILABLE:', availableImpl);
    console.log('Tareas CRITICAL:', criticalTasks.length);

    console.log('\n=== TAREAS CRÍTICAS (CAMINO CRÍTICO) ===');
    criticalTasks.forEach((t, i) => {
      console.log((i+1) + '. ' + t.id);
      console.log('   Nombre: ' + t.name.substring(0, 70));
      console.log('   Asignado: ' + t.assignedTo);
      console.log('   Esfuerzo: ' + t.estimatedEffort);
      console.log('   Deps: ' + (t.dependencies.length > 0 ? t.dependencies.join(', ') : 'Ninguna'));
      console.log('');
    });

    console.log('\n=== TODAS LAS TAREAS AVAILABLE POR PRIORIDAD ===');

    // Agrupar por prioridad
    const byPriority = {
      CRITICAL: availableTasks.filter(t => t.priority === 'CRITICAL'),
      HIGH: availableTasks.filter(t => t.priority === 'HIGH'),
      MEDIUM: availableTasks.filter(t => t.priority === 'MEDIUM'),
      LOW: availableTasks.filter(t => t.priority === 'LOW')
    };

    Object.entries(byPriority).forEach(([priority, tasks]) => {
      if (tasks.length > 0) {
        console.log('\n[' + priority + '] - ' + tasks.length + ' tareas:');
        tasks.forEach(t => {
          console.log('  - ' + t.id + ': ' + t.name.substring(0, 55) + '...');
        });
      }
    });

    // Agrupar por assignedTo
    console.log('\n=== TAREAS POR ASIGNACIÓN ===');
    const byAssigned = {};
    availableTasks.forEach(t => {
      const key = t.assignedTo;
      if (!byAssigned[key]) byAssigned[key] = [];
      byAssigned[key].push(t);
    });

    Object.entries(byAssigned).forEach(([assigned, tasks]) => {
      console.log('\n' + assigned + ' (' + tasks.length + ' tareas):');
      tasks.forEach(t => {
        console.log('  [' + t.priority + '] ' + t.id);
      });
    });
  });
}).on('error', e => console.error('Error:', e.message));
