#!/bin/bash

# 🛡️ SETUP GIT PROTECTION - Instalar hooks de seguridad
# Versión: 1.0
# Fecha: 2026-01-04
# Ejecutar AL INICIO de cada sesión de Claude Code

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     🛡️ INSTALANDO PROTECCIONES GIT - Zero Data Loss      ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Detectar la raíz del repositorio git
GIT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)

if [ -z "$GIT_ROOT" ]; then
    echo -e "${RED}❌ Error: No estás en un repositorio git${NC}"
    exit 1
fi

HOOKS_DIR="$GIT_ROOT/.git/hooks"
SOURCE_HOOKS_DIR="$GIT_ROOT/backend/scripts/git-hooks"

echo -e "${BLUE}📁 Directorio git: $GIT_ROOT${NC}"
echo -e "${BLUE}📁 Hooks destino: $HOOKS_DIR${NC}"
echo ""

# Verificar que exista el directorio de hooks source
if [ ! -d "$SOURCE_HOOKS_DIR" ]; then
    echo -e "${YELLOW}⚠️  No se encontró el directorio de hooks: $SOURCE_HOOKS_DIR${NC}"
    echo "   Creándolo..."
    mkdir -p "$SOURCE_HOOKS_DIR"
fi

# Copiar hooks
echo -e "${BLUE}🔧 Instalando hooks de protección...${NC}"
echo ""

HOOKS=("pre-checkout" "pre-push")

for HOOK in "${HOOKS[@]}"; do
    SOURCE="$SOURCE_HOOKS_DIR/$HOOK"
    DEST="$HOOKS_DIR/$HOOK"

    if [ -f "$SOURCE" ]; then
        cp "$SOURCE" "$DEST"
        chmod +x "$DEST"
        echo -e "${GREEN}✅ Instalado: $HOOK${NC}"
    else
        echo -e "${YELLOW}⚠️  No encontrado: $HOOK (en $SOURCE)${NC}"
    fi
done

echo ""

# Configurar git aliases
echo -e "${BLUE}🔧 Configurando git aliases seguros...${NC}"
echo ""

git config alias.safe-deploy '!bash backend/scripts/safe-deploy.sh'
git config alias.deploy '!bash backend/scripts/safe-deploy.sh'
git config alias.status-all '!git status && echo "" && echo "Remote branches:" && git log origin/main --oneline -1 && git log origin/master --oneline -1'

echo -e "${GREEN}✅ Alias 'git safe-deploy' configurado${NC}"
echo -e "${GREEN}✅ Alias 'git deploy' configurado${NC}"
echo -e "${GREEN}✅ Alias 'git status-all' configurado${NC}"
echo ""

# Configurar git para que sea más seguro
echo -e "${BLUE}🔧 Configurando git para seguridad...${NC}"
echo ""

# Avisar antes de sobrescribir archivos
git config advice.detachedHead true

# Prevenir force push accidental
git config push.default simple

echo -e "${GREEN}✅ Git configurado para máxima seguridad${NC}"
echo ""

# Verificación
echo -e "${BLUE}🔍 Verificando instalación...${NC}"
echo ""

ALL_OK=true

for HOOK in "${HOOKS[@]}"; do
    if [ -x "$HOOKS_DIR/$HOOK" ]; then
        echo -e "${GREEN}✅ $HOOK instalado y ejecutable${NC}"
    else
        echo -e "${RED}❌ $HOOK NO instalado correctamente${NC}"
        ALL_OK=false
    fi
done

echo ""

if [ "$ALL_OK" = true ]; then
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║   ✅✅✅ PROTECCIÓN INSTALADA CORRECTAMENTE ✅✅✅         ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}🛡️ Ahora el repositorio está protegido contra:${NC}"
    echo ""
    echo "   ❌ Checkout con cambios sin commitear"
    echo "   ❌ Push a master desde ramas que no sean main"
    echo "   ❌ Push con cambios sin commitear"
    echo ""
    echo -e "${BLUE}📋 Comandos disponibles:${NC}"
    echo ""
    echo "   git safe-deploy      → Deploy seguro a Render"
    echo "   git deploy           → Alias de safe-deploy"
    echo "   git status-all       → Ver estado completo (local + remote)"
    echo "   npm run deploy:safe  → Deploy seguro (desde backend/)"
    echo ""
else
    echo -e "${YELLOW}⚠️  Algunos hooks no se instalaron correctamente${NC}"
    echo "   Revisá los errores arriba"
fi
