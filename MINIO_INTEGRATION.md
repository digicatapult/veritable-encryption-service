# Minio Integration for Veritable Encryption Service

## Overview

This implementation adds Minio storage integration to the veritable-encryption-service as a focused encryption layer. The service handles file uploads and encryption, then stores files in Minio for direct anonymous access. This follows the pattern established in the `sqnc-attachment-api` repository while maintaining a simplified, single-purpose architecture.

## Architecture Philosophy

The encryption service is designed with clear separation of concerns:

- **Encryption Service**: Handles upload, encryption, and storage orchestration
- **Minio**: Provides direct file access via native HTTP GET endpoints
- **No Proxy Downloads**: Files are accessed directly from Minio, not through the encryption service

```
┌─────────┐    upload     ┌─────────────────┐    store    ┌───────┐
│ Client  │──────────────→│ Encryption      │────────────→│ Minio │
└─────────┘               │ Service         │             └───────┘
                          └─────────────────┘                 │
┌─────────┐    download (direct HTTP GET)                     │
│ Client  │←─────────────────────────────────────────────────┘
└─────────┘
```

## Key Features

- ✅ **Upload Only API**: Single POST endpoint for file upload and encryption
- ✅ **Direct Minio Access**: Anonymous downloads via native Minio HTTP endpoints  
- ✅ **Minimal Configuration**: Simple Minio setup with public bucket access
- ✅ **Storage Abstraction**: Uses `@tweedegolf/storage-abstraction` library
- ✅ **Integration Tests**: Focused test suite for upload and direct access scenarios

## Implementation Details

### Simplified API (`src/controllers/files/index.ts`)

**Single Endpoint:**
- `POST /files/upload` - Upload and encrypt files, returns direct Minio URL

**Removed Endpoints:**
- ~~`GET /files/{key}`~~ - Files accessed directly from Minio
- ~~`DELETE /files/{key}`~~ - File lifecycle managed externally
- ~~`GET /files/{key}/url`~~ - URL provided on upload

### Storage Service (`src/services/storage.ts`)

Simplified to focus on upload operations:

```typescript
class StorageClass {
  // Core functionality
  async addFile({ buffer, filename }): Promise<{ key, url }>
  async createBucketIfDoesNotExist()
  getPublicUrl(key: string): string
  getStatus(): Promise<StatusResult>
  
  // Removed methods
  // getFile, deleteFile, fileExists, etc.
}
```

### Minio Configuration (`docker-compose.test.yml`)

Minimal setup with public bucket access:

```yaml
services:
  minio:
    image: minio/minio:latest
    ports: ["9000:9000", "9001:9001"]
    # ... basic config
  
  minio-setup:
    image: minio/mc:latest
    # Creates buckets with public download access
    # mc anonymous set download myminio/bucket
```

## Environment Configuration

```env
MINIO_HOST=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=veritable-encryption
MINIO_USE_SSL=false
```

## Usage Flow

### 1. Upload via Encryption Service

```bash
curl -X POST http://localhost:3000/files/upload \
  -F "file=@document.pdf"
```

Response:
```json
{
  "key": "1696636800000-document.pdf",
  "url": "http://localhost:9000/veritable-encryption/1696636800000-document.pdf",
  "message": "File uploaded successfully"
}
```

### 2. Direct Download from Minio

```bash
curl -X GET "http://localhost:9000/veritable-encryption/1696636800000-document.pdf" \
  --output downloaded-document.pdf
```

## Benefits of This Architecture

1. **Separation of Concerns**: Encryption service focuses on encryption, Minio handles distribution
2. **Performance**: No proxy downloads through the encryption service
3. **Scalability**: Minio handles file serving load independently
4. **Simplicity**: Minimal API surface with clear responsibilities
5. **Standard Protocols**: Uses native HTTP GET for downloads
6. **Cost Efficiency**: Reduces bandwidth and processing load on encryption service

## Testing

### Integration Tests (`test/integration/minio.test.ts`)

Focused test scenarios:
- Upload functionality through encryption service
- Direct Minio URL format validation
- Service architecture verification (no proxy endpoints)
- Anonymous access capability testing

### Test Commands

```bash
# Start Minio for testing
docker-compose -f docker-compose.test.yml up -d

# Run integration tests
npm run test:integration
```

## Future Considerations

1. **Encryption**: Add actual encryption logic in the upload handler
2. **Authentication**: Implement authentication for uploads while maintaining anonymous downloads
3. **File Metadata**: Store encryption metadata alongside files
4. **Cleanup**: Implement file lifecycle management (TTL, deletion policies)
5. **Monitoring**: Add metrics for upload/download patterns

## Comparison with Full-Featured Approach

| Aspect | This Implementation | Full-Featured Alternative |
|--------|-------------------|--------------------------|
| Download Method | Direct Minio HTTP GET | Proxy through service |
| API Complexity | Single upload endpoint | Multiple CRUD endpoints |
| Performance | High (no proxy) | Lower (proxy overhead) |
| File Management | External/Manual | Built-in via API |
| Infrastructure | Simple | Complex |
| Use Case | File distribution | Full file management |

This implementation optimizes for the specific use case of an encryption layer that enables direct file access, rather than a full file management system.