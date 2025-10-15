# syntax=docker/dockerfile:1.19
FROM node:lts-bookworm AS builder

WORKDIR /veritable-encryption-service

# Install base dependencies
RUN npm install -g npm@11.x.x

COPY package*.json ./
COPY tsconfig.json ./

RUN npm ci
COPY . .
RUN npm run build

# service
FROM node:lts-bookworm AS service

WORKDIR /veritable-encryption-service

RUN apt-get update && apt-get install -y curl
RUN npm -g install npm@11.x.x

COPY package*.json ./

RUN npm ci --production

COPY --from=builder /veritable-encryption-service/build ./build

HEALTHCHECK --interval=30s  --timeout=20s \
    CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000
CMD [ "npm", "start" ]
