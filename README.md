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

| variable           | required | default                 | description                                                                          |
| :----------------- | :------: | :---------------------: | :----------------------------------------------------------------------------------- |
| PORT               |    N     | `3000`                  | The port for the API to listen on                                                    |
| LOG_LEVEL          |    N     | `info`                  | Logging level. Valid values are [`trace`, `debug`, `info`, `warn`, `error`, `fatal`] |
| MINIO_HOST         |    N     | `localhost`             | Minio server hostname                                                                |
| MINIO_PORT         |    N     | `9000`                  | Minio server port                                                                    |
| MINIO_ACCESS_KEY   |    N     | `minioadmin`            | Minio access key                                                                     |
| MINIO_SECRET_KEY   |    N     | `minioadmin`            | Minio secret key                                                                     |
| MINIO_BUCKET       |    N     | `veritable-encryption`  | Minio bucket name for file storage                                                   |
| MINIO_USE_SSL      |    N     | `false`                 | Whether to use SSL for Minio connections                                            |

## API Endpoints

### File Operations

- `POST /files/upload` - Upload and encrypt a file (multipart/form-data with 'file' field)
  - Returns: `{ key, url, message }` where `url` is a direct Minio URL for anonymous download

### Health Check

- `GET /health` - Service health check

## File Access

Files are accessed directly from Minio using the returned URL:

```
POST /files/upload → Returns: { url: "http://localhost:9000/bucket/encrypted-file-key" }
GET http://localhost:9000/bucket/encrypted-file-key → Direct file download
```

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

The Minio console is available at http://localhost:9001 (admin/minioadmin)

## Usage Examples

### Upload a file

```bash
curl -X POST http://localhost:3000/files/upload \
  -F "file=@example.txt"
```

Response:
```json
{
  "key": "1696636800000-example.txt",
  "url": "http://localhost:9000/veritable-encryption/1696636800000-example.txt",
  "message": "File uploaded successfully"
}
```

### Download a file (direct from Minio)

```bash
curl -X GET "http://localhost:9000/veritable-encryption/1696636800000-example.txt" \
  --output downloaded-file.txt
```

## Tests

Unit tests are executed by calling:

```sh
npm run test:unit
```

Integration tests are executed by calling:

```sh
npm run tsoa:build
npm run test:integration
```

Integration tests with Minio (requires Docker):

```sh
npm run test:integration:minio
```

This will start Minio in Docker, run the integration tests, and clean up afterwards.
