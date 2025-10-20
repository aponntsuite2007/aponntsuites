# 🤖 Instalación de Ollama + Llama 3.1

## ¿Qué es Ollama?
Ollama es un servidor de inferencia de IA que permite ejecutar modelos de lenguaje (LLMs) localmente en tu servidor/PC sin necesidad de APIs externas como OpenAI.

**Ventajas:**
- ✅ 100% privado (tus datos no salen del servidor)
- ✅ $0 de costo (sin suscripciones mensuales)
- ✅ Sin límites de requests
- ✅ Latencia baja (servidor local)

**Requisitos de Hardware:**
- **Mínimo:** 8 GB RAM, CPU moderna (4+ cores)
- **Recomendado:** 16 GB RAM, GPU NVIDIA (opcional pero acelera 10x)
- **Disco:** 5-10 GB por modelo

---

## Opción 1: Instalación en Windows (Desarrollo Local)

### Paso 1: Descargar Ollama
```bash
# Visita https://ollama.com/download
# Descarga: OllamaSetup.exe para Windows
# Ejecuta el instalador
```

### Paso 2: Verificar instalación
```bash
# Abre PowerShell o CMD
ollama --version
# Debería mostrar: ollama version 0.1.x
```

### Paso 3: Descargar modelo Llama 3.1
```bash
# Modelo pequeño (8B parámetros) - Recomendado para iniciar
ollama pull llama3.1:8b

# Modelo grande (70B parámetros) - Solo si tenés 32GB+ RAM
# ollama pull llama3.1:70b
```

Esto descargará ~4.7 GB (puede tardar 10-30 min según conexión).

### Paso 4: Probar el modelo
```bash
# Test básico
ollama run llama3.1:8b "¿Qué es un sistema de asistencia biométrico?"

# El modelo debería responder en español
```

### Paso 5: Verificar servidor
```bash
# Ollama inicia automáticamente en http://localhost:11434
# Probar endpoint:
curl http://localhost:11434/api/tags

# Debería retornar JSON con modelos instalados
```

---

## Opción 2: Instalación en Linux (Render/VPS)

### Paso 1: Instalar Ollama vía script
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### Paso 2: Iniciar servicio
```bash
# Ollama se instala como servicio systemd
sudo systemctl start ollama
sudo systemctl enable ollama  # Auto-iniciar en boot

# Verificar estado
sudo systemctl status ollama
```

### Paso 3: Descargar modelo
```bash
ollama pull llama3.1:8b
```

### Paso 4: Verificar
```bash
curl http://localhost:11434/api/tags
```

---

## Opción 3: Instalación en Render (Cloud)

**⚠️ IMPORTANTE:** Render Free Tier NO soporta Ollama (falta de RAM y disco persistente).

**Requisitos para Render:**
- Plan: **Standard o superior** (~$25/mes mínimo)
- RAM: **16 GB mínimo**
- Disco: **25 GB mínimo**
- Persistent Disk habilitado

### Configuración en Render:

1. **Crear Web Service** con Docker:
```dockerfile
# Dockerfile.ollama
FROM ollama/ollama:latest

# Descargar modelo en build time
RUN ollama serve & sleep 5 && ollama pull llama3.1:8b

EXPOSE 11434
CMD ["ollama", "serve"]
```

2. **Environment Variables:**
```bash
OLLAMA_HOST=0.0.0.0:11434
OLLAMA_MODELS=/opt/ollama/models  # Debe ser persistent disk
```

3. **Health Check:**
```
Path: /api/tags
Port: 11434
```

**Costo estimado Render con Ollama:**
- Standard Plan: $25/mes (8GB RAM) - Justo para llama3.1:8b
- Pro Plan: $85/mes (16GB RAM) - Cómodo para llama3.1:8b
- Pro Plus: $250/mes (32GB RAM) - Para llama3.1:70b

---

## Configuración en el Sistema de Asistencia

### Variables de entorno (`.env`):
```bash
# URL del servidor Ollama
OLLAMA_BASE_URL=http://localhost:11434

# En producción (Render):
# OLLAMA_BASE_URL=https://your-ollama-service.onrender.com

# Modelo a usar
OLLAMA_MODEL=llama3.1:8b

# Timeout para requests (en ms)
OLLAMA_TIMEOUT=30000

# Temperatura (0.0 = determinístico, 1.0 = creativo)
OLLAMA_TEMPERATURE=0.7

# Max tokens en respuesta
OLLAMA_MAX_TOKENS=500
```

---

## API de Ollama - Endpoints Principales

### 1. Generar respuesta (Chat)
```bash
POST http://localhost:11434/api/chat

{
  "model": "llama3.1:8b",
  "messages": [
    {
      "role": "system",
      "content": "Eres un asistente experto en sistemas de RRHH."
    },
    {
      "role": "user",
      "content": "¿Cómo registro asistencias?"
    }
  ],
  "stream": false
}
```

### 2. Listar modelos instalados
```bash
GET http://localhost:11434/api/tags
```

### 3. Verificar salud del servidor
```bash
GET http://localhost:11434/
```

---

## Troubleshooting

### Problema: "connection refused"
**Causa:** Ollama no está corriendo
**Solución:**
```bash
# Windows: Abrir Ollama desde menú inicio
# Linux: sudo systemctl start ollama
```

### Problema: "model not found"
**Causa:** Modelo no descargado
**Solución:**
```bash
ollama pull llama3.1:8b
```

### Problema: Respuestas lentas (>10 seg)
**Causa:** CPU sin GPU, modelo muy grande
**Solución:**
- Usar modelo más pequeño: `llama3.1:8b` en vez de `70b`
- Agregar GPU NVIDIA compatible con CUDA
- Reducir `max_tokens` en configuración

### Problema: Out of memory
**Causa:** RAM insuficiente
**Solución:**
- Cerrar otros programas
- Usar modelo más pequeño
- Aumentar RAM del servidor

---

## Recomendación Final

**Para desarrollo local (Windows):**
✅ Instalar Ollama en tu PC
✅ Usar llama3.1:8b (4.7 GB)
✅ Backend se conecta a http://localhost:11434

**Para producción:**
🔄 **Opción A:** VPS dedicado (DigitalOcean, Linode, etc.) con 16GB RAM (~$50/mes)
🔄 **Opción B:** Render Standard + Persistent Disk (~$25-50/mes)
🔄 **Opción C:** Migrar a OpenAI API cuando escale (solo pagar por uso)

---

## Next Steps

Una vez instalado Ollama:
1. ✅ Verificar que http://localhost:11434 responde
2. ✅ Confirmar modelo descargado: `ollama list`
3. ✅ Probar chat simple: `ollama run llama3.1:8b "Hola"`
4. ✅ Configurar `.env` con OLLAMA_BASE_URL
5. ✅ Continuar con implementación de AssistantService.js

**Status:** Instalación completada → Avanzar a backend integration
