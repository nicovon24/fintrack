# Etapa 1: build de Angular.
FROM node:22-alpine AS build
WORKDIR /build

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build -- --configuration production

# Etapa 2: nginx sirve los estaticos y hace de proxy hacia la API.
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /build/dist/fintrack/browser /usr/share/nginx/html

EXPOSE 80
