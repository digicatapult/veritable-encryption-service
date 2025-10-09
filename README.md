# veritable-encryption-service

## Description

An API facilitating encryption and storage for Digital Catapult's [Veritable](https://github.com/digicatapult/veritable-documentation) SSI solution. This service acts as an encryption layer for file storage, uploading encrypted files to Minio and providing direct access URLs for anonymous downloads.

## Architecture

The encryption service is designed with a simple, focused architecture:

- **Upload**: Files are uploaded to the encryption service, processed (encrypted), and stored in Minio
- **Download**: Files are downloaded directly from Minio via HTTP GET (no proxy through the encryption service)
- **Anonymous Access**: Minio buckets are configured for public read access

```
[Client] --upload--> [Encryption Service] --store--> [Minio]
[Client] --download--> [Minio] (direct access)
```

## Configuration

Use a `.env` at root of the repository to set values for the environment variables defined in `.env` file.

| variable                | required |        default        | description                                                                          |
| :---------------------- | :------: | :-------------------: | :----------------------------------------------------------------------------------- |
| PORT                    |    N     |        `3000`         | The port for the API to listen on                                                    |
| LOG_LEVEL               |    N     |        `info`         | Logging level. Valid values are [`trace`, `debug`, `info`, `warn`, `error`, `fatal`] |
| CLOUDAGENT_ADMIN_ORIGIN |    y     | http://localhost:3100 | veritable-cloudagent url                                                             |

## Getting started

### Development with local Minio

```sh
# Start Minio using Docker Compose
docker-compose -f docker-compose.test.yml up -d

# Install packages
npm i

# Start service in dev mode
npm run dev
```

### Without Docker
```sh
# install packages
npm i
# start service in dev mode (requires external Minio instance)
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
docker compose up -d
npm run tsoa:build
npm run test:integration
```

Integration tests with Minio (requires Docker):

```sh
npm run test:integration:minio
```

This will start Minio in Docker, run the integration tests, and clean up afterwards.
