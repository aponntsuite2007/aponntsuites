# 🚀 GUÍA DE DESPLIEGUE EN RENDER - SISTEMA HÍBRIDO OLLAMA

**Versión:** 1.0.0
**Fecha:** 2025-01-23
**Para:** Render Starter Plan (2 GB RAM, $7/mes)

---

## 📋 PREREQUISITOS

1. ✅ Cuenta de Render (ya tienes)
2. ✅ Repositorio Git del proyecto
3. ✅ Base de datos PostgreSQL en Render
4. ⚠️ Ollama local instalado para desarrollo (opcional)

---

## 🎯 OPCIONES DE DESPLIEGUE

### **OPCIÓN 1: Ollama 3B en Render** (Recomendada si tienes Starter Plan)
- **Pros**: Todo en un solo servidor, $7/mes
- **Contras**: Modelo 3B es menos preciso que 8B
- **Precisión esperada**: ~75-85%

### **OPCIÓN 2: OpenAI API** (Más simple)
- **Pros**: Mejor precisión (~90-95%), sin configuración de Ollama
- **Contras**: $3-10/mes adicionales
- **Precisión esperada**: ~90-95%

### **OPCIÓN 3: Híbrido (Ollama Externo + OpenAI)**
- **Pros**: Mejor de ambos mundos
- **Contras**: $15-20/mes (Render + Hetzner + OpenAI)
- **Precisión esperada**: ~85-95%

---

## 🚀 PASO A PASO: OPCIÓN 1 (Ollama 3B en Render)

### **1. Preparar Repositorio**

```bash
cd C:/Bio/sistema_asistencia_biometrico/backend

# Asegurarse que Dockerfile existe
ls -la Dockerfile

# Commit de archivos (si no lo hiciste)
git add Dockerfile .dockerignore
git commit -m "Add Dockerfile for Render deployment with Ollama 3B"
git push origin main
```

### **2. Configurar Servicio en Render**

1. **Ir a Render Dashboard**: https://dashboard.render.com
2. **Click "New +"** → **"Web Service"**
3. **Conectar repositorio** (autorizar GitHub/GitLab)
4. **Seleccionar rama**: `main`

### **3. Configuración del Servicio**

| Campo | Valor |
|-------|-------|
| **Name** | `aponntsuites-backend` |
| **Region** | Oregon (default) |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Environment** | `Docker` |
| **Docker Command** | *(dejar vacío, usa CMD del Dockerfile)* |
| **Plan** | `Starter` ($7/mes) |

### **4. Variables de Entorno**

Agregar estas variables en Render:

```bash
# Base de datos
DATABASE_URL=<tu-postgresql-url-de-render>

# Node
NODE_ENV=production
PORT=10000

# Ollama (se usa el local del contenedor)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:3b
OLLAMA_TIMEOUT=30000

# OpenAI Fallback (OPCIONAL pero recomendado)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# JWT
JWT_SECRET=<tu-secret-seguro>

# CORS
FRONTEND_URL=https://tu-frontend.com
```

### **5. Deploy**

1. Click **"Create Web Service"**
2. Render comenzará el build (15-20 minutos primera vez)
3. Verás logs en tiempo real

**Logs esperados:**
```
🚀 Iniciando aplicación en Render...
🤖 Iniciando Ollama service...
⏳ Esperando a que Ollama esté listo...
📥 Descargando modelo llama3.1:3b... (4-5 min)
✅ Ollama está corriendo
🚀 Iniciando Node.js en puerto 10000...
🚀 Servidor corriendo en puerto 10000
```

### **6. Verificar Despliegue**

```bash
# Health check
curl https://aponntsuites.onrender.com/api/v1/health

# Verificar métricas
curl -H "Authorization: Bearer <token>" \
  https://aponntsuites.onrender.com/api/audit/metrics/precision
```

---

## 🚀 PASO A PASO: OPCIÓN 2 (Solo OpenAI API)

Más simple, mejor precisión, pero cuesta $3-10/mes adicionales.

### **1. Modificar Dockerfile**

Comentar la instalación de Ollama:

```dockerfile
# Desactivar Ollama
# RUN curl -fsSL https://ollama.com/install.sh | sh

# Modificar start.sh para solo iniciar Node
CMD ["node", "server.js"]
```

### **2. Variables de Entorno en Render**

```bash
DATABASE_URL=<tu-postgresql-url>
NODE_ENV=production
PORT=10000
JWT_SECRET=<tu-secret>

# OpenAI como principal (no fallback)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# NO configurar OLLAMA_BASE_URL
```

