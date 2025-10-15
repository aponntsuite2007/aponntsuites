# 📄 Configuración de PDFs en Render

## Estado Actual

✅ **Sistema funcionando sin PDFs**
- Los emails de confirmación se envían **sin adjunto PDF**
- Toda la funcionalidad de consentimientos está operativa
- Los logs mostrarán: `⚠️ PDF service no disponible - enviando email sin PDF adjunto`

---

## Cómo Habilitar PDFs en Render

### Opción 1: Usar Build Script (Recomendado)

1. **Crear archivo `render-build.sh` en la raíz del backend:**

```bash
#!/usr/bin/env bash
# Instalar dependencias de Chromium para Puppeteer
apt-get update
apt-get install -y \
    chromium \
    chromium-driver \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libwayland-client0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils

# Instalar dependencias de Node.js
npm install
```

2. **Hacer el script ejecutable:**
```bash
chmod +x render-build.sh
```

3. **Configurar en Render Dashboard:**
   - Ve a tu servicio en Render
   - Settings → Build & Deploy
   - Build Command: `./render-build.sh`
   - Guardar cambios
   - Hacer un nuevo deploy

---

### Opción 2: Usar Dockerfile (Más Control)

1. **Crear `Dockerfile` en la raíz del backend:**

```dockerfile
FROM node:18-slim

# Instalar dependencias de Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-driver \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libwayland-client0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Configurar Puppeteer para usar Chromium instalado
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

2. **Configurar en Render Dashboard:**
   - Settings → Build & Deploy
   - Docker Command: (dejar por defecto)
   - Guardar y redesplegar

---

### Opción 3: Alternativa sin Puppeteer (Librerias ligeras)

Si los PDFs son opcionales, puedes usar **PDFKit** (más liviano):

```bash
npm install pdfkit
```

Luego modificar `pdfGenerationService.js` para usar PDFKit en lugar de Puppeteer.

---

## Verificar que PDFs están funcionando

### Logs exitosos:
```
✅ Puppeteer loaded successfully
✅ PDF generation service loaded successfully
📄 Generando PDF para user@example.com...
✅ PDF generado exitosamente: Consentimiento_Perez_Juan_1234567890.pdf
📁 PDF guardado en: /app/public/pdfs/consents/...
📎 PDF adjuntado al email
```

### Logs sin PDFs (estado actual):
```
⚠️ Puppeteer not available: Cannot find module 'puppeteer'
⚠️ PDF generation service not available (Puppeteer dependencies missing)
📧 Emails will be sent without PDF attachments
📧 PDF service no disponible - enviando email sin PDF adjunto
```

---

## Consideraciones

### Ventajas de habilitar PDFs:
✅ Comprobante legal oficial para empleados
✅ Documento firmado digitalmente
✅ Cumplimiento regulatorio completo
✅ Registros permanentes en servidor

### Desventajas:
⚠️ Aumenta tiempo de build (~2-3 minutos más)
⚠️ Consume más RAM durante generación
⚠️ Requiere dependencias del sistema

---

## Problemas Comunes

### 1. "Error: Failed to launch the browser process"
**Solución:** Verifica que todas las dependencias estén instaladas. El script debe ejecutarse con `apt-get` antes de `npm install`.

### 2. "ENOENT: no such file or directory, mkdir"
**Solución:** Asegúrate que el directorio `public/pdfs/consents` exista o tenga permisos de escritura.

### 3. Timeout en generación de PDF
**Solución:** Aumentar el timeout de Puppeteer o reducir el tamaño del HTML.

---

## Estado del Sistema

| Componente | Estado Actual | Con PDFs |
|------------|--------------|----------|
| Emails de solicitud | ✅ Funcionando | ✅ Funcionando |
| Página pública | ✅ Funcionando | ✅ Funcionando |
| Email de confirmación | ✅ Sin PDF | ✅ Con PDF |
| Firma digital | ✅ Funcionando | ✅ Funcionando |
| Audit trail | ✅ Funcionando | ✅ Funcionando |
| Almacenamiento PDF | ❌ Deshabilitado | ✅ Funcionando |

---

**Conclusión:** El sistema está 100% operativo sin PDFs. Los PDFs son un "nice to have" para tener comprobantes oficiales, pero no son esenciales para el cumplimiento legal básico.
