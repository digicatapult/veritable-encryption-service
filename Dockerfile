# syntax=docker/dockerfile:1.27
FROM node:24-bookworm AS builder

RUN npm install -g npm@12.0.1

WORKDIR /veritable-encryption-service

RUN npm install -g npm@12.0.1

COPY package*.json ./
COPY tsconfig.json ./

RUN npm ci
COPY . .
RUN npm run build

FROM node:24-bookworm AS modules

RUN npm install -g npm@12.0.1

WORKDIR /veritable-encryption-service

RUN npm install -g npm@12.0.1

COPY package*.json ./

RUN npm ci --production

FROM node:24-bookworm-slim AS service

RUN npm install -g npm@12.0.1

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
WORKDIR /veritable-encryption-service

RUN npm install -g npm@12.0.1

RUN apt-get update && apt-get install -y curl

COPY knexfile.js ./
COPY package*.json ./
COPY --from=modules /veritable-encryption-service/node_modules ./node_modules
COPY --from=builder /veritable-encryption-service/build ./build

HEALTHCHECK --interval=30s  --timeout=20s \
    CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000
CMD [ "npm", "start" ]