El sistema automáticamente:
- Detecta que Ollama no está disponible (Nivel 1 y 2 fallan)
- Va directo a OpenAI (Nivel 3)
- Si OpenAI falla, usa Patterns (Nivel 4)

---

## 🚀 PASO A PASO: OPCIÓN 3 (Híbrido Externo)

Mejor precisión, pero más complejo.

### **1. Servidor Ollama Dedicado (Hetzner)**

**Crear VPS en Hetzner** ($5/mes - 4 GB RAM):

```bash
# SSH al servidor
ssh root@<ip-del-servidor>

# Instalar Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Descargar modelo 8B
ollama pull llama3.1:8b

# Iniciar servicio (puerto 11434)
ollama serve

# Verificar
curl http://localhost:11434/api/tags
```

**Exponer públicamente** (con Nginx):

```nginx
server {
    listen 80;
    server_name ollama.tu-dominio.com;

    location / {
        proxy_pass http://localhost:11434;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### **2. Configurar en Render**

```bash
# Variables de entorno
DATABASE_URL=<tu-postgresql-url>
NODE_ENV=production
PORT=10000
JWT_SECRET=<tu-secret>

# Ollama externo
OLLAMA_EXTERNAL_URL=http://ollama.tu-dominio.com
OLLAMA_MODEL=llama3.1:8b

# OpenAI fallback
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

### **3. Deploy en Render**

Usar el Dockerfile original, pero Ollama local no se usará (va directo al externo).

---

## 📊 COMPARACIÓN DE COSTOS

| Opción | Costo Mensual | Precisión | Complejidad |
|--------|---------------|-----------|-------------|
| **Ollama 3B en Render** | $7 | 75-85% | Media |
| **Solo OpenAI** | $10-17 | 90-95% | Baja |
| **Híbrido (Externo)** | $15-20 | 85-95% | Alta |

---

## 🔧 TROUBLESHOOTING

### Problema 1: Ollama no descarga el modelo

**Síntoma:** Logs muestran "⚠️ No se pudo descargar modelo"

**Solución:**
- Es normal en primera vez (timeout)
- El sistema usa fallback (OpenAI o Patterns)
- En siguiente deploy, el modelo ya estará descargado

### Problema 2: OOM (Out of Memory)

**Síntoma:** Contenedor crashea con "Killed"

**Solución:**
- Cambiar a modelo más pequeño: `llama3.1:1b`
- O cambiar a OPCIÓN 2 (Solo OpenAI)

### Problema 3: Build timeout

**Síntoma:** Build tarda más de 15 minutos

**Solución:**
- Descargar modelo después del deploy (no en Dockerfile)
- Modificar start.sh para descargar en background

### Problema 4: Cold starts lentos

**Síntoma:** Primera request tarda 30-60 segundos

**Solución:**
- Render Starter tiene cold starts
- Considerar plan Pro ($25/mes) con always-on
- O ping cada 10 minutos con cron job externo

---

## 📈 MONITOREAR PRECISIÓN

Una vez desplegado, monitorea las métricas:

```bash
# Ver dashboard
https://aponntsuites.onrender.com/auditor-metrics.html

# API de métricas
curl -H "Authorization: Bearer <token>" \
  https://aponntsuites.onrender.com/api/audit/metrics/dashboard-summary
```

**Criterio de decisión:**

- Si Ollama `success_rate < 70%` → Cambiar a OpenAI
- Si Ollama `success_rate >= 75%` → Mantener
- Revisar métricas cada semana

---

## 🎯 RECOMENDACIÓN FINAL

Para tu caso (**Render Starter + $7/mes**):

1. **Empezar con OPCIÓN 1** (Ollama 3B en Render)
2. **Monitorear métricas** durante 1 semana
3. **Si precisión < 70%** → Cambiar a OPCIÓN 2 (OpenAI)
4. **Si precisión >= 75%** → Mantener

**Costo total estimado:**
- OPCIÓN 1: $7/mes (solo Render)
- Si cambias a OPCIÓN 2: $10-17/mes (Render + OpenAI)

---

## 📝 CHECKLIST DE DEPLOY

- [ ] Dockerfile creado
- [ ] .dockerignore configurado
- [ ] Variables de entorno configuradas en Render
- [ ] Migración de BD ejecutada
- [ ] Repositorio pusheado a main
- [ ] Servicio creado en Render
- [ ] Build exitoso
- [ ] Health check funciona
- [ ] Dashboard de métricas accesible
- [ ] Ejecutar primera auditoría de prueba

---

**¿Listo para hacer deploy?**

1. Haz commit de todos los cambios
2. Push a GitHub/GitLab
3. Crea servicio en Render
4. Monitorea logs
5. ¡Disfruta del sistema híbrido! 🎉
