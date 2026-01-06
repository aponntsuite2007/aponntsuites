# 🔄 GIT WORKFLOW PROFESIONAL - MÚLTIPLES SESIONES CLAUDE CODE

## 🎯 REGLA DE ORO

```
1 SESIÓN = 1 BRANCH
Commits frecuentes (cada 30-60 min)
Pull/Merge frecuente
```

---

## 📋 PROTOCOLO PARA CADA SESIÓN

### **AL INICIO DE LA SESIÓN**

```bash
# 1. Verificar en qué branch estás
git branch

# 2. Si NO estás en TU branch, créalo
git checkout main
git pull origin main  # Actualizar main
git checkout -b feature/<nombre-descriptivo>

# Ejemplos:
# - Sesión Notificaciones: feature/notification-central-exchange
# - Sesión Testing: feature/auditor-frontend-fixes
# - Sesión Nueva Feature: feature/calendar-visual-module
```

### **DURANTE EL TRABAJO (cada 30-60 min)**

```bash
# 1. Ver qué cambió
git status

# 2. Agregar SOLO tus archivos (NUNCA "git add .")
git add backend/src/auditor/collectors/FrontendCollector.js
git add backend/src/testing/MasterTestingOrchestrator.js
# etc.

# 3. Commit con mensaje descriptivo
git commit -m "FEAT: Descripción del cambio

🔧 Detalles:
- Cambio 1
- Cambio 2

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# 4. Push a tu branch
git push origin feature/<tu-branch>
```

### **SINCRONIZACIÓN CON OTRAS SESIONES**

```bash
# Si otra sesión hizo cambios que NECESITAS, haz merge de main:

# 1. Guarda tu trabajo actual
git add .
git commit -m "WIP: guardando progreso"

# 2. Actualiza main
git checkout main
git pull origin main

# 3. Vuelve a tu branch y merge
git checkout feature/<tu-branch>
git merge main

# 4. Resuelve conflictos si hay
# (Git te dirá qué archivos tienen conflicto)

# 5. Continúa trabajando
```

---

## 🚨 MANEJO DE ARCHIVOS COMPARTIDOS

### **`engineering-metadata.js` (Brain lo actualiza automáticamente)**

**Problema**: Ambas sesiones pueden modificarlo.

**Solución**:

```bash
# OPCIÓN 1: Usar solo el tuyo (si el Brain lo generó en TU sesión)
git checkout --theirs backend/engineering-metadata.js  # Usar versión de main
git checkout --ours backend/engineering-metadata.js    # Usar tu versión

# OPCIÓN 2: Merge manual (elegir partes de cada uno)
# Git marcará el conflicto:
<<<<<<< HEAD
// Tu versión
=======
// Versión de la otra sesión
>>>>>>> main

# Editar manualmente y quedarte con lo que necesitas
```

### **Otros archivos compartidos**:

- **database.js** (si se agregan modelos): Merge manual
- **server.js** (si se agregan rutas): Merge manual
- **Archivos de migración**: Normalmente NO hay conflicto (cada sesión crea el suyo)

---

## ⚠️ CONFLICTOS: QUÉ HACER

### **Conflicto al hacer merge:**

```bash
# 1. Ver qué archivos tienen conflicto
git status

# Ejemplo:
# both modified: backend/engineering-metadata.js
# both modified: backend/src/config/database.js

# 2. Abrir cada archivo y resolver
# Git marca los conflictos así:
<<<<<<< HEAD
// Tu código
=======
// Código de la otra sesión
>>>>>>> main

# 3. Editar manualmente:
# - Borrar las marcas <<<, ===, >>>
# - Dejar el código que DEBE quedar

# 4. Marcar como resuelto
git add backend/engineering-metadata.js
git add backend/src/config/database.js

# 5. Completar merge
git commit -m "MERGE: Resuelto conflicto en engineering-metadata y database.js"
```

---

## 🏁 AL FINALIZAR TU TRABAJO

