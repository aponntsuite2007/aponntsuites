# ═══════════════════════════════════════════════════════════════
# DOCKERFILE PARA RENDER - SISTEMA HÍBRIDO OLLAMA
# ═══════════════════════════════════════════════════════════════
#
# Este Dockerfile despliega la aplicación en Render con soporte para:
# - Node.js 18
# - Ollama 3B (modelo pequeño para 2 GB RAM)
# - PostgreSQL (conexión externa)
# - Sistema híbrido con fallback a OpenAI
#
# IMPORTANTE: Ollama 3B funciona en Render Starter (2 GB RAM)
# Para mejor precisión, considera usar servidor externo de Ollama o OpenAI
#
# ═══════════════════════════════════════════════════════════════

FROM node:18-slim

# Metadatos
LABEL maintainer="Sistema Biométrico"
LABEL description="Backend con Ollama 3B para diagnóstico IA"
LABEL version="2.0.0"

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=10000
ENV OLLAMA_BASE_URL=http://localhost:11434
ENV OLLAMA_MODEL=llama3.1:3b
ENV OLLAMA_TIMEOUT=30000

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Instalar Ollama
RUN curl -fsSL https://ollama.com/install.sh | sh

# Crear directorio de la aplicación
WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias de Node
RUN npm ci --only=production

# Copiar código fuente
COPY . .

# Exponer puerto
EXPOSE 10000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:${PORT}/api/v1/health || exit 1

# Script de inicio
RUN echo '#!/bin/bash\n\
set -e\n\
\n\
echo "🚀 Iniciando aplicación en Render..."\n\
\n\
# Iniciar Ollama en background\n\
echo "🤖 Iniciando Ollama service..."\n\
ollama serve &\n\
OLLAMA_PID=$!\n\
\n\
# Esperar a que Ollama esté listo\n\
echo "⏳ Esperando a que Ollama esté listo..."\n\
sleep 10\n\
\n\
# Descargar modelo 3B (pequeño para 2 GB RAM)\n\
echo "📥 Descargando modelo llama3.1:3b..."\n\
if ! ollama list | grep -q "llama3.1:3b"; then\n\
  ollama pull llama3.1:3b || echo "⚠️  No se pudo descargar modelo, continuando..."\n\
fi\n\
\n\
# Verificar Ollama\n\
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then\n\
  echo "✅ Ollama está corriendo"\n\
else\n\
  echo "⚠️  Ollama no disponible, se usará fallback (OpenAI o Patterns)"\n\
fi\n\
\n\
# Iniciar Node.js\n\
echo "🚀 Iniciando Node.js en puerto $PORT..."\n\
exec node server.js\n\
' > /app/start.sh && chmod +x /app/start.sh

# Comando de inicio
CMD ["/app/start.sh"]
