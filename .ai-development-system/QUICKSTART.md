# 🚀 QUICKSTART - AI Autonomous Development System

**5 minutos para empezar** 🕐

---

## 📋 Pre-requisitos

Verificar que tengas:
- ✅ Node.js instalado
- ✅ Flutter SDK instalado
- ✅ Android SDK (adb + emulator)
- ✅ Backend corriendo en puerto 3001

---

## 🎯 Opción 1: Ciclo Completo (Recomendado)

**Un solo comando para testing completo:**

```bash
cd .ai-development-system
node automation-cli.js full-cycle
```

**Esto hará:**
1. ✅ Health check de todos los componentes
2. 🔨 Compilar APK Flutter
3. 📦 Instalar en emulador
4. 🚀 Ejecutar app
5. 📋 Capturar logs por 8s
6. 🔬 Analizar errores
7. 📊 Generar reporte JSON

**Resultado:** Log completo en `.ai-development-system/logs/session-YYYYMMDD-HHMMSS.json`

---

## 🎯 Opción 2: Scripts Windows

**Doble clic para ejecutar:**

```
.ai-development-system\auto-test.bat
```

**Abre cmd y ejecuta el ciclo completo automáticamente.**

---

## 🎯 Opción 3: Dashboard Web

**Abrir en navegador:**

```
file:///C:/Bio/sistema_asistencia_biometrico/.ai-development-system/dashboard.html
```

**Controles visuales para:**
- 🚀 Ejecutar ciclo completo
- 🏥 Health check
- 🔨 Compilar APK
- 🧪 Testear APK
- 📋 Ver logs

---

## 📚 Comandos Disponibles

### Health Check
```bash
node automation-cli.js health
```
Verifica: Backend, Emulador, Flutter, Node.js

### Solo Compilar
```bash
node automation-cli.js compile
```
Compila APK sin instalar ni testear

### Solo Testear
```bash
node automation-cli.js test-only
```
Instala y testea APK ya compilado

### Analizar Logs
```bash
node automation-cli.js analyze-logs
```
Analiza el último archivo de logs

---

## 🔧 Scripts Individuales

### Compilar APK
```bash
node scripts/compile-apk.js
```

### Testear APK
```bash
node scripts/test-apk.js
```

### Health Check
```bash
node scripts/health-check.js
```

### Analizar Logs
```bash
node scripts/analyze-logs.js logs/session-YYYYMMDD-HHMMSS.txt
```

---

## 📊 Interpretar Resultados

### ✅ **Éxito Total**
```json
{
  "metrics": {
    "errors": 0,
    "success": 10
  }
}
```
→ App funciona perfectamente

### ⚠️ **Errores Detectados**
```json
{
  "metrics": {
    "errors": 3
  },
  "errors": [
    { "step": "compile-apk", "error": "..." }
  ]
}
```
→ Ver archivo de logs para detalles

---

## 🐛 Solución de Problemas

### Backend no responde
```bash
# Verificar puerto
netstat -ano | findstr :3001

# Reiniciar
cd backend
PORT=3001 npm start
```

### Emulador no detectado
```bash
# Listar AVDs
emulator -list-avds

# Iniciar emulador
emulator -avd Medium_Phone_API_36.0 -no-snapshot-load
```

### Errores de compilación
```bash
# Limpiar Flutter
cd frontend_flutter
flutter clean
flutter pub get

# Recompilar
node .ai-development-system/automation-cli.js compile
```

---

## 📁 Estructura de Logs

```
.ai-development-system/logs/
├── session-2025-10-01-143022.json     # Metadata de sesión
└── logs-2025-10-01-143022.txt         # Logs completos de Flutter
```

**Formato JSON:**
```json
{
  "id": "2025-10-01-143022",
  "startTime": "2025-10-01T14:30:22.000Z",
  "endTime": "2025-10-01T14:31:07.000Z",
  "steps": [
    { "step": "health-backend", "status": "success" },
    { "step": "compile-apk", "status": "success", "duration": "28.3s" },
    { "step": "install-apk", "status": "success" }
  ],
  "metrics": {
    "totalDuration": "45.2s",
    "errors": 0,
    "success": 12
  }
}
```

---

## 🔮 Próximos Pasos

1. **Leer metodología completa:** `METHODOLOGY.md`
2. **Explorar dashboard:** `dashboard.html`
3. **Personalizar config:** `config.json`
4. **Ver README completo:** `README.md`

---

## ⚡ TL;DR

**Un solo comando:**
```bash
node .ai-development-system/automation-cli.js full-cycle
```

**Dashboard visual:**
```
file:///.ai-development-system/dashboard.html
```

**¡Listo!** 🎉

---

**Creado con ❤️ usando Claude Code + Metodología Autónoma**
