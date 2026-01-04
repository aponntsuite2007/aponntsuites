# 🔒 PROTOCOLO DE GIT WORKFLOW - ZERO DATA LOSS

**Actualizado:** 2026-01-04
**Versión:** 2.0
**Objetivo:** Garantizar 0% de pérdida de cambios en cada push/deploy

---

## 🎯 REGLA DE ORO

```
🚨 NUNCA HACER CHECKOUT ENTRE RAMAS SIN COMMITEAR PRIMERO 🚨
```

---

## ✅ FLUJO CORRECTO (obligatorio de ahora en adelante)

### 1️⃣ TRABAJAR SOLO EN `main`

```bash
# Asegurarte que estás en main
git branch --show-current  # Debe mostrar: main

# Si no estás en main:
git checkout main
```

### 2️⃣ ANTES DE CUALQUIER OPERACIÓN GIT: COMMITEAR

```bash
# SIEMPRE hacer esto antes de cualquier checkout/push/pull
git status                    # Ver cambios
git add -A                    # Agregar TODO
git commit -m "Descripción"   # Commitear

# ⚠️ Si hay cambios sin commitear y hacés checkout:
#    → Se pierden cambios o van a stash sin control
#    → ALTO RIESGO de pérdida de datos
```

### 3️⃣ DEPLOYAR A RENDER (rama `master`)

**Opción A - RECOMENDADA (sin checkout):**
```bash
# Push directo de main a master (más seguro)
git push origin main:master --force-with-lease
```

**Opción B - Merge tradicional:**
```bash
git checkout master
git merge main --no-ff
git push origin master
git checkout main  # Volver INMEDIATAMENTE a main
```

### 4️⃣ SINCRONIZAR TODO

```bash
# Actualizar origin/main
git push origin main

# Actualizar rama local master para que apunte a origin/master
git fetch origin
git branch -f master origin/master
```

---

## 🔴 ERRORES COMUNES QUE CAUSAN PÉRDIDAS

### ❌ ERROR #1: Ping-pong entre ramas sin commitear
```bash
# MAL - Esto pierde cambios:
# (trabajo en main, no commiteo)
git checkout master  # ← Cambios se pierden o van a stash
git push origin master
git checkout main    # ← Vuelvo pero master quedó viejo
```

### ❌ ERROR #2: `git stash drop` sin verificar
```bash
# MAL - Esto BORRA cambios permanentemente:
git stash
# ... hago otras cosas
git stash drop  # ← SI NO APLIQUÉ EL STASH, PERDÍ TODO
```

### ❌ ERROR #3: Trabajar en `master` directamente
```bash
# MAL - master es para deploy, no para desarrollo:
git checkout master
# (modifico archivos)
git commit -m "..."
# ← main queda desactualizado, desincronización
```

---

## ✅ CHECKLIST ANTES DE CADA PUSH/DEPLOY

- [ ] ¿Estoy en la rama `main`? (`git branch --show-current`)
- [ ] ¿Hice `git status` para ver cambios pendientes?
- [ ] ¿Hice `git add -A` y `git commit`?
- [ ] ¿Verifiqué que NO hay cambios sin commitear?
- [ ] ¿Voy a usar `git push origin main:master` (sin checkout)?
- [ ] ¿Después del push, voy a sincronizar `main` con `git push origin main`?

---

## 🛠️ SCRIPT HELPER (usar en lugar de comandos manuales)

**Ubicación:** `backend/scripts/safe-deploy.sh`

```bash
# Uso:
cd backend
npm run deploy:safe

# O directamente:
./scripts/safe-deploy.sh
```

Este script automáticamente:
1. Verifica que estés en `main`
2. Muestra cambios pendientes
3. Pregunta si querés commitear
4. Hace push seguro a master
5. Sincroniza todo

---

## 🔍 CÓMO VERIFICAR QUE TODO ESTÁ SINCRONIZADO

```bash
git fetch origin

echo "Local branches:"
git log main --oneline -1
git log master --oneline -1

echo "Remote branches:"
git log origin/main --oneline -1
git log origin/master --oneline -1

# Todos deben mostrar el MISMO commit hash
```

---

## 🆘 RECUPERACIÓN DE EMERGENCIA

Si perdiste cambios, ANTES de hacer cualquier otra cosa:

```bash
# 1. Ver TODOS los commits dangling (incluso los "perdidos")
git fsck --no-reflog | grep commit

# 2. Ver reflog completo
git reflog | head -50

# 3. Buscar stashes perdidos
git fsck --unreachable | grep commit | cut -d ' ' -f3 | xargs git log --oneline --no-walk

# 4. Recuperar un commit específico
git show <commit-hash>:<path/to/file> > archivo-recuperado.txt

# 5. Aplicar un stash perdido
git stash apply <stash-commit-hash>
```

---

## 📊 RESUMEN VISUAL

```
┌─────────────────────────────────────────────────┐
│  FLUJO SEGURO (0% pérdida de datos)             │
├─────────────────────────────────────────────────┤
│                                                 │
│  1. Trabajar en main                            │
│     ↓                                           │
│  2. git status → git add -A → git commit        │
│     ↓                                           │
│  3. git push origin main:master (sin checkout)  │
│     ↓                                           │
│  4. git push origin main                        │
│     ↓                                           │
│  5. git fetch + git branch -f master origin/master │
│     ↓                                           │
│  ✅ DEPLOY EXITOSO - Render recibe master actualizado │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 🎓 POR QUÉ SE PERDÍAN CAMBIOS ANTES

**Causa raíz:** Ping-pong entre `main` ↔ `master` sin commitear

1. Trabajo en `main` → modifico 40 archivos
2. NO commiteo
3. `git checkout master` ← Git descarta o hace stash automático
4. `git push origin master` ← Deploy viejo sin mis cambios
5. `git checkout main` ← Vuelvo, pero Render ya deployó código viejo
6. **Resultado:** 3,000+ líneas de código perdidas

**Solución:** SIEMPRE commitear ANTES de cualquier operación git

---

## 📞 SOPORTE

Si tenés dudas sobre el workflow:
1. Revisá este documento
2. Usá el script `safe-deploy.sh`
3. En caso de emergencia, recuperá desde reflog/fsck

**Última actualización:** 2026-01-04 (después de incidente de pérdida de datos)
