# syntax=docker/dockerfile:1.20
FROM node:24-bookworm AS builder

WORKDIR /veritable-encryption-service

COPY package*.json ./
COPY tsconfig.json ./

RUN npm ci
COPY . .
RUN npm run build

FROM node:24-bookworm AS modules

WORKDIR /veritable-encryption-service

COPY package*.json ./

RUN npm ci --production

FROM node:24-bookworm-slim AS service

WORKDIR /veritable-encryption-service

RUN apt-get update && apt-get install -y curl

COPY package*.json ./
COPY --from=modules /veritable-encryption-service/node_modules ./node_modules
COPY --from=builder /veritable-encryption-service/build ./build

HEALTHCHECK --interval=30s  --timeout=20s \
    CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000
CMD [ "npm", "start" ]
