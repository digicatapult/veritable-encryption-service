import { Storage, StorageAdapterConfig, Provider } from '@tweedegolf/storage-abstraction'
import { type Logger } from 'pino'
import { inject, injectable } from 'tsyringe'
import { AzureEnv, EnvToken, MinioEnv, S3Env, type Env } from '../env.js'
import { LoggerToken } from '../logger.js'

export const StorageToken = Symbol('StorageToken')

@injectable()
export default class StorageClass {
  private storage: Storage
  private config: StorageAdapterConfig | undefined

  constructor(
    @inject(EnvToken) private env: S3Env | AzureEnv | MinioEnv,
    @inject(LoggerToken) private logger: Logger
  ) {
    if (!isS3Env(env) && !isAzureEnv(env) && !isMinioEnv(env)) {
      throw new Error('Invalid storage mode')
    }
    if (isS3Env(env)) {
      this.config = {
        provider: Provider.S3, // S3 config
        accessKeyId: env.STORAGE_BACKEND_ACCESS_KEY_ID,
        secretAccessKey: env.STORAGE_BACKEND_SECRET_ACCESS_KEY,
        endpoint: `${env.STORAGE_BACKEND_PROTOCOL}://${env.STORAGE_BACKEND_HOST}:${env.STORAGE_BACKEND_PORT}`,
        region: env.STORAGE_BACKEND_S3_REGION,
        port: env.STORAGE_BACKEND_PORT,
        forcePathStyle: true,
      }
    } else if (isAzureEnv(env)) {
      this.config = {
        provider: Provider.AZURE, // azure config
        connectionString: `DefaultEndpointsProtocol=${env.STORAGE_BACKEND_PROTOCOL};AccountName=${env.STORAGE_BACKEND_ACCOUNT_NAME};AccountKey=${env.STORAGE_BACKEND_ACCOUNT_SECRET};BlobEndpoint=${env.STORAGE_BACKEND_PROTOCOL}://${env.STORAGE_BACKEND_HOST}:${env.STORAGE_BACKEND_PORT}/${env.STORAGE_BACKEND_ACCOUNT_NAME}`,
      }
    } else {
      this.config = {
        provider: Provider.MINIO, // minio config
        accessKey: env.STORAGE_BACKEND_ACCESS_KEY_ID,
        secretKey: env.STORAGE_BACKEND_SECRET_ACCESS_KEY,
        endPoint: env.STORAGE_BACKEND_HOST,
        port: env.STORAGE_BACKEND_PORT,
        bucketName: env.STORAGE_BACKEND_BUCKET_NAME.toString(),
        useSSL: env.STORAGE_BACKEND_PROTOCOL === 'https',
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
      throw new Error(`Failed to list buckets, ${buckets.error}`)
    }

    const bucketName = this.env.STORAGE_BACKEND_BUCKET_NAME.toString()
    const bucketExists = buckets.value?.find((bucket) => bucket === bucketName)
    if (bucketExists) {
      return
    }

    const createdBucket = await this.storage.createBucket(bucketName, { public: true })
    if (createdBucket.error !== null) {
      throw new Error('Failed to create bucket')
    }
  }

  async addFile({ buffer, targetPath }: { buffer: Buffer; targetPath: string }): Promise<{
    key: string
    url: string
  }> {
    this.logger.debug('Uploading file %s', targetPath)
    await this.createBucketIfDoesNotExist()

    const upload = await this.storage.addFileFromBuffer({
      buffer: buffer,
      targetPath: targetPath,
      bucketName: this.env.STORAGE_BACKEND_BUCKET_NAME.toString(),
    })
    if (upload.error !== null) {
      this.logger.error('Failed to upload file: %s', upload.error)
      throw new Error('Failed to upload file')
    }

    const signedUrlResult = await this.storage.getSignedURL(this.env.STORAGE_BACKEND_BUCKET_NAME.toString(), targetPath)
    if (signedUrlResult.error !== null) {
      this.logger.error('Failed to get signed URL: %s', signedUrlResult.error)
      throw new Error('Failed to get signed URL')
    }
    if (signedUrlResult.value === null) {
      throw new Error('Signed URL value is null')
    }
    const urlString = signedUrlResult.value

    return { key: targetPath, url: urlString }
  }
}

// Type guard functions for the Env class instance
function isS3Env(env: Env): env is S3Env {
  return env.STORAGE_BACKEND_MODE === 'S3'
}

function isAzureEnv(env: Env): env is AzureEnv {
  return env.STORAGE_BACKEND_MODE === 'AZURE'
}

function isMinioEnv(env: Env): env is MinioEnv {
  return env.STORAGE_BACKEND_MODE === 'MINIO'
}
