import { Storage, StorageAdapterConfig, StorageType } from '@tweedegolf/storage-abstraction'
import { type Logger } from 'pino'
import { inject, injectable } from 'tsyringe'
import { AzureEnv, EnvToken, isAzureEnv, isMinioEnv, isS3Env, MinioEnv, S3Env } from '../env.js'
import { LoggerToken } from '../logger.js'
import { sha256HashFromBuffer } from '../utils/hashing.js'

export const StorageToken = Symbol('StorageToken')

@injectable()
export default class StorageClass {
  private storage: Storage
  private config: StorageAdapterConfig

  constructor(
    @inject(EnvToken) private env: S3Env | AzureEnv | MinioEnv,
    @inject(LoggerToken) private logger: Logger
  ) {
    if (!isS3Env(env) && !isAzureEnv(env) && !isMinioEnv(env)) {
      throw new Error('Invalid storage mode')
    }
    if (isS3Env(env)) {
      this.config = {
        type: StorageType.S3, // S3 config
        accessKeyId: env.STORAGE_BACKEND_ACCESS_KEY_ID,
        secretAccessKey: env.STORAGE_BACKEND_SECRET_ACCESS_KEY,
        endpoint: `${env.STORAGE_BACKEND_PROTOCOL}://${env.STORAGE_BACKEND_HOST}:${env.STORAGE_BACKEND_PORT}`,
        region: env.STORAGE_BACKEND_S3_REGION,
        port: env.STORAGE_BACKEND_PORT,
        forcePathStyle: true,
      }
    } else if (isAzureEnv(env)) {
      this.config = {
        type: StorageType.AZURE, // azure config
        connectionString: `DefaultEndpointsProtocol=${env.STORAGE_BACKEND_PROTOCOL};AccountName=${env.STORAGE_BACKEND_ACCOUNT_NAME};AccountKey=${env.STORAGE_BACKEND_ACCOUNT_SECRET};BlobEndpoint=${env.STORAGE_BACKEND_PROTOCOL}://${env.STORAGE_BACKEND_HOST}:${env.STORAGE_BACKEND_PORT}/${env.STORAGE_BACKEND_ACCOUNT_NAME}`,
      }
    } else {
      this.config = {
        type: StorageType.MINIO, // minio config
        accessKey: env.STORAGE_BACKEND_ACCESS_KEY_ID,
        secretKey: env.STORAGE_BACKEND_SECRET_ACCESS_KEY,
        endPoint: env.STORAGE_BACKEND_HOST,
        port: env.STORAGE_BACKEND_PORT,
        bucketName: env.STORAGE_BACKEND_BUCKET_NAME,
        useSSL: false,
      }
    }
    if (this.config === undefined) {
      throw new Error('Storage config not found')
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

    const bucketName = this.env.STORAGE_BACKEND_BUCKET_NAME
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
      bucketName: this.env.STORAGE_BACKEND_BUCKET_NAME,
    })
    if (upload.error !== null) {
      this.logger.error('Failed to upload file: %s', upload.error)
      throw new Error('Failed to upload file')
    }

    let urlString: string
    if (this.env.STORAGE_BACKEND_MODE === 'MINIO') {
      urlString = `${this.env.STORAGE_BACKEND_PROTOCOL}://localhost:${this.env.STORAGE_BACKEND_PORT}/${this.env.STORAGE_BACKEND_BUCKET_NAME}/${integrityHash}`
    } else {
      urlString = (await this.storage.getSignedURL(this.env.STORAGE_BACKEND_BUCKET_NAME, integrityHash)).value!
    }

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
