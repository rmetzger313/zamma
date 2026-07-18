# Zamma-Server — schlankes Produktions-Image
FROM node:26-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

# Persistente DB außerhalb des Containers mounten: -v zamma-data:/app/data
ENV DB_FILE=/app/data/zamma.db
VOLUME /app/data

EXPOSE 4000
CMD ["node", "src/index.js"]
