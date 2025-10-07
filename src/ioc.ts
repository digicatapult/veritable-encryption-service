import { IocContainer } from '@tsoa/runtime'
import { Logger } from 'pino'
import { container } from 'tsyringe'
import { logger, LoggerToken } from './logger.js'
import { Env, EnvToken } from './env.js'
import StorageClass, { StorageToken } from './services/storage.js'

export const iocContainer: IocContainer = {
  get: (controller) => {
    return container.resolve(controller as never)
  },
}

export function resetContainer() {
  container.clearInstances()
  container.register<Logger>(LoggerToken, { useValue: logger })
  container.register<Env>(EnvToken, { useClass: Env })
  container.register<StorageClass>(StorageToken, { useClass: StorageClass })
}
