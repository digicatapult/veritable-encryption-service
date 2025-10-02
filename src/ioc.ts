import { IocContainer } from '@tsoa/runtime'
import { container } from 'tsyringe'
import env, { Env, EnvToken } from './env.js'
import { Logger } from 'pino'
import { logger, LoggerToken } from './logger.js'

export const iocContainer: IocContainer = {
  get: (controller) => {
    return container.resolve(controller as never)
  },
}

export function resetContainer() {
  container.clearInstances()
  container.registerInstance<Env>(EnvToken, env)
  container.register<Logger>(LoggerToken, { useValue: logger })
}
