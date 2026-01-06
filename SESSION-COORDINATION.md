# 🚦 COORDINACIÓN ENTRE SESIONES DE CLAUDE CODE

**Fecha inicio**: 2026-01-06
**Propósito**: Evitar conflictos entre sesiones paralelas de Claude Code

---

## 📋 SESIONES ACTIVAS

### Sesión 1: NOTIFICACIONES (Branch: feature/notification-central-exchange)
**Responsable**: Integración total del sistema de notificaciones
**Archivos EXCLUSIVOS** (solo esta sesión puede modificar):
- ✅ `backend/src/services/NotificationCentralExchange.js` (NUEVO)
- ✅ `backend/src/services/NotificationChannelDispatcher.js` (NUEVO)
- ✅ `backend/src/services/NotificationRecipientResolver.js`
- ✅ `backend/src/services/NotificationOrchestrator.js` (deprecar)
- ✅ `backend/src/services/NotificationWorkflowService.js` (deprecar)
- ✅ `backend/src/services/NotificationUnifiedService.js` (deprecar)
- ✅ `backend/migrations/20260106_notification_central_exchange.sql` (NUEVO)
- ✅ `backend/src/routes/notificationRoutes.js` (si necesita modificación)

**Archivos COMPARTIDOS** (consultar antes de modificar):
- ⚠️ `backend/engineering-metadata.js` (Brain lo actualiza automáticamente)
- ⚠️ `backend/src/config/database.js` (agregar modelos)

**NO TOCAR**:
- ❌ Todos los archivos del auditor (`backend/src/auditor/**`)
- ❌ `backend/src/auditor/collectors/FrontendCollector.js`
- ❌ Testing files en general

---

### Sesión 2: TESTING/AUDITOR (Branch: main o feature/auditor-fixes)
**Responsable**: Fix sintaxis FrontendCollector + Testing
**Archivos EXCLUSIVOS**:
- ✅ `backend/src/auditor/collectors/FrontendCollector.js` (FIX PRIORITARIO línea 1683)
- ✅ `backend/src/auditor/**/*.js` (todos los collectors)
- ✅ `backend/src/testing/**/*.js`
- ✅ `backend/tests/**/*.js`

**NO TOCAR**:
- ❌ Archivos de la Sesión 1 (NotificationCentralExchange, etc.)

---

## 🔐 PROTOCOLO DE COMMITS SEGUROS

### ANTES DE CADA COMMIT:

```bash
# 1. Ver qué archivos vas a commitear
git status

# 2. Ver SOLO los archivos que SON TUYOS según la matriz de arriba
git diff <archivo_que_SI_es_tuyo>

# 3. Si hay archivos que NO son tuyos en "Changes not staged":
#    - NO los agregues con "git add ."
#    - Usa "git add" selectivo:
git add backend/src/services/NotificationCentralExchange.js
git add backend/src/services/NotificationChannelDispatcher.js
# etc.

# 4. NUNCA usar "git add ." si hay archivos de otra sesión modificados

# 5. Commit SOLO tus archivos
git commit -m "FEAT: NotificationChannelDispatcher con integración SMTP"
```

### REGLAS DE ORO:

1. ✅ **Commits frecuentes** (cada 30-60 min) para minimizar pérdida
2. ✅ **git add selectivo** - NUNCA `git add .` si hay cambios de otra sesión
3. ✅ **Pull antes de commit** - Siempre `git pull origin <branch>` primero
4. ✅ **Mensajes claros** - Indicar qué sesión hizo el commit
5. ✅ **Push inmediato** - Para que otras sesiones vean cambios

---

## 🔄 FLUJO DE TRABAJO RECOMENDADO

### Inicio de sesión:
```bash
# 1. Ir a tu branch
git checkout feature/notification-central-exchange

# 2. Pull cambios del remoto
git pull origin feature/notification-central-exchange

# 3. Verificar que estás en el branch correcto
git branch
```

### Durante el trabajo:
```bash
# Cada 30-60 minutos:
git status  # Ver QUÉ cambió
git add <archivos_que_SON_TUYOS_solamente>
git commit -m "FEAT: [descripción]"
git push origin feature/notification-central-exchange
```

### Si otra sesión modificó archivo compartido:
```bash
# OPCIÓN A: Stash tus cambios
git stash
git pull origin <branch>
git stash pop
# Resolver conflictos si hay

# OPCIÓN B: Commit primero
git add <tus_archivos>
git commit -m "WIP: guardando progreso"
git pull origin <branch>
git push origin <branch>
```

---

## 🚨 QUÉ HACER SI HAY CONFLICTO

### Si `git status` muestra archivos de otra sesión:

**DETENTE y pregunta al usuario:**
> "Detecté cambios en `<archivo>` que pertenece a otra sesión según SESSION-COORDINATION.md. ¿Hay otra sesión activa? ¿Debo esperar a que termine?"

**NO continuar** hasta aclarar con el usuario.

---

## 📊 MERGE FINAL (cuando ambas sesiones terminen)

```bash
# Sesión 1 termina:
git checkout main
git merge feature/notification-central-exchange
git push origin main

# Sesión 2 termina:
git checkout main
git pull origin main  # ← IMPORTANTE: pull primero
git merge feature/auditor-fixes
# Resolver conflictos si hay
git push origin main
```

---

## 💡 TIPS ADICIONALES

1. **Comunicación**: El usuario debe decir a cada sesión qué está haciendo la otra
2. **Estado de branches**: Usar `git log --oneline --graph --all` para ver todo
3. **Cherry-pick**: Si necesitas un commit de otro branch: `git cherry-pick <commit-hash>`
4. **Backup manual**: Copiar archivos importantes fuera del repo antes de merge

---

## 📝 LOG DE COORDINACIÓN

### 2026-01-06 - Inicio
- Sesión 1 (Notificaciones): Creó branch `feature/notification-central-exchange`
- Sesión 2 (Testing): Trabajando en `main` (necesita fix en FrontendCollector.js)
- **CONFIRMADO**: No hay conflictos actualmente (Sesión 1 no tocó archivos del auditor)

### Próximas acciones:
- [ ] Sesión 2: Crear branch `feature/auditor-frontend-fixes`
- [ ] Sesión 2: Hacer commit del fix de FrontendCollector.js
- [ ] Sesión 1: Continuar implementación en su branch
- [ ] Al final: Merge ordenado (Sesión 2 → main, luego Sesión 1 → main)

---

**ÚLTIMA ACTUALIZACIÓN**: 2026-01-06 (Sesión Notificaciones)
