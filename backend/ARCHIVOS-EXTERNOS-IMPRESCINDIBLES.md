# ARCHIVOS EXTERNOS IMPRESCINDIBLES

> **Última actualización**: 2025-11-01
> **Propósito**: Documentar todos los archivos/programas externos que el sistema requiere para funcionar

---

## RESUMEN EJECUTIVO

El Sistema de Asistencia Biométrico Aponnt depende de **3 componentes externos OBLIGATORIOS** y **3 componentes opcionales**.

### ✅ IMPRESCINDIBLES (el sistema NO funciona sin ellos):
1. **PostgreSQL** - Base de datos principal
2. **Node.js** - Motor JavaScript del backend
3. **node_modules** - Dependencias NPM

### ⚠️ OPCIONALES (funcionalidades específicas):
1. **Ollama** - Motor de IA local (solo para módulo AI Assistant)
2. **Git** - Control de versiones (solo para desarrollo)
3. **Claude Code** - CLI de Anthropic (solo para desarrollo)

---

## 1. PostgreSQL (Base de Datos)

### ¿Qué es?
Base de datos relacional principal del sistema. Almacena:
- Usuarios (employees, partners, vendors)
- Empresas (companies)
- Asistencias (attendance)
- Departamentos, turnos, vacaciones
- Configuraciones, módulos, etc.

### Ubicación de instalación
```
Windows: C:\Program Files\PostgreSQL\14\
Linux/Mac: /usr/local/pgsql/ o /opt/postgresql/
Datos: C:\Program Files\PostgreSQL\14\data\
```

### Configuración requerida
```
Base de datos: attendance_system
Usuario: postgres
Password: (definido en .env como DB_PASSWORD)
Puerto: 5432
Host: localhost (o IP remota si aplica)
```

### ¿Es imprescindible?
**SÍ - CRÍTICO**
El sistema NO funciona sin PostgreSQL. Todas las operaciones requieren acceso a la base de datos.

### Cómo verificar si está instalado
```bash
# Verificar versión
psql --version

# Conectar a la base de datos
psql -U postgres -d attendance_system

# Listar tablas
psql -U postgres -d attendance_system -c "\dt"

# Verificar cantidad de empresas
psql -U postgres -d attendance_system -c "SELECT COUNT(*) FROM companies;"
```

### Cómo reinstalar si se borró
```bash
# Windows
1. Descargar instalador: https://www.postgresql.org/download/windows/
2. Ejecutar instalador
3. Elegir password para usuario 'postgres'
4. Puerto por defecto: 5432
5. Inicializar base de datos
6. Restaurar backup (si existe)

# Linux (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql

# Crear base de datos
sudo -u postgres createdb attendance_system
```

### Tamaño aproximado
- Instalación: ~300 MB
- Base de datos vacía: ~50 MB
- Base de datos con datos: variable (100 MB - varios GB)

### Ubicación de backups (recomendado)
```
C:\Bio\backups\attendance_system_YYYY-MM-DD.sql
```

---

## 2. Node.js (Runtime JavaScript)

### ¿Qué es?
Motor JavaScript que ejecuta el backend del sistema. Sin Node.js, el servidor Express NO puede arrancar.

### Ubicación de instalación
```
Windows: C:\Program Files\nodejs\
Linux/Mac: /usr/local/bin/node
```

### Versión requerida
```
Node.js: >= 16.x (recomendado: 18.x o 20.x LTS)
npm: >= 8.x
```

### ¿Es imprescindible?
**SÍ - CRÍTICO**
El sistema NO funciona sin Node.js. Todo el backend está escrito en JavaScript/Node.

### Cómo verificar si está instalado
```bash
# Verificar versión de Node
node --version

# Verificar versión de npm
npm --version

# Verificar ubicación de instalación
which node   # Linux/Mac
where node   # Windows
```

### Cómo reinstalar si se borró
```bash
# Windows
1. Descargar instalador: https://nodejs.org/
2. Instalar versión LTS (Long Term Support)
3. Verificar instalación: node --version

# Linux (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# macOS (con Homebrew)
brew install node
```

### Tamaño aproximado
- Instalación: ~50 MB

---

## 3. node_modules (Dependencias NPM)

