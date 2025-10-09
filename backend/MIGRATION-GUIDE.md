# 📦 Guía de Migración de Datos Local → Render

## 🎯 Objetivo
Migrar tus empresas, usuarios y datos reales desde PostgreSQL local a Render (producción).

---

## ⚡ PROCESO RÁPIDO (3 pasos)

### **PASO 1: Exportar datos locales**

```bash
cd C:\Bio\sistema_asistencia_biometrico\backend
node export-data.js
```

**Resultado:**
```
✅ EXPORTACIÓN COMPLETADA
📦 Archivo generado: migration-data-1696780000000.sql
📊 Resumen:
   - 5 empresas
   - 47 usuarios
   - 12 departamentos
   - 8 turnos
   - 3 kiosks
```

Genera un archivo `.sql` con todos tus datos.

---

### **PASO 2: Obtener DATABASE_URL de Render**

1. Ve a: https://dashboard.render.com/
2. Click en tu servicio **PostgreSQL** (NO el web service)
3. En la sección "Connections", busca **"External Database URL"**
4. Click en **"Copy"** (NO uses Internal URL)

Debería verse así:
```
postgresql://attendance_system_user:xxxxx@dpg-xxxxx.oregon-postgres.render.com/attendance_system_xxxxx
```

---

### **PASO 3: Importar a Render**

```bash
cd C:\Bio\sistema_asistencia_biometrico\backend

DATABASE_URL="postgresql://TU_URL_AQUI" node import-to-render.js migration-data-XXXXX.sql
```

**IMPORTANTE:** Reemplaza:
- `TU_URL_AQUI` con la URL que copiaste de Render
- `migration-data-XXXXX.sql` con el nombre del archivo generado en PASO 1

**Resultado esperado:**
```
✅ IMPORTACIÓN COMPLETADA
📊 Resumen:
   ✅ Insertados: 75
   ⏭️  Omitidos (ya existen): 0
   ❌ Errores: 0

🔍 Verificando datos en Render...
   📋 Empresas: 5
   👥 Usuarios: 47
   🏢 Departamentos: 12
   ⏰ Turnos: 8
   🖥️  Kiosks: 3

✅ MIGRACIÓN EXITOSA
```

---

## ✅ VERIFICAR QUE FUNCIONÓ

1. Abre: https://aponntsuites.onrender.com/panel-administrativo.html
2. El dropdown de empresas ahora debería mostrar tus empresas reales
3. Prueba hacer login con tus usuarios reales

---

## ⚠️ PROBLEMAS COMUNES

### Error: "DATABASE_URL no está configurado"
**Solución:** Asegurate de poner las comillas en el comando:
```bash
DATABASE_URL="postgresql://..." node import-to-render.js archivo.sql
```

### Error: "SSL connection required"
**Solución:** Ya está configurado en el script. Si persiste, verifica que estás usando **External Database URL** (no Internal).

### Error: "duplicate key"
**Solución:** Normal si re-ejecutas. El script omite registros duplicados automáticamente.

### No aparecen empresas después de importar
**Solución:** Espera 1-2 minutos y refresca. Si persiste:
```bash
curl https://aponntsuites.onrender.com/api/aponnt/dashboard/companies
```
Debería devolver tus empresas.

---

## 📊 ¿Qué datos se migran?

✅ Empresas (companies)
✅ Usuarios (users) - con contraseñas hasheadas
✅ Departamentos (departments)
✅ Turnos (shifts)
✅ Kiosks (kiosks)

❌ NO se migran (por seguridad):
- Registros de asistencia (attendances) - muy pesado
- Datos biométricos - sensibles
- Logs y auditoría

**Si necesitás migrar asistencias también, decime y te armo el script.**

---

## 🔄 Re-ejecutar la migración

Si necesitás volver a importar (ej: agregaste empresas nuevas):

1. Re-ejecuta `node export-data.js`
2. Genera nuevo archivo .sql
3. Re-ejecuta el import

Los registros duplicados se omiten automáticamente (ON CONFLICT DO NOTHING).

---

Desarrollado por Pablo & Valentino Rivas 🚀
