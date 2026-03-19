# Stage 1: build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm install
COPY src ./src
RUN npm run build

# Stage 2: production
FROM node:18-alpine
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "-r", "module-alias/register", "dist/app.js"]

