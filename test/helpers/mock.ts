import { Logger, pino } from 'pino'
import { S3Env } from '../../src/env.js'

export const mockLogger: Logger = pino({ level: 'silent' })

export const mockEnvBob: S3Env = {
  CLOUDAGENT_ADMIN_ORIGIN: 'http://localhost:3101',
  PORT: 3000,
  LOG_LEVEL: 'DEBUG',
  DB_HOST: 'localhost',
  DB_NAME: 'veritable-encryption-service',
  DB_USERNAME: 'postgres',
  DB_PASSWORD: 'postgres',
  DB_PORT: 5432,
  UPLOAD_LIMIT_MB: 100,
  STORAGE_BACKEND_MODE: 'S3',
  STORAGE_BACKEND_HOST: 'localhost',
  STORAGE_BACKEND_PORT: 8333,
  STORAGE_BACKEND_S3_REGION: 'eu-west-2',
  STORAGE_BACKEND_ACCESS_KEY_ID: 'ignored',
  STORAGE_BACKEND_SECRET_ACCESS_KEY: 'ignored',
  STORAGE_BACKEND_PROTOCOL: 'http',
  STORAGE_BACKEND_BUCKET_NAME: 'test-bucket',
}
