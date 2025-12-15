import { Express } from 'express'
import 'reflect-metadata'
import { container } from 'tsyringe'

import { Logger } from 'pino'
import { Env, EnvToken } from './env.js'
import Database from './lib/db/index.js'
import { LoggerToken } from './logger.js'
import Server from './server.js'
import StorageClass, { StorageToken } from './storageClass/index.js'
;(async () => {
  const logger = container.resolve<Logger>(LoggerToken)
  const env = container.resolve<Env>(EnvToken)
  const storageService = container.resolve<StorageClass>(StorageToken)
  const database = container.resolve(Database)

  // Initialize database migrations
  try {
    await database.migrate()
    logger.info('Database migrations completed successfully')
  } catch (error) {
    logger.error('Failed to run database migrations: %s', error)
    process.exit(1)
  }

  // Initialize storage bucket
  try {
    await storageService.createBucketIfDoesNotExist()
    logger.info('Storage bucket initialized successfully')
  } catch (error) {
    logger.error('Failed to initialize storage bucket: %s', error)
    process.exit(1)
  }

  const app: Express = await Server()

  app.listen(env.PORT, () => {
    logger.info(`veritable-encryption-service listening on ${env.PORT} port`)
  })
})()
