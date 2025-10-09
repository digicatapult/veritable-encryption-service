import dotenv from 'dotenv'
import * as envalid from 'envalid'
import { singleton } from 'tsyringe'

if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: 'test/test.env' })
} else {
  dotenv.config()
}

export const baseSchema = {
  PORT: envalid.port({ default: 3000 }),
  LOG_LEVEL: envalid.str({ default: 'info', devDefault: 'debug' }),
  STORAGE_BACKEND_MODE: envalid.str({ devDefault: 'MINIO', choices: ['S3', 'AZURE', 'MINIO'] }),
  CLOUDAGENT_ADMIN_ORIGIN: envalid.url({ devDefault: 'http://localhost:3100' }),
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

type SchemaMap = {
  S3: typeof baseSchema & typeof s3Schema
  AZURE: typeof baseSchema & typeof azureSchema
  MINIO: typeof baseSchema & typeof minioSchema
}

function getStorageSchema<T extends keyof SchemaMap>(mode: T): SchemaMap[T] {
  const upper = mode.toUpperCase() as T
  switch (upper) {
    case 'S3':
      return { ...baseSchema, ...s3Schema } as SchemaMap[T]
    case 'AZURE':
      return { ...baseSchema, ...azureSchema } as SchemaMap[T]
    case 'MINIO':
      return { ...baseSchema, ...minioSchema } as SchemaMap[T]
    default:
      throw new Error(`Invalid storage mode: ${mode}`)
  }
}

// Get the storage mode first
const tempEnv = envalid.cleanEnv(process.env, baseSchema)
const storageMode = tempEnv.STORAGE_BACKEND_MODE as keyof SchemaMap
export const envSchema = getStorageSchema(storageMode)

export type ENV_SCHEMA = typeof envSchema
export type ENV_KEYS = keyof (typeof baseSchema & typeof s3Schema & typeof azureSchema & typeof minioSchema)

@singleton()
export class Env {
  private readonly vals: envalid.CleanedEnv<ENV_SCHEMA>

  constructor() {
    this.vals = envalid.cleanEnv(process.env, envSchema)
  }

  get<K extends ENV_KEYS>(key: K): string | number | boolean {
    return this.vals[key as keyof typeof this.vals]
  }
}

export const EnvToken = Symbol('Env')

// Type guard functions for the Env class instance
export function isS3Env(env: Env): boolean {
  return env.get('STORAGE_BACKEND_MODE') === 'S3'
}

export function isAzureEnv(env: Env): boolean {
  return env.get('STORAGE_BACKEND_MODE') === 'AZURE'
}

export function isMinioEnv(env: Env): boolean {
  return env.get('STORAGE_BACKEND_MODE') === 'MINIO'
}

// Base environment type that's common to all storage modes
type BaseEnv = {
  PORT: number
  LOG_LEVEL: string
  STORAGE_BACKEND_MODE: 'S3' | 'AZURE' | 'MINIO'
  CLOUDAGENT_ADMIN_ORIGIN: string
}

// Specific types for each storage mode
export type S3Env = BaseEnv & {
  STORAGE_BACKEND_MODE: 'S3'
  STORAGE_BACKEND_HOST: string
  STORAGE_BACKEND_PORT: number
  STORAGE_BACKEND_S3_REGION: string
  STORAGE_BACKEND_ACCESS_KEY_ID: string
  STORAGE_BACKEND_SECRET_ACCESS_KEY: string
  STORAGE_BACKEND_PROTOCOL: string
  STORAGE_BACKEND_BUCKET_NAME: string
}

export type AzureEnv = BaseEnv & {
  STORAGE_BACKEND_MODE: 'AZURE'
  STORAGE_BACKEND_HOST: string
  STORAGE_BACKEND_PORT: number
  STORAGE_BACKEND_ACCOUNT_NAME: string
  STORAGE_BACKEND_ACCOUNT_SECRET: string
  STORAGE_BACKEND_PROTOCOL: string
  STORAGE_BACKEND_BUCKET_NAME: string
}

export type MinioEnv = BaseEnv & {
  STORAGE_BACKEND_MODE: 'MINIO'
  STORAGE_BACKEND_HOST: string
  STORAGE_BACKEND_PORT: number
  STORAGE_BACKEND_ACCESS_KEY_ID: string
  STORAGE_BACKEND_SECRET_ACCESS_KEY: string
  STORAGE_BACKEND_PROTOCOL: string
  STORAGE_BACKEND_BUCKET_NAME: string
}
