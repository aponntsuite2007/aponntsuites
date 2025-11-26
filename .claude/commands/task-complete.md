# Instrucciones para Marcar Tarea Completada

Al completar una tarea del Engineering Dashboard, sigue estos pasos EXACTOS:

## 1. ACTUALIZAR engineering-metadata.js

Editar el archivo `backend/engineering-metadata.js` y buscar la tarea por su ID:

```javascript
// Buscar en roadmap → [phaseKey] → tasks → encontrar por id
// Cambiar:
{
  id: "TASK-ID",
  name: "Nombre de la tarea",
  done: false,  // ← CAMBIAR A true
  completedDate: null  // ← CAMBIAR A fecha actual "YYYY-MM-DD"
}

// A:
{
  id: "TASK-ID",
  name: "Nombre de la tarea",
  done: true,
  completedDate: "2025-11-24"  // Fecha de hoy
}
```

## 2. ACTUALIZAR PROGRESO DE LA FASE

Si todas las tareas de la fase están done: true, actualizar la fase:

```javascript
// En roadmap → [phaseKey]
{
  name: "Nombre de la Fase",
  status: "COMPLETE",  // Cambiar de "IN_PROGRESS" a "COMPLETE"
  progress: 100,       // Si era 80, ahora es 100
  completionDate: "2025-11-24"  // Agregar fecha de hoy
}
```

## 3. LLAMAR AL API DE SINCRONIZACIÓN

Ejecutar este curl para notificar al sistema:

```bash
curl -X POST http://localhost:9998/api/task-intelligence/complete \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "TASK-ID",
    "phaseKey": "phase_key_aqui",
    "completedBy": "claude-code"
  }'
```

## 4. AGREGAR A latestChanges (opcional pero recomendado)

En `project.latestChanges`, agregar al inicio del array:

```javascript
latestChanges: [
  "✅ Completada tarea TASK-ID: Descripción breve - 2025-11-24",
  // ... resto de cambios anteriores
]
```

## EJEMPLO COMPLETO

Si completaste la tarea "BC-5" de la fase "phase2_budgetsContracts":

1. Buscar en `roadmap.phase2_budgetsContracts.tasks`
2. Encontrar `{ id: "BC-5", done: false }`
3. Cambiar a `{ id: "BC-5", done: true, completedDate: "2025-11-24" }`
4. Recalcular progress de la fase (ej: 5/13 = 38%)
5. Ejecutar curl con taskId="BC-5", phaseKey="phase2_budgetsContracts"

## IMPORTANTE

- SIEMPRE actualizar engineering-metadata.js ANTES de terminar la sesión
- El Engineering Dashboard lee este archivo para mostrar el progreso
- Sin esta actualización, el trabajo no se reflejará en el dashboard
