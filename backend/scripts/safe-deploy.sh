#!/bin/bash

# 🔒 SAFE DEPLOY TO RENDER
# Versión: 2.0
# Fecha: 2026-01-04
# Objetivo: Garantizar 0% pérdida de datos al deployar

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     🔒 SAFE DEPLOY TO RENDER - Zero Data Loss            ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# 1. Verificar que estamos en main
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${RED}❌ ERROR: No estás en la rama 'main'${NC}"
    echo -e "${YELLOW}   Rama actual: $CURRENT_BRANCH${NC}"
    echo ""
    echo "Para cambiar a main:"
    echo "  git checkout main"
    exit 1
fi

echo -e "${GREEN}✅ Estás en la rama correcta: main${NC}"
echo ""

# 2. Verificar cambios pendientes
echo -e "${BLUE}📊 Verificando cambios pendientes...${NC}"
git status --short
echo ""

CHANGES=$(git status --porcelain)
if [ -z "$CHANGES" ]; then
    echo -e "${GREEN}✅ No hay cambios pendientes${NC}"
else
    echo -e "${YELLOW}⚠️  Hay cambios sin commitear${NC}"
    echo ""

    # Contar archivos modificados
    MODIFIED=$(git status --porcelain | grep "^ M" | wc -l)
    UNTRACKED=$(git status --porcelain | grep "^??" | wc -l)
    ADDED=$(git status --porcelain | grep "^A" | wc -l)

    echo "  📝 Archivos modificados: $MODIFIED"
    echo "  📄 Archivos nuevos: $UNTRACKED"
    echo "  ➕ Archivos agregados: $ADDED"
    echo ""

    # Preguntar si quiere commitear
    read -p "¿Querés commitear estos cambios antes de deployar? (s/n): " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Ss]$ ]]; then
        # Agregar todos los cambios
        echo -e "${BLUE}📦 Agregando cambios...${NC}"
        git add -A

        # Pedir mensaje de commit
        echo ""
        echo -e "${YELLOW}📝 Ingresá el mensaje del commit:${NC}"
        read -p "   → " COMMIT_MSG

        if [ -z "$COMMIT_MSG" ]; then
            COMMIT_MSG="Deploy to Render - $(date +%Y-%m-%d)"
        fi

        # Hacer commit
        git commit -m "$COMMIT_MSG

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

        echo -e "${GREEN}✅ Commit creado exitosamente${NC}"
        echo ""
    else
        echo -e "${RED}❌ Deploy cancelado - Commiteá los cambios primero${NC}"
        echo ""
        echo "Para commitear manualmente:"
        echo "  git add -A"
        echo "  git commit -m \"Tu mensaje\""
        echo ""
        echo "Luego ejecutá este script nuevamente."
        exit 1
    fi
fi

# 3. Mostrar qué se va a deployar
echo -e "${BLUE}📊 Commits que se pushearán a master:${NC}"
git log origin/master..main --oneline | head -10
echo ""

COMMITS_AHEAD=$(git log origin/master..main --oneline | wc -l)
echo -e "${YELLOW}   Total: $COMMITS_AHEAD commit(s) adelante${NC}"
echo ""

if [ "$COMMITS_AHEAD" -eq 0 ]; then
    echo -e "${GREEN}✅ main y master ya están sincronizados${NC}"
    echo -e "${YELLOW}   No hay nada nuevo para deployar${NC}"
    exit 0
fi

# 4. Confirmación final
echo -e "${YELLOW}⚠️  Estás a punto de deployar a RENDER (producción)${NC}"
echo ""
read -p "¿Continuar con el deploy? (s/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo -e "${RED}❌ Deploy cancelado${NC}"
    exit 1
fi

# 5. Push a master (Render)
echo ""
echo -e "${BLUE}🚀 Pusheando a master (Render)...${NC}"
git push origin main:master --force-with-lease

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Push a master exitoso${NC}"
else
    echo -e "${RED}❌ Error al pushear a master${NC}"
    exit 1
fi

# 6. Push a main (sincronizar origin/main)
echo ""
echo -e "${BLUE}🔄 Sincronizando origin/main...${NC}"
git push origin main

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ origin/main sincronizado${NC}"
else
    echo -e "${RED}❌ Error al sincronizar origin/main${NC}"
    exit 1
fi

# 7. Actualizar referencias locales
echo ""
echo -e "${BLUE}🔄 Actualizando referencias locales...${NC}"
git fetch origin
git branch -f master origin/master

echo -e "${GREEN}✅ Referencias actualizadas${NC}"
echo ""

# 8. Verificación final
echo -e "${BLUE}🔍 Verificación final:${NC}"
echo ""
echo "  Local branches:"
echo "    main:   $(git log main --oneline -1)"
echo "    master: $(git log master --oneline -1)"
echo ""
echo "  Remote branches:"
echo "    origin/main:   $(git log origin/main --oneline -1)"
echo "    origin/master: $(git log origin/master --oneline -1)"
echo ""

# Verificar que todo esté sincronizado
MAIN_LOCAL=$(git rev-parse main)
MASTER_LOCAL=$(git rev-parse master)
MASTER_REMOTE=$(git rev-parse origin/master)

if [ "$MAIN_LOCAL" == "$MASTER_LOCAL" ] && [ "$MASTER_LOCAL" == "$MASTER_REMOTE" ]; then
    echo -e "${GREEN}✅✅✅ TODO SINCRONIZADO CORRECTAMENTE ✅✅✅${NC}"
    echo ""
    echo -e "${GREEN}🎉 Deploy completado exitosamente${NC}"
    echo ""
    echo "Render deployará automáticamente en unos minutos."
    echo "Monitoreá el deploy en: https://dashboard.render.com"
else
    echo -e "${YELLOW}⚠️  Advertencia: Hay desincronización${NC}"
    echo ""
    echo "Ejecutá manualmente:"
    echo "  git fetch origin"
    echo "  git branch -f master origin/master"
fi

echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              Deploy completado - Safe Deploy              ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
