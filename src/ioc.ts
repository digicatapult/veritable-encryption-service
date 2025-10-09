import { IocContainer } from '@tsoa/runtime'
import { Logger } from 'pino'
import { container } from 'tsyringe'
import { Env, EnvToken } from './env.js'
import { logger, LoggerToken } from './logger.js'
import StorageClass, { StorageToken } from './storageClass/index.js'

export const iocContainer: IocContainer = {
  get: (controller) => {
    return container.resolve(controller as never)
  },
}

export function resetContainer() {
  container.clearInstances()
  container.register<Env>(EnvToken, { useClass: Env })
  container.register<Logger>(LoggerToken, { useValue: logger })
  container.register<StorageClass>(StorageToken, { useClass: StorageClass })
}
