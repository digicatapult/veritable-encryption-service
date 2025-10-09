import { Express } from 'express'
import 'reflect-metadata'
import { container } from 'tsyringe'

import { Logger } from 'pino'
import { Env, EnvToken } from './env.js'
import { resetContainer } from './ioc.js'
import { LoggerToken } from './logger.js'
import Server from './server.js'
import StorageClass, { StorageToken } from './storageClass/index.js'
;(async () => {
  resetContainer()
  const logger = container.resolve<Logger>(LoggerToken)
  const env = container.resolve<Env>(EnvToken)
  const storageService = container.resolve<StorageClass>(StorageToken)

  // Initialize storage bucket
  try {
    await storageService.createBucketIfDoesNotExist()
    logger.info('Storage bucket initialized successfully')
  } catch (error) {
    logger.error('Failed to initialize storage bucket: %s', error)
    process.exit(1)
  }

  const app: Express = await Server()

  app.listen(env.get('PORT'), () => {
    logger.info(`veritable-encryption-service listening on ${env.get('PORT')} port`)
  })
})()