```bash
# 1. Hacer commit final de tus cambios
git add <tus_archivos>
git commit -m "FEAT: Descripción completa de lo implementado"
git push origin feature/<tu-branch>

# 2. Merge a main (SOLO UNA SESIÓN A LA VEZ)
git checkout main
git pull origin main
git merge feature/<tu-branch>

# 3. Resolver conflictos si hay
# (Ver sección "CONFLICTOS" arriba)

# 4. Push a main
git push origin main

# 5. Avisar a las otras sesiones que hiciste merge
# Para que ellas puedan hacer "git pull origin main"
```

---

## 🔁 FLUJO VISUAL

```
main (rama principal)
  ↓
  ├── feature/notification-central-exchange (Sesión 1)
  │   ├── commit 1: "Crear NotificationCentralExchange"
  │   ├── commit 2: "Agregar NotificationChannelDispatcher"
  │   └── commit 3: "Integrar con SupplierRoutes"
  │
  └── feature/auditor-frontend-fixes (Sesión 2)
      ├── commit 1: "FIX 23: async callback en page.evaluate"
      ├── commit 2: "Corregir if/else syntax"
      └── commit 3: "Test execution con resultados"

# Al final del día:
main
  ← merge feature/notification-central-exchange (Sesión 1 termina primero)
  ← merge feature/auditor-frontend-fixes (Sesión 2 merge después)
```

---

## 💡 TIPS PROFESIONALES

1. **Commits pequeños y frecuentes** → Más fácil de revertir si algo sale mal
2. **Mensajes descriptivos** → El equipo (o tú mismo mañana) entenderá qué hiciste
3. **Pull antes de merge** → Siempre actualizar main ANTES de hacer tu merge
4. **Branch names descriptivos** → `feature/nombre-claro`, `fix/bug-especifico`, `refactor/modulo-x`
5. **Nunca `git add .` si hay cambios de otra sesión** → Solo agregar TUS archivos
6. **Stash para cambios temporales**:
   ```bash
   git stash  # Guardar cambios sin commit
   git pull origin main
   git stash pop  # Recuperar cambios
   ```

---

## 🚫 ERRORES COMUNES A EVITAR

| ❌ NO HACER | ✅ SÍ HACER |
|------------|-------------|
| `git add .` cuando hay archivos de otra sesión | `git add <archivos_especificos>` |
| Trabajar en el mismo branch | Crear branches separados |
| `git commit -m "fix"` | `git commit -m "FIX: Descripción clara del cambio"` |
| `git push --force` en main | NUNCA force push a main/master |
| Esperar días para hacer commit | Commit cada 30-60 min |
| Ignorar conflictos ("ya lo resolveré después") | Resolver conflictos inmediatamente |

---

## 📞 COMUNICACIÓN ENTRE SESIONES

**El usuario debe decirte:**

- "Sesión Notificaciones hizo commit de `NotificationCentralExchange.js`"
- "Sesión Testing necesita merge de main porque hay cambios en `database.js`"

**Tú respondes:**

```bash
# Actualizar tu branch con cambios de main
git pull origin main
# o
git merge main
```

---

## 📝 EJEMPLO REAL (HOY)

### **Situación actual:**
- Ambas sesiones en `feature/notification-central-exchange` ❌

### **Solución:**
```bash
# Sesión 2 (Testing/Auditor) crea SU branch:
git checkout -b feature/auditor-frontend-fixes

# Commit SOLO archivos del auditor:
git add backend/src/auditor/collectors/FrontendCollector.js
git add backend/src/auditor/core/AutoAuditTicketSystem.js
git add backend/src/testing/MasterTestingOrchestrator.js
git commit -m "FIX: FrontendCollector FIX 23 + syntax corrections"
git push -u origin feature/auditor-frontend-fixes
```

### **Cuando Sesión 1 (Notificaciones) termine:**
```bash
# Sesión 1 hace merge a main:
git checkout main
git merge feature/notification-central-exchange
git push origin main
```

### **Entonces Sesión 2 (Testing) actualiza:**
```bash
# Sesión 2 trae cambios de Sesión 1:
git pull origin main
# Resuelve conflictos si hay
# Continúa trabajando
```

---

Generado: 2026-01-06
Actualizado por: Claude Sonnet 4.5