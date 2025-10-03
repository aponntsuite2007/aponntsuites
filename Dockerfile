# Dockerfile para AponntSuites
FROM node:18-alpine

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias del backend
COPY backend/package*.json ./backend/

# Instalar dependencias
WORKDIR /app/backend
RUN npm install --production

# Volver a la raíz y copiar todo el código
WORKDIR /app
COPY . ./

# Crear directorio para uploads si no existe
RUN mkdir -p backend/public/uploads

# Exponer puerto
EXPOSE 3001

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3001

# Establecer working directory en backend y ejecutar servidor
WORKDIR /app/backend
CMD ["node", "server.js"]