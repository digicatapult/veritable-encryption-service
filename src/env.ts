import dotenv from 'dotenv'
import * as envalid from 'envalid'
import { singleton } from 'tsyringe'

if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: 'test/test.env' })
} else {
  dotenv.config()
}

export const envSchema = {
  PORT: envalid.port({ default: 3000 }),
  LOG_LEVEL: envalid.str({ default: 'info', devDefault: 'debug' }),
}

export type ENV_CONFIG = typeof envSchema
export type ENV_KEYS = keyof ENV_CONFIG

@singleton()
export class Env {
  private vals: envalid.CleanedEnv<typeof envSchema>

  constructor() {
    this.vals = envalid.cleanEnv(process.env, envSchema)
  }

  get<K extends ENV_KEYS>(key: K) {
    return this.vals[key]
  }
}
