import { IocContainer } from '@tsoa/runtime'
import { Logger } from 'pino'
import { container } from 'tsyringe'
import env, { type Env, EnvToken } from './env.js'
import Database from './lib/db/index.js'
import { logger, LoggerToken } from './logger.js'
import StorageClass, { StorageToken } from './storageClass/index.js'

export const iocContainer: IocContainer = {
  get: (controller) => {
    return container.resolve(controller as never)
  },
}

function registerContainers() {
  container.registerInstance<Env>(EnvToken, env)
  container.register<Logger>(LoggerToken, { useValue: logger })
  container.register<StorageClass>(StorageToken, { useClass: StorageClass })
  container.register(Database, { useValue: new Database() })
}

export function resetContainer() {
  container.clearInstances()
  registerContainers()
}

registerContainers()
