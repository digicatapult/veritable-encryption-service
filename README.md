# veritable-encryption-service

## Description

An API facilitating encryption and storage for Digital Catapult's [Veritable](https://github.com/digicatapult/veritable-documentation) SSI solution. This service acts as an encryption layer for file storage, uploading encrypted files to Minio and providing direct access URLs for anonymous downloads.

## Configuration

Use a `.env` at root of the repository to set values for the environment variables defined in `.env` file.

| variable                          | required |                                          default                                           | description                                                                          |
| :-------------------------------- | :------: | :----------------------------------------------------------------------------------------: | :----------------------------------------------------------------------------------- |
| PORT                              |    N     |                                           `3000`                                           | The port for the API to listen on                                                    |
| LOG_LEVEL                         |    N     |                                           `info`                                           | Logging level. Valid values are [`trace`, `debug`, `info`, `warn`, `error`, `fatal`] |
| CLOUDAGENT_ADMIN_ORIGIN           |    Y     |                                   http://localhost:3100                                    | veritable-cloudagent url                                                             |
| DB_HOST                           |    N     |                                        `localhost`                                         | Database host                                                                        |
| DB_NAME                           |    N     |                               `veritable-encryption-service`                               | Database name                                                                        |
| DB_USERNAME                       |    N     |                                         `postgres`                                         | Database username                                                                    |
| DB_PASSWORD                       |    N     |                                         `postgres`                                         | Database password                                                                    |
| DB_PORT                           |    N     |                                           `5432`                                           | Database port                                                                        |
| UPLOAD_LIMIT_MB                   |    n     |                                           `100`                                            | Upload limit for files in MB                                                         |
| STORAGE_BACKEND_MODE              |    N     |                                          `MINIO`                                           | Storage backend type. Valid values are [`S3`, `AZURE`, `MINIO`]                      |
| STORAGE_BACKEND_HOST              |    N     |                                        `localhost`                                         | Storage backend host                                                                 |
| STORAGE_BACKEND_PORT              |    N     |                            `9000` (Minio/S3) or `10000` (Azure)                            | Storage backend port                                                                 |
| STORAGE_BACKEND_PROTOCOL          |    N     |                                           `http`                                           | Storage backend protocol (`http` or `https`)                                         |
| STORAGE_BACKEND_BUCKET_NAME       |    N     |                                           `test`                                           | Storage bucket/container name                                                        |
| STORAGE_BACKEND_ACCESS_KEY_ID     |    N     |                                          `minio`                                           | S3/Minio access key ID (required for S3/MINIO modes)                                 |
| STORAGE_BACKEND_SECRET_ACCESS_KEY |    N     |                                         `password`                                         | S3/Minio secret access key (required for S3/MINIO modes)                             |
| STORAGE_BACKEND_S3_REGION         |    N     |                                        `eu-west-2`                                         | S3 region (required for S3 mode)                                                     |
| STORAGE_BACKEND_ACCOUNT_NAME      |    N     |                                     `devstoreaccount1`                                     | Azure storage account name (required for AZURE mode)                                 |
| STORAGE_BACKEND_ACCOUNT_SECRET    |    N     | `Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==` | Azure storage account key (required for AZURE mode)                                  |

## Getting started

### Development with local dependencies

Start the required services using Docker Compose:

```sh
# Bring up local docker dependencies
docker compose up -d
# Install packages
npm i
## db migrate
npm run db:migrate
# Build
npm run build
# Start encryption service in dev mode
npm run dev
```

View OpenAPI documentation for all routes with Swagger at http://localhost:3000/swagger/

## Node.js 24 Compatibility

This project uses Node.js 24 LTS. Due to compatibility requirements with native modules, the following npm overrides are configured in `package.json`:

- **`ref-napi: npm:@2060.io/ref-napi`**: Uses a patched version of ref-napi that supports Node.js 24. The standard ref-napi package has compatibility issues with Node 24's native module ABI.

- **`node-addon-api: 8.5.0`**: Forces version 8.5.0 of node-addon-api, which is compatible with Node.js 24. The @2060.io/ref-napi package requires node-addon-api ^3.0.0, but Node 24 requires >=5.x. This override ensures the correct version is used across all dependencies.

**Important**: Both overrides must be present together for the native modules to compile successfully with Node.js 24. Removing either override will cause build failures with node-gyp.

These overrides enable the `@hyperledger/aries-askar-nodejs` dependency (used for encryption operations) to work with Node.js 24.

## Local HTTPS Certificates

The `veritable-cloudagent` dependency includes a `did:web` server. Since `did:web` always [resolves to HTTPS](https://w3c-ccg.github.io/did-method-web/#read-resolve/), the server runs as HTTPS in dev mode. A local trusted certificate and key must be generated before it can be accessed in your browser.

- Install [mkcert](https://github.com/FiloSottile/mkcert#installation).
- Run the following commands at root:

```bash
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
npm run db:migrate
npm run test:integration
```

## Full demo

This [E2E success test](test/integration/fileUpload.test.ts) shows how to upload a file to be encrypted for a recipient DID and stored in minio. The recipient downloads and decrypts the file.

## Encryption

The service implements multiple types of encryption.

### AES-256-GCM (Symmetric Encryption)

**Default Configuration**:

```typescript
  VERI: {
    cekSize: 32,
    ivSize: 12,
    algorithm: 'aes-256-gcm',
  }
```

- Key: Random Content Encryption Key (CEK)
- Returns: CBOR envelope + SHA-256 hash of envelope

### ECDH-ES (Asymmetric Key Exchange)

ECDH-ES (Elliptic Curve Diffie-Hellman Ephemeral Static). Ephemeral key generation to encrypt using recipient's public key.

**Default Configuration**:

- Key: X25519
- Encryption: A256GCM
- Returns: JWE (JSON Web Encryption) compact serialization

### Example Usage Flow

**Encryption**:

```typescript
const encryption = new Encryption(ENCRYPTION_CONFIGS.VERI)

// Encrypt file content with CEK
const cek = encryption.generateCek()
const { filename, envelopedCiphertext } = encryption.encryptWithCek(plaintextBuffer, cek)

// Encrypt CEK with recipient's public key
const encryptedCek = encryptEcdh(cek, 'base64-x25519-public-key')

// Destroy CEK from memory
encryption.destroyCek(cek)
```

`envelopedCiphertext` and `encryptedCek` are sent separately. For example, `envelopedCiphertext` goes to external storage (e.g Minio/S3) and `encryptedCek` is sent to recipient via secure channel (DIDComm)

**Decryption**:

```typescript
// Decrypt CEK from DIDCOMM message using private key in recipient cloudagent wallet
const decryptedCek = await cloudagent.walletDecrypt(encryptedCek, recipientPublicKey)

// Download encrypted file from external storage
const encryptedFile = await fetch(fileUrl)
const envelopedCiphertext = await encryptedFile.text()

// Decrypt file content using decrypted CEK
const decryptedContent = encryption.decryptWithCek(envelopedCiphertext, decryptedCek)
```
