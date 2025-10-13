# veritable-encryption-service

## Description

An API facilitating encryption and storage for Digital Catapult's [Veritable](https://github.com/digicatapult/veritable-documentation) SSI solution. This service acts as an encryption layer for file storage, uploading encrypted files to Minio and providing direct access URLs for anonymous downloads.

## Configuration

Use a `.env` at root of the repository to set values for the environment variables defined in `.env` file.

| variable                              | required |                                      default                                      | description                                                                          |
| :------------------------------------ | :------: | :-------------------------------------------------------------------------------: | :----------------------------------------------------------------------------------- |
| PORT                                  |    N     |                                      `3000`                                      | The port for the API to listen on                                                   |
| LOG_LEVEL                             |    N     |                                      `info`                                      | Logging level. Valid values are [`trace`, `debug`, `info`, `warn`, `error`, `fatal`] |
| CLOUDAGENT_ADMIN_ORIGIN               |    Y     |                            http://localhost:3100                                 | veritable-cloudagent url                                                             |
| STORAGE_BACKEND_MODE                  |    N     |                                     `MINIO`                                      | Storage backend type. Valid values are [`S3`, `AZURE`, `MINIO`]                     |
| STORAGE_BACKEND_HOST                  |    N     |                                   `localhost`                                    | Storage backend host                                                                 |
| STORAGE_BACKEND_PORT                  |    N     |                    `9000` (Minio/S3) or `10000` (Azure)                         | Storage backend port                                                                 |
| STORAGE_BACKEND_PROTOCOL              |    N     |                                      `http`                                      | Storage backend protocol (`http` or `https`)                                        |
| STORAGE_BACKEND_BUCKET_NAME           |    N     |                                      `test`                                      | Storage bucket/container name                                                        |
| STORAGE_BACKEND_ACCESS_KEY_ID         |    N     |                                     `minio`                                      | S3/Minio access key ID (required for S3/MINIO modes)                               |
| STORAGE_BACKEND_SECRET_ACCESS_KEY     |    N     |                                    `password`                                    | S3/Minio secret access key (required for S3/MINIO modes)                           |
| STORAGE_BACKEND_S3_REGION             |    N     |                                   `eu-west-2`                                    | S3 region (required for S3 mode)                                                    |
| STORAGE_BACKEND_ACCOUNT_NAME          |    N     |                                `devstoreaccount1`                                | Azure storage account name (required for AZURE mode)                               |
| STORAGE_BACKEND_ACCOUNT_SECRET        |    N     | `Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==` | Azure storage account key (required for AZURE mode)                                |

## Getting started

### Development with local Minio

Start the required services using Docker Compose:

```sh
# Bring up local docker dependencies
docker compose up -d
# Install packages
npm i
# Build
npm run build
# Start encryption service in dev mode
npm run dev
```

The encryption service will be available at http://localhost:3000

### Development with external storage

```sh
# Install packages
npm i
# start service in dev mode
npm run dev
```

View OpenAPI documentation for all routes with Swagger at http://localhost:3000/swagger/

## Local HTTPS Certificates

The `veritable-cloudagent` dependency includes a `did:web` server. Since `did:web` always [resolves to HTTPS](https://w3c-ccg.github.io/did-method-web/#read-resolve/), the server runs as HTTPS in dev mode. A local trusted certificate and key must be generated before it can be accessed in your browser.

- Install [mkcert](https://github.com/FiloSottile/mkcert#installation).
- Run the following commands at root:

```
mkcert -install
mkcert veritable-cloudagent-alice localhost
mkcert veritable-cloudagent-bob localhost
export NODE_EXTRA_CA_CERTS="$(mkcert -CAROOT)/rootCA.pem"
```

This will create `.pem` and `-key.pem` files for `veritable-cloudagent-{alice|bob}` at root. These are mounted in the docker compose for Alice and Bob cloudagent.

`NODE_EXTRA_CA_CERTS` is set to the root CA so that dev certificates are trusted when the agent resolves to `https`. If certificates are setup correctly, after running `docker compose up -d`, it should be possible to see Alice's DID at https://localhost:8443/did.json

## Tests

Unit tests are executed by calling:

```sh
npm run test:unit
```

Ensure [certificates](#local-https-certificates) have been generated and `NODE_EXTRA_CA_CERTS` set. Integration tests are executed by calling:

```sh
npm run tsoa:build
npm run test:integration
```
