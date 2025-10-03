import { Express } from 'express'
import 'reflect-metadata'
import { container } from 'tsyringe'

import { Logger } from 'pino'
import { Env } from './env.js'
import { resetContainer } from './ioc.js'
import { LoggerToken } from './logger.js'
import Server from './server.js'
;(async () => {
  resetContainer()
  const logger = container.resolve<Logger>(LoggerToken)
  const env = container.resolve(Env)

  const app: Express = await Server()

  app.listen(env.get('PORT'), () => {
    logger.info(`veritable-encryption-service listening on ${env.get('PORT')} port`)
  })
})()
