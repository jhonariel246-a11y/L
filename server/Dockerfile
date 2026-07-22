# InsightPay · Backend (Node) — imagen para self-hosting
FROM node:20-alpine

WORKDIR /app

# Dependencias primero (mejor caché)
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund

# Código del backend + frontend (se sirve desde el mismo servidor)
COPY . .
# El frontend vive un nivel arriba en el repo; se monta en el compose.

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "index.js"]
