import { Storage, StorageAdapterConfig, StorageType } from '@tweedegolf/storage-abstraction'
import { type Logger } from 'pino'
import { inject, injectable } from 'tsyringe'
import { Env } from '../env.js'
import { LoggerToken } from '../logger.js'
import { sha256HashFromBuffer } from '../utils/hashing.js'

export const StorageToken = Symbol('StorageToken')

@injectable()
export default class StorageClass {
  private storage: Storage
  private config: StorageAdapterConfig

  constructor(
    private env: Env,
    @inject(LoggerToken) private logger: Logger
  ) {
    if (!isS3Env(env) && !isAzureEnv(env) && !isMinioEnv(env)) {
      throw new Error('Invalid storage mode')
    }
    if (isS3Env(env)) {
      this.config = {
        type: StorageType.S3, // S3 config
        accessKeyId: env.get('STORAGE_BACKEND_ACCESS_KEY_ID'),
        secretAccessKey: env.get('STORAGE_BACKEND_SECRET_ACCESS_KEY'),
        endpoint: `${env.get('STORAGE_BACKEND_PROTOCOL')}://${env.get('STORAGE_BACKEND_HOST')}:${env.get('STORAGE_BACKEND_PORT')}`,
        region: env.get('STORAGE_BACKEND_S3_REGION'),
        port: env.get('STORAGE_BACKEND_PORT'),
        forcePathStyle: true,
      }
    } else if (isAzureEnv(env)) {
      this.config = {
        type: StorageType.AZURE, // azure config
        connectionString: `DefaultEndpointsProtocol=${env.get('STORAGE_BACKEND_PROTOCOL')};AccountName=${env.get('STORAGE_BACKEND_ACCOUNT_NAME')};AccountKey=${env.get('STORAGE_BACKEND_ACCOUNT_SECRET')};BlobEndpoint=${env.get('STORAGE_BACKEND_PROTOCOL')}://${env.get('STORAGE_BACKEND_HOST')}:${env.get('STORAGE_BACKEND_PORT')}/${env.get('STORAGE_BACKEND_ACCOUNT_NAME')}`,
      }
    } else {
      this.config = {
        type: StorageType.MINIO, // minio config
        accessKey: env.get('STORAGE_BACKEND_ACCESS_KEY_ID'),
        secretKey: env.get('STORAGE_BACKEND_SECRET_ACCESS_KEY'),
        endPoint: env.get('STORAGE_BACKEND_HOST'),
        port: env.get('STORAGE_BACKEND_PORT'),
        bucketName: env.get('STORAGE_BACKEND_BUCKET_NAME').toString(),
        useSSL: env.get('STORAGE_BACKEND_PROTOCOL') === 'https',
      }
    }

    this.storage = new Storage(this.config)
    this.logger.child({ module: 'Storage Class' })
    this.logger.info('Storage config: %j', this.config)
  }

  async createBucketIfDoesNotExist() {
    this.logger.info('Creating bucket if it does not exist')
    const buckets = await this.storage.listBuckets()
    if (buckets.error !== null) {
      this.logger.error('Failed to list buckets: %j', buckets)
      throw new Error(`Failed to list buckets, ${buckets.error}`)
    }

    const bucketName = this.env.get('STORAGE_BACKEND_BUCKET_NAME').toString()
    const bucketExists = buckets.value?.find((bucket) => bucket === bucketName)
    if (bucketExists) {
      return
    }

    const createdBucket = await this.storage.createBucket(bucketName)
    if (createdBucket.error !== null) {
      this.logger.error('Failed to create bucket: %s', createdBucket.error)
      throw new Error('Failed to create bucket')
    }
  }

  async addFile({ buffer, filename }: { buffer: Buffer; filename: string }): Promise<{
    key: string
    url: string
  }> {
    this.logger.debug('Uploading file %s', filename)
    await this.createBucketIfDoesNotExist()
    const integrityHash = sha256HashFromBuffer(buffer)

    const upload = await this.storage.addFileFromBuffer({
      buffer: buffer,
      targetPath: integrityHash,
      bucketName: this.env.get('STORAGE_BACKEND_BUCKET_NAME').toString(),
    })
    if (upload.error !== null) {
      this.logger.error('Failed to upload file: %s', upload.error)
      throw new Error('Failed to upload file')
    }

    let urlString: string
    if (this.env.get('STORAGE_BACKEND_MODE') === 'MINIO') {
      urlString = `${this.env.get('STORAGE_BACKEND_PROTOCOL')}://localhost:${this.env.get('STORAGE_BACKEND_PORT')}/${this.env.get('STORAGE_BACKEND_BUCKET_NAME')}/${integrityHash}`
      return { key: integrityHash, url: urlString }
    }

    const signedUrlResult = await this.storage.getSignedURL(
      this.env.get('STORAGE_BACKEND_BUCKET_NAME').toString(),
      integrityHash
    )
    if (signedUrlResult.error !== null) {
      this.logger.error('Failed to get signed URL: %s', signedUrlResult.error)
      throw new Error('Failed to get signed URL')
    }
    if (signedUrlResult.value === null) {
      this.logger.error('Signed URL value is null')
      throw new Error('Signed URL value is null')
    }
    urlString = signedUrlResult.value

    return { key: integrityHash, url: urlString }
  }

  getStatus = async () => {
    try {
      const buckets = await this.storage.listBuckets()
      if (buckets.error !== null) {
        logStatusError(this.logger, buckets.error)
        return {
          status: 'DOWN',
          detail: { message: `Error getting status from storage ${buckets.error}` },
        }
      }
    } catch (e) {
      logStatusError(this.logger, e)
      return {
        status: 'DOWN',
        detail: { message: `Error getting status from storage ${e}` },
      }
    }
    return {
      status: 'UP',
      detail: { version: '1.0.0', peerCount: 0 },
    }
  }
}

const logStatusError = (logger: Logger, details: unknown) => {
  if (details instanceof Error) {
    logger.error('Error getting status from storage. Message: %s', details.message)
    logger.debug('Error getting status from storage. Stack: %s', details.stack ?? 'no stack')
  } else {
    logger.error('Error getting status from storage: %s', JSON.stringify(details))
  }
}

// Type guard functions for the Env class instance
function isS3Env(env: Env): boolean {
  return env.get('STORAGE_BACKEND_MODE') === 'S3'
}

function isAzureEnv(env: Env): boolean {
  return env.get('STORAGE_BACKEND_MODE') === 'AZURE'
}

function isMinioEnv(env: Env): boolean {
  return env.get('STORAGE_BACKEND_MODE') === 'MINIO'
}
