# Ejecutar Migraciones en Render

## Problema
Las tablas `kiosks` y `sanctions` no existen en la base de datos de producción, causando errores 500.

## Solución

### Opción 1: Desde el Dashboard de Render (MÁS FÁCIL)

1. Ir a https://dashboard.render.com
2. Click en tu PostgreSQL database
3. Click en "Connect" → Copiar "External Database URL"
4. En tu computadora local, ejecutar:

```bash
cd backend

# Para kiosks:
DATABASE_URL="postgresql://user:pass@host/db" node execute-kiosks-migration.js

# Para sanctions:
DATABASE_URL="postgresql://user:pass@host/db" node execute-sanctions-migration.js
```

**Reemplazar** `postgresql://user:pass@host/db` con la URL que copiaste.

---

### Opción 2: Desde el Shell de Render

1. Ir a https://dashboard.render.com
2. Click en tu Web Service
3. Click en "Shell" (en el menú superior)
4. Ejecutar:

```bash
node execute-kiosks-migration.js
node execute-sanctions-migration.js
```

(La variable DATABASE_URL ya está configurada en el shell de Render)

---

## Verificación

Después de ejecutar, deberías ver:
```
✅ Migración de kiosks ejecutada exitosamente
✅ Tabla kiosks verificada
📊 Registros actuales en kiosks: 0
```

Y lo mismo para sanctions.

## ¿Qué hace esto?

Crea las tablas necesarias:
- `kiosks`: Para gestión de kioscos físicos
- `sanctions`: Para gestión de sanciones disciplinarias

Ambas con multi-tenant (company_id) y relaciones correctas.
