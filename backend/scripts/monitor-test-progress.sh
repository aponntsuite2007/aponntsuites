#!/bin/bash
# Monitor simple del progreso del test

TEST_OUTPUT="/c/Users/notebook/AppData/Local/Temp/claude/C--Bio-sistema-asistencia-biometrico/tasks/b6a4104.output"

while true; do
  sleep 180  # Cada 3 minutos

  # Contar sin usar variables
  echo -n "[MONITOR $(date +%H:%M:%S)] "
  grep -a "Testeando módulo:" "$TEST_OUTPUT" 2>/dev/null | wc -l | tr -d '\n'
  echo "/51 módulos"

  # Verificar si completó
  COUNT=$(grep -a "Testeando módulo:" "$TEST_OUTPUT" 2>/dev/null | wc -l | tr -d ' ')

  if [ "$COUNT" -ge 51 ]; then
    echo "¡TEST COMPLETADO!"
    break
  fi
done

echo ""
echo "Generando resumen final..."
bash /c/Bio/sistema_asistencia_biometrico/backend/scripts/generate-test-summary.sh
