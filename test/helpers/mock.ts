import { Logger, pino } from 'pino'
import { Env } from '../../src/env'

export const mockLogger: Logger = pino({ level: 'silent' })

export const mockEnvBob = {
  get(name) {
    if (name === 'CLOUDAGENT_ADMIN_ORIGIN') {
      return 'http://localhost:3101'
    }
    throw new Error('Unexpected env variable request')
  },
} as Env
