import 'reflect-metadata'
import { Express } from 'express'
import { container } from 'tsyringe'

import Server from './server.js'
import { type Env, EnvToken } from './env.js'
import { resetContainer } from './ioc.js'
import { Logger } from 'pino'
import { LoggerToken } from './logger.js'
;(async () => {
  resetContainer()
  const logger = container.resolve<Logger>(LoggerToken)
  const env = container.resolve<Env>(EnvToken)

  const app: Express = await Server()

  app.listen(env.PORT, () => {
    logger.info(`veritable-encryption-service listening on ${env.PORT} port`)
  })
})()
