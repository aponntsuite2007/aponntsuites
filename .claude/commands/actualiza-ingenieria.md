# Actualizar Engineering Metadata

Actualiza el timestamp y cambios recientes en `backend/engineering-metadata.js`.

## Pasos a ejecutar:

1. **Actualizar timestamp**: Cambiar `lastUpdated` en la sección principal a la fecha/hora actual (formato ISO 8601)

2. **Actualizar latestChanges**: Agregar una entrada con:
   - Fecha actual
   - Descripción breve del cambio realizado
   - Archivos modificados

3. **Sincronizar con modules-registry.json**: Ejecutar el script de sincronización si existe:
   ```bash
   node backend/scripts/sync-metadata-registry.js
   ```

4. **Verificar sintaxis**: Asegurar que el archivo sigue siendo válido:
   ```bash
   node -c backend/engineering-metadata.js
   ```

5. **Informar al usuario**: Mostrar resumen de cambios aplicados

## Notas:
- Este comando se ejecuta después de modificar workflows, módulos o cualquier otra sección de engineering-metadata.js
- Mantiene la trazabilidad de cambios en el sistema
- Sincroniza automáticamente con el registro de módulos usado por el Sistema de Auditoría
