# syntax=docker/dockerfile:1.28
FROM node:24.22.1-bookworm@sha256:e2007d1f4e652444f88d9bb196256d2d035269015e3d27a0d47c1d0cb5192a98 AS builder

RUN npm install -g npm@12.0.1

WORKDIR /veritable-encryption-service

RUN npm install -g npm@12.0.1

COPY package*.json ./
COPY tsconfig.json ./

RUN npm ci
COPY . .
RUN npm run build

FROM node:24.22.1-bookworm@sha256:e2007d1f4e652444f88d9bb196256d2d035269015e3d27a0d47c1d0cb5192a98 AS modules

RUN npm install -g npm@12.0.1

WORKDIR /veritable-encryption-service

RUN npm install -g npm@12.0.1

COPY package*.json ./

RUN npm ci --production

FROM node:24.22.1-bookworm-slim@sha256:be8204d4bd327363357f532187b752ff62759c31bedf98e9e18fc08c9cbd605c AS service

RUN npm install -g npm@12.0.1

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
WORKDIR /veritable-encryption-service

RUN npm install -g npm@12.0.1

RUN apt-get update && apt-get install -y curl && apt-get upgrade -y && rm -rf /var/lib/apt/lists/*

COPY knexfile.js ./
COPY package*.json ./
COPY --from=modules /veritable-encryption-service/node_modules ./node_modules
COPY --from=builder /veritable-encryption-service/build ./build

HEALTHCHECK --interval=30s  --timeout=20s \
    CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000
CMD [ "npm", "start" ]
