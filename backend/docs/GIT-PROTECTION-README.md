# 🛡️ GIT PROTECTION SYSTEM - CERO PÉRDIDA DE DATOS

**Versión:** 2.0
**Fecha:** 2026-01-04
**Objetivo:** Protección AUTOMÁTICA contra pérdidas de código

---

## 🚀 SETUP INICIAL (ejecutar al inicio de cada sesión)

```bash
cd backend
npm run git:setup
```

Esto instala:
- ✅ **Pre-push hook** → Bloquea pushes peligrosos automáticamente
- ✅ **Git aliases** → Comandos seguros (`git safe-deploy`, etc.)
- ✅ **Git config** → Configuración segura por defecto

---

## 📋 COMANDOS SEGUROS (usar SIEMPRE estos)

### 🚀 Para deployar a Render

**Opción 1 - Recomendada:**
```bash
npm run deploy:safe
```

**Opción 2 - Git alias:**
```bash
git safe-deploy
```

**Opción 3 - Directo:**
```bash
git push origin main:master --force-with-lease
```

### 📊 Ver estado completo

```bash
git status-all
```

Muestra:
- Estado local
- Estado de branches remotas
- Diferencias entre main y master

### 🔄 Checkout seguro

```bash
npm run git:safe checkout <branch>
```

Bloquea si hay cambios sin commitear.

---

## ⚠️ COMANDOS PELIGROSOS (NO USAR)

| Comando Peligroso | Por qué | Reemplazo Seguro |
|------------------|---------|------------------|
| `git checkout master` | Puede perder cambios | `npm run deploy:safe` |
| `git stash drop` | Borra cambios permanentemente | NO usar stash |
| `git push origin master` | Sin verificar fuente | `npm run deploy:safe` |
| `git reset --hard` | Pierde cambios sin recuperación | Hacer commit primero |

---

## 🛡️ PROTECCIONES ACTIVAS

### 1. Pre-Push Hook
**Bloquea automáticamente:**
- Push a `master` desde cualquier rama que NO sea `main`
- Push con cambios sin commitear
- Push sin estar en branch correcto

**Ejemplo:**
```bash
$ git push origin master
🚨 ============================================== 🚨
🚨  PUSH BLOQUEADO - PROTECCIÓN ACTIVADA        🚨
🚨 ============================================== 🚨

❌ NO podés pushear a 'master' desde 'feature-branch'

✅ SOLUCIÓN: Usá el deploy seguro
   npm run deploy:safe
```

### 2. Git Aliases
**Comandos automáticos configurados:**
- `git safe-deploy` → Deploy seguro a Render
- `git deploy` → Alias de safe-deploy
- `git status-all` → Estado completo (local + remote)

### 3. Script Wrapper `git-safe`
**Verificaciones adicionales:**
- Checkout bloqueado si hay cambios
- Stash con advertencia
- Push con validación de rama

---

## ✅ FLUJO CORRECTO (0% pérdida)

```
1. Trabajar en main
   ↓
2. git add -A && git commit -m "Mensaje"
   ↓
3. npm run deploy:safe
   ↓
4. ✅ Deploy exitoso a Render
```

---

## 🆘 SI LAS PROTECCIONES NO ESTÁN ACTIVAS

```bash
# 1. Verificar hooks instalados
ls -la ../.git/hooks/ | grep -E "(pre-push|pre-commit)"

# 2. Re-ejecutar setup
npm run git:setup

# 3. Verificar aliases
git config --get alias.safe-deploy
```

**Deberían mostrar:**
- `pre-push` ejecutable
- Alias configurado

Si no:
```bash
# Reinstalar manualmente
cd backend
bash scripts/setup-git-protection.sh
```

---

## 🔍 VERIFICAR QUE TODO FUNCIONA

### Test 1: Pre-push hook
```bash
# Crear cambio temporal
echo "test" > test.tmp

# Intentar push sin commitear (DEBE BLOQUEAR)
git push origin master

# Debería ver: "🚨 PUSH BLOQUEADO"

# Limpiar
rm test.tmp
```

### Test 2: Deploy seguro
```bash
# Debe funcionar sin errores
npm run deploy:safe
```

### Test 3: Aliases
```bash
# Debe mostrar script path
git config --get alias.safe-deploy
```

---

## 📊 ARQUITECTURA

```
backend/
├── scripts/
│   ├── git-hooks/          ← Hooks fuente (se pushean a GitHub)
│   │   ├── pre-push        ← Bloquea pushes peligrosos
│   │   └── pre-checkout    ← (No funciona en git, legacy)
│   ├── setup-git-protection.sh  ← Instala todo
│   ├── safe-deploy.sh      ← Deploy interactivo seguro
│   └── git-safe            ← Wrapper de comandos git
└── docs/
    ├── GIT-PROTECTION-README.md     ← Este archivo
    └── GIT-WORKFLOW-PROTOCOL.md     ← Protocolo detallado
```

**¿Por qué `git-hooks/` en vez de `.git/hooks/`?**
- `.git/hooks/` NO se pushea a GitHub (está en .gitignore)
- `scripts/git-hooks/` SÍ se pushea
- `setup-git-protection.sh` los copia automáticamente

---

## 🎓 PARA SESIONES DE CLAUDE CODE

**Al inicio de CADA sesión:**

1. Ejecutar setup:
   ```bash
   cd backend && npm run git:setup
   ```

2. Verificar rama actual:
   ```bash
   git branch --show-current  # Debe mostrar: main
   ```

3. Usar solo comandos seguros:
   - `npm run deploy:safe` para deployar
   - `git status-all` para ver estado
   - `git add -A && git commit` antes de cualquier operación

**NUNCA:**
- ❌ `git checkout` sin commitear primero
- ❌ `git stash drop`
- ❌ `git push origin master` directamente
- ❌ Ping-pong entre ramas (main ↔ master)

---

## 🔧 TROUBLESHOOTING

### Problema: "El hook no se ejecuta"
```bash
# Verificar permisos
ls -la ../.git/hooks/pre-push

# Debe mostrar: -rwxr-xr-x (ejecutable)

# Si no:
chmod +x ../.git/hooks/pre-push
```

### Problema: "Alias no funciona"
```bash
# Ver aliases configurados
git config --list | grep alias

# Re-ejecutar setup
npm run git:setup
```

### Problema: "Perdí cambios igual"
```bash
# Buscar commits perdidos
git fsck --no-reflog | grep commit

# Buscar en reflog
git reflog | head -50

# Recuperar archivo específico
git show <commit-hash>:<path/to/file> > recuperado.txt
```

---

## 📚 MÁS INFORMACIÓN

- **Protocolo completo:** `GIT-WORKFLOW-PROTOCOL.md`
- **Scripts:** `backend/scripts/`
- **Hooks:** `backend/scripts/git-hooks/`

---

**Última actualización:** 2026-01-04
**Mantenido por:** Claude Code sessions
**Versión:** 2.0 (con protección automática)
