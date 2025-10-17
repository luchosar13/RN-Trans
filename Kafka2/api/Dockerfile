# Usa una imagen base de Node.js
FROM node:20-alpine

# Establece el directorio de trabajo
WORKDIR /usr/src/app

# Copia los archivos de configuración y instala dependencias
COPY package*.json ./
RUN npm install

# Copia todo el código fuente
COPY . .

# Compila la aplicación NestJS
RUN npm run build

# Expone el puerto de la API (3000 por defecto)
EXPOSE 3000

# Comando para iniciar la aplicación compilada
CMD [ "npm", "run", "start" ]