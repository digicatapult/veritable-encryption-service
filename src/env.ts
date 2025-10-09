import dotenv from 'dotenv'
import * as envalid from 'envalid'

if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: 'test/test.env' })
} else {
  dotenv.config()
}

// Base environment type that's common to all storage modes
type BaseEnv = {
  PORT: number
  LOG_LEVEL: string
  STORAGE_BACKEND_MODE: 'S3' | 'AZURE' | 'MINIO'
}

// Specific types for each storage mode
type S3Env = BaseEnv & {
  STORAGE_BACKEND_MODE: 'S3'
  STORAGE_BACKEND_HOST: string
  STORAGE_BACKEND_PORT: number
  STORAGE_BACKEND_S3_REGION: string
  STORAGE_BACKEND_ACCESS_KEY_ID: string
  STORAGE_BACKEND_SECRET_ACCESS_KEY: string
  STORAGE_BACKEND_PROTOCOL: string
  STORAGE_BACKEND_BUCKET_NAME: string
}

type AzureEnv = BaseEnv & {
  STORAGE_BACKEND_MODE: 'AZURE'
  STORAGE_BACKEND_HOST: string
  STORAGE_BACKEND_PORT: number
  STORAGE_BACKEND_ACCOUNT_NAME: string
  STORAGE_BACKEND_ACCOUNT_SECRET: string
  STORAGE_BACKEND_PROTOCOL: string
  STORAGE_BACKEND_BUCKET_NAME: string
}

type MinioEnv = BaseEnv & {
  STORAGE_BACKEND_MODE: 'MINIO'
  STORAGE_BACKEND_HOST: string
  STORAGE_BACKEND_PORT: number
  STORAGE_BACKEND_ACCESS_KEY_ID: string
  STORAGE_BACKEND_SECRET_ACCESS_KEY: string
  STORAGE_BACKEND_PROTOCOL: string
  STORAGE_BACKEND_BUCKET_NAME: string
}

// Union type of all possible env configurations
type Env = S3Env | AzureEnv | MinioEnv

export const baseSchema = {
  PORT: envalid.port({ default: 3000 }),
  LOG_LEVEL: envalid.str({ default: 'info', devDefault: 'debug' }),
  STORAGE_BACKEND_MODE: envalid.str({ devDefault: 'MINIO', choices: ['S3', 'AZURE', 'MINIO'] }),
}

export const s3Schema = {
  STORAGE_BACKEND_HOST: envalid.host({ devDefault: 'localhost' }),
  STORAGE_BACKEND_PORT: envalid.port({ default: 9000 }),
  STORAGE_BACKEND_S3_REGION: envalid.str({ devDefault: 'eu-west-2' }),
  STORAGE_BACKEND_ACCESS_KEY_ID: envalid.str({ devDefault: 'minio' }),
  STORAGE_BACKEND_SECRET_ACCESS_KEY: envalid.str({ devDefault: 'password' }),
  STORAGE_BACKEND_PROTOCOL: envalid.str({ default: 'http', devDefault: 'http' }),
  STORAGE_BACKEND_BUCKET_NAME: envalid.str({ devDefault: 'test' }),
}

export const azureSchema = {
  STORAGE_BACKEND_HOST: envalid.host({ devDefault: 'localhost' }),
  STORAGE_BACKEND_PORT: envalid.port({ default: 10000 }),
  STORAGE_BACKEND_ACCOUNT_NAME: envalid.str({ devDefault: 'devstoreaccount1' }),
  STORAGE_BACKEND_ACCOUNT_SECRET: envalid.str({
    devDefault: 'Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==',
  }),
  STORAGE_BACKEND_PROTOCOL: envalid.str({ default: 'http', devDefault: 'http' }),
  STORAGE_BACKEND_BUCKET_NAME: envalid.str({ devDefault: 'test' }),
}

export const minioSchema = {
  STORAGE_BACKEND_HOST: envalid.host({ devDefault: 'localhost' }),
  STORAGE_BACKEND_PORT: envalid.port({ default: 9000 }),
  STORAGE_BACKEND_ACCESS_KEY_ID: envalid.str({ devDefault: 'minio' }),
  STORAGE_BACKEND_SECRET_ACCESS_KEY: envalid.str({ devDefault: 'password' }),
  STORAGE_BACKEND_PROTOCOL: envalid.str({ default: 'http', devDefault: 'http' }),
  STORAGE_BACKEND_BUCKET_NAME: envalid.str({ devDefault: 'test' }),
}

function getStorageSchema(storageMode: string) {
  switch (storageMode.toUpperCase()) {
    case 'S3':
      return { ...baseSchema, ...s3Schema }
    case 'AZURE':
      return { ...baseSchema, ...azureSchema }
    case 'MINIO':
      return { ...baseSchema, ...minioSchema }
    default:
      throw new Error(`Invalid storage mode: ${storageMode}. Must be one of: S3, AZURE, MINIO`)
  }
}

// Get the storage mode first
const tempEnv = envalid.cleanEnv(process.env, baseSchema)
const storageMode = tempEnv.STORAGE_BACKEND_MODE
if (!storageMode) {
  throw new Error('STORAGE_BACKEND_MODE is not set')
}
export const envSchema = getStorageSchema(storageMode)

const env = envalid.cleanEnv(process.env, envSchema) as Env

export default env

export const EnvToken = Symbol('Env')
export type { AzureEnv, Env, MinioEnv, S3Env }

// Type guard functions
export function isS3Env(env: Env): env is S3Env {
  return env.STORAGE_BACKEND_MODE === 'S3'
}

export function isAzureEnv(env: Env): env is AzureEnv {
  return env.STORAGE_BACKEND_MODE === 'AZURE'
}

export function isMinioEnv(env: Env): env is MinioEnv {
  return env.STORAGE_BACKEND_MODE === 'MINIO'
}