### ¿Qué es?
Carpeta que contiene todas las librerías JavaScript que el sistema necesita:
- Express (servidor web)
- Sequelize (ORM para PostgreSQL)
- bcryptjs (encriptación de passwords)
- jsonwebtoken (autenticación JWT)
- nodemailer (envío de emails)
- Y ~80+ paquetes más

### Ubicación
```
C:\Bio\sistema_asistencia_biometrico\backend\node_modules\
```

### ¿Es imprescindible?
**SÍ - CRÍTICO**
El sistema NO funciona sin node_modules. El backend lanzará errores de "Cannot find module".

### Cómo verificar si está instalado
```bash
# Verificar si existe la carpeta
ls -la node_modules   # Linux/Mac
dir node_modules      # Windows

# Verificar cantidad de paquetes instalados
ls node_modules | wc -l   # Linux/Mac
```

### Cómo reinstalar si se borró
```bash
# Navegar a la carpeta del backend
cd C:/Bio/sistema_asistencia_biometrico/backend

# Reinstalar TODAS las dependencias desde package.json
npm install

# Tiempo de instalación: 2-5 minutos
# Tamaño descargado: ~300 MB
```

### Tamaño aproximado
- Tamaño total: ~300 MB
- Cantidad de paquetes: ~80-100 (incluyendo dependencias transitivas)

### ¿Se puede borrar para ahorrar espacio?
**NO** - El sistema dejará de funcionar inmediatamente.

Si necesitas liberar espacio:
```bash
# Limpiar cache de npm (libera espacio sin romper nada)
npm cache clean --force
```

---

## 4. Ollama (Motor de IA Local) - OPCIONAL

### ¿Qué es?
Motor de IA local que ejecuta modelos de lenguaje (Llama 3.1 8B) para el módulo "AI Assistant".

### Ubicación de instalación
```
Windows: C:\Users\<USERNAME>\AppData\Local\Programs\Ollama\
Modelos descargados: C:\Users\<USERNAME>\.ollama\models\
Servidor: http://localhost:11434
```

### ¿Es imprescindible?
**NO - OPCIONAL**
El sistema funciona perfectamente SIN Ollama. Solo es necesario si la empresa contrata el módulo "AI Assistant" ($15/mes).

### Funcionalidad afectada si no está instalado
- Módulo "AI Assistant" mostrará: "Ollama no disponible"
- El chat del asistente no funcionará
- Resto del sistema funciona 100% normal

### Cómo verificar si está instalado
```bash
# Verificar versión
ollama --version

# Verificar servidor corriendo
curl http://localhost:11434/api/tags

# Verificar modelos instalados
ollama list
```

### Cómo instalar (si se desea)
```bash
# 1. Descargar instalador
https://ollama.ai/download

# 2. Ejecutar instalador (Windows)
OllamaSetup.exe

# 3. Descargar modelo Llama 3.1 (8B) - ~4.7 GB
ollama pull llama3.1:8b

# 4. Probar modelo
ollama run llama3.1:8b "Hola, ¿cómo estás?"
```

### Tamaño aproximado
- Instalación de Ollama: ~275 MB
- Modelo Llama 3.1 (8B): ~4.7 GB
- **Total: ~5 GB**

### ¿Se puede borrar para ahorrar espacio?
**SÍ** - Si no usas el módulo AI Assistant, puedes desinstalar Ollama sin afectar el resto del sistema.

---

## 5. Git (Control de Versiones) - OPCIONAL

### ¿Qué es?
Sistema de control de versiones para desarrollo.

### Ubicación de instalación
```
Windows: C:\Program Files\Git\
Repositorio local: C:\Bio\sistema_asistencia_biometrico\.git\
```

### ¿Es imprescindible?
**NO - SOLO PARA DESARROLLO**
El sistema funciona perfectamente SIN Git. Solo es útil para:
- Desarrollo (commits, branches, merges)
- Despliegues desde repositorio remoto
- Historial de cambios

### Funcionalidad afectada si no está instalado
- No se pueden hacer commits
- No se puede sincronizar con GitHub/GitLab
- El sistema sigue funcionando normalmente

### Cómo verificar si está instalado
```bash
# Verificar versión
git --version

# Verificar repositorio actual
git status
```

