import { type Logger } from 'pino'
import { inject, injectable } from 'tsyringe'
import { LoggerToken } from '../logger.js'
import { StorageType, Storage, StorageAdapterConfig } from '@tweedegolf/storage-abstraction'
import { type Env, EnvToken } from '../env.js'

export const StorageToken = Symbol('StorageToken')

@injectable()
export default class StorageClass {
  private storage: Storage
  private config: StorageAdapterConfig

  constructor(
    @inject(EnvToken) private env: Env,
    @inject(LoggerToken) private logger: Logger
  ) {
    this.config = {
      type: StorageType.MINIO,
      endpoint: this.env.get('MINIO_HOST'),
      port: this.env.get('MINIO_PORT'),
      accessKey: this.env.get('MINIO_ACCESS_KEY'),
      secretKey: this.env.get('MINIO_SECRET_KEY'),
      useSSL: this.env.get('MINIO_USE_SSL'),
    }

    this.storage = new Storage(this.config)
    this.logger = this.logger.child({ module: 'Storage Class' })
    this.logger.info('Storage config: %j', this.config)
  }

  async createBucketIfDoesNotExist() {
    this.logger.info('Creating bucket if it does not exist')
    const buckets = await this.storage.listBuckets()
    if (buckets.error !== null) {
      this.logger.error('Failed to list buckets: %j', buckets)
      throw new Error('Failed to list buckets')
    }

    const bucketExists = buckets.value?.find((bucket) => bucket === this.env.get('MINIO_BUCKET'))
    if (bucketExists) {
      return
    }

    const createdBucket = await this.storage.createBucket(this.env.get('MINIO_BUCKET'))
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

    // Generate unique key with timestamp prefix
    const key = `${Date.now()}-${filename}`

    const upload = await this.storage.addFileFromBuffer({
      buffer: buffer,
      targetPath: key,
      bucketName: this.env.get('MINIO_BUCKET'),
    })
    if (upload.error !== null) {
      this.logger.error('Failed to upload file: %s', upload.error)
      throw new Error('Failed to upload file')
    }

    // Generate public URL for direct Minio access
    const url = this.getPublicUrl(key)

    return { key, url }
  }

  getPublicUrl(key: string): string {
    const protocol = this.env.get('MINIO_USE_SSL') ? 'https' : 'http'
    const host = this.env.get('MINIO_HOST')
    const port = this.env.get('MINIO_PORT')
    const bucket = this.env.get('MINIO_BUCKET')

    return `${protocol}://${host}:${port}/${bucket}/${key}`
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