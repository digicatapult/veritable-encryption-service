import { IocContainer } from '@tsoa/runtime'
import { Logger } from 'pino'
import { container } from 'tsyringe'
import { logger, LoggerToken } from './logger.js'

export const iocContainer: IocContainer = {
  get: (controller) => {
    return container.resolve(controller as never)
  },
}

export function resetContainer() {
  container.clearInstances()
  container.register<Logger>(LoggerToken, { useValue: logger })
}