### Tamaño aproximado
- Instalación: ~200 MB
- Repositorio (.git/): ~50 MB

### ¿Se puede borrar para ahorrar espacio?
**SÍ** - Si no desarrollas ni necesitas historial de cambios, puedes desinstalar Git.

---

## 6. Claude Code (CLI de Anthropic) - OPCIONAL

### ¿Qué es?
CLI oficial de Anthropic para desarrollo asistido por IA.

### ¿Es imprescindible?
**NO - SOLO PARA DESARROLLO**
El sistema funciona perfectamente SIN Claude Code. Solo es útil para desarrollo asistido.

### Funcionalidad afectada si no está instalado
- No hay asistencia de IA durante desarrollo
- El sistema sigue funcionando normalmente

---

## RESUMEN DE ARCHIVOS IMPRESCINDIBLES

### Para que el sistema funcione correctamente:

```
✅ OBLIGATORIOS:
- PostgreSQL (base de datos) - ~300 MB
- Node.js (runtime) - ~50 MB
- node_modules (dependencias) - ~300 MB
- Código fuente (backend/src, backend/public) - ~100 MB
- Migraciones (backend/migrations) - ~5 MB
- Templates de email (backend/templates) - ~2 MB
- Archivo .env (configuración) - ~2 KB

TOTAL MÍNIMO: ~750 MB

❌ OPCIONALES (se pueden borrar sin romper el sistema):
- Ollama (solo para AI Assistant) - ~5 GB
- Git (solo para desarrollo) - ~250 MB
- Claude Code (solo para desarrollo) - variable
- Archivos .md de documentación - ~10 MB
- Backups antiguos - variable
```

### Estructura mínima requerida para funcionamiento:

```
C:\Bio\sistema_asistencia_biometrico\
└── backend\
    ├── node_modules\         ✅ IMPRESCINDIBLE (300 MB)
    ├── public\               ✅ IMPRESCINDIBLE (UI)
    │   ├── *.html
    │   ├── css\
    │   └── js\
    ├── src\                  ✅ IMPRESCINDIBLE (código)
    │   ├── routes\
    │   ├── models\
    │   ├── services\
    │   └── config\
    ├── migrations\           ✅ IMPRESCINDIBLE (BD)
    ├── templates\            ✅ IMPRESCINDIBLE (emails)
    ├── .env                  ✅ IMPRESCINDIBLE (config)
    ├── package.json          ✅ IMPRESCINDIBLE
    └── server.js             ✅ IMPRESCINDIBLE
```

---

## COMANDOS DE VERIFICACIÓN RÁPIDA

Para verificar si TODOS los componentes imprescindibles están instalados:

```bash
# 1. Verificar PostgreSQL
psql --version && psql -U postgres -d attendance_system -c "SELECT 1;"

# 2. Verificar Node.js
node --version && npm --version

# 3. Verificar node_modules
ls node_modules/express 2>/dev/null && echo "✅ node_modules OK" || echo "❌ Falta node_modules"

# 4. Verificar servidor puede arrancar
cd backend && node -e "console.log('✅ Node.js funcional')"
```

Si TODOS estos comandos funcionan, el sistema está listo para arrancar.

---

## PLAN DE RECUPERACIÓN ANTE DESASTRE

Si se borran archivos críticos:

### Escenario 1: Se borró node_modules
```bash
cd C:/Bio/sistema_asistencia_biometrico/backend
npm install
# Tiempo: 2-5 min
```

### Escenario 2: Se borró PostgreSQL
```bash
# Reinstalar PostgreSQL
# Restaurar backup más reciente
psql -U postgres -d attendance_system < backup.sql
```

### Escenario 3: Se borró todo el código
```bash
# Si hay Git:
git clone <repositorio> C:/Bio/sistema_asistencia_biometrico
cd backend
npm install

# Si NO hay Git pero hay backup:
# Restaurar desde backup manual
```

---

## CONTACTO Y SOPORTE

Si tienes dudas sobre qué archivos son imprescindibles:
- **Email**: soporte@aponnt.com
- **Documentación**: Ver archivo CLAUDE.md en raíz del proyecto

---

**Fecha de creación**: 2025-11-01
**Versión**: 1.0.0
**Autor**: Sistema Aponnt - Documentación Técnica
