# 🚂 Railway Setup - Guía Completa

## ❌ ERROR ACTUAL
```
ConnectionRefusedError: connect ECONNREFUSED ::1:5432
```
**Causa**: Railway NO tiene PostgreSQL configurado o `DATABASE_URL` no está disponible.

---

## ✅ SOLUCIÓN: Configurar PostgreSQL en Railway

### **Paso 1: Agregar PostgreSQL Service**

1. Ir al proyecto Railway: https://railway.app/dashboard
2. Click en **"+ New"** → **"Database"** → **"Add PostgreSQL"**
3. Railway creará automáticamente un servicio PostgreSQL

### **Paso 2: Verificar Variables de Entorno**

Railway **automáticamente** provee estas variables cuando agregas PostgreSQL:

```bash
DATABASE_URL=postgresql://user:password@host:port/database
PGHOST=host
PGPORT=5432
PGUSER=user
PGPASSWORD=password
PGDATABASE=database
```

**IMPORTANTE**: NO agregues estas variables manualmente. Railway las genera automáticamente.

### **Paso 3: Variables que SÍ debes agregar manualmente**

En tu servicio web (NO en PostgreSQL), agrega estas variables:

```bash
NODE_ENV=production
PORT=3000
SESSION_SECRET=tu_secreto_aleatorio_32_caracteres
JWT_SECRET=tu_secreto_aleatorio_32_caracteres
DB_LOGGING=false
```

**Generar secretos aleatorios:**
```bash
# En tu terminal local (Git Bash)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### **Paso 4: Conectar PostgreSQL al Servicio Web**

1. En Railway dashboard, click en tu servicio **web** (el que corre Node.js)
2. Ve a **"Settings"** → **"Service Variables"**
3. Click **"+ New Variable"** → **"Add Reference"**
4. Selecciona el servicio PostgreSQL
5. Elige la variable `DATABASE_URL`
6. Click **"Add"**

Esto vincula el PostgreSQL con tu app web.

### **Paso 5: Verificar Conexión**

Después del redeploy, ve a los logs de Railway:

**✅ Debe aparecer:**
```
🚂 Conectando a Railway PostgreSQL via DATABASE_URL
✅ Conexión a PostgreSQL establecida (Optimizado)
```

**❌ NO debe aparecer:**
```
💻 Conectando a PostgreSQL local
ECONNREFUSED ::1:5432
```

---

## 🔍 Debugging en Railway

### Ver variables de entorno actuales:
```bash
railway variables
```

### Ver logs en tiempo real:
```bash
railway logs
```

### Conectar a PostgreSQL directamente:
```bash
railway connect postgres
```

---

## 📋 Checklist de Deploy

- [ ] PostgreSQL service agregado en Railway
- [ ] `DATABASE_URL` visible en variables del servicio web
- [ ] Variables manuales agregadas (SESSION_SECRET, JWT_SECRET, etc.)
- [ ] Deploy exitoso sin errores ECONNREFUSED
- [ ] Logs muestran "🚂 Conectando a Railway PostgreSQL"
- [ ] Frontend carga sin errores Mixed Content
- [ ] API `/api/v1/health` responde OK
- [ ] Dropdown de empresas carga correctamente

---

## 🆘 Problemas Comunes

### 1. "ECONNREFUSED ::1:5432"
**Causa**: `DATABASE_URL` no está disponible
**Solución**: Verificar que PostgreSQL service está agregado y vinculado

### 2. "SSL connection required"
**Causa**: Railway requiere SSL para PostgreSQL
**Solución**: Ya configurado en `database.js` con `ssl: { require: true, rejectUnauthorized: false }`

### 3. "Variables no aparecen"
**Causa**: Variables no vinculadas correctamente
**Solución**: En Settings → Service Variables → Add Reference → Seleccionar PostgreSQL

### 4. "Build exitoso pero no arranca"
**Causa**: Puerto o health check incorrecto
**Solución**: Verificar `railway.json` tiene `healthcheckPath: "/"`

---

## 📞 Contacto
**Desarrollado por Pablo & Valentino Rivas**
📞 +54 2657 673741
🚀 Sistema Biométrico Empresarial v2.0
