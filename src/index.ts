import { Express } from 'express'
import 'reflect-metadata'
import { container } from 'tsyringe'

import { Logger } from 'pino'
import { type Env, EnvToken } from './env.js'
import { resetContainer } from './ioc.js'
import { LoggerToken } from './logger.js'
import Server from './server.js'
;(async () => {
  resetContainer()
  const logger = container.resolve<Logger>(LoggerToken)
  const env = container.resolve<Env>(EnvToken)

  const app: Express = await Server()

  app.listen(env.PORT, () => {
    logger.info(`veritable-encryption-service listening on ${env.PORT} port`)
  })
})()
