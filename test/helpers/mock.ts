import { Logger, pino } from 'pino'
import { MinioEnv } from '../../src/env.js'

export const mockLogger: Logger = pino({ level: 'silent' })

export const mockEnvBob: MinioEnv = {
  CLOUDAGENT_ADMIN_ORIGIN: 'http://localhost:3101',
  PORT: 3000,
  LOG_LEVEL: 'DEBUG',
  DB_HOST: 'localhost',
  DB_NAME: 'veritable-encryption-service',
  DB_USERNAME: 'postgres',
  DB_PASSWORD: 'postgres',
  DB_PORT: 5432,
  UPLOAD_LIMIT_MB: 100,
  STORAGE_BACKEND_MODE: 'MINIO',
  STORAGE_BACKEND_HOST: 'localhost',
  STORAGE_BACKEND_PORT: 9000,
  STORAGE_BACKEND_ACCESS_KEY_ID: 'minio-access-key',
  STORAGE_BACKEND_SECRET_ACCESS_KEY: 'minio-secret-key',
  STORAGE_BACKEND_PROTOCOL: 'http',
  STORAGE_BACKEND_BUCKET_NAME: 'test-bucket',
}
