# syntax=docker/dockerfile:1.28@sha256:bb22d9815c728170f72750f4e5b0d672e06176142e1d602c7e66c050100b7e5b
FROM node:26.13.0-bookworm@sha256:fa52d1669505e29b58c042875b1d65c229e0787a3610fd52869b22b68e480853 AS builder

RUN npm install -g npm@12.0.1

WORKDIR /veritable-encryption-service

RUN npm install -g npm@12.0.1

COPY package*.json ./
COPY tsconfig.json ./

RUN npm ci
COPY . .
RUN npm run build

FROM node:26.13.0-bookworm@sha256:fa52d1669505e29b58c042875b1d65c229e0787a3610fd52869b22b68e480853 AS modules

RUN npm install -g npm@12.0.1

WORKDIR /veritable-encryption-service

RUN npm install -g npm@12.0.1

COPY package*.json ./

RUN npm ci --production

FROM node:26.13.0-bookworm-slim@sha256:bc0a2afd3b74ce12222fc8bab99271e66257f021078f5f4a5d687a77d280c1d9 AS service

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
