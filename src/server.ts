import cors from 'cors'
import express, { Express, type Request as ExRequest, type Response as ExResponse } from 'express'
import multer from 'multer'
import { serve, setup, SwaggerUiOptions } from 'swagger-ui-express'

import { Logger } from 'pino'
import { container } from 'tsyringe'
import { errorHandler } from './error.js'
import { createRequestLogger, LoggerToken } from './logger.js'
import { RegisterRoutes } from './routes/routes.js'
import swagger from './routes/swagger.json' with { type: 'json' }

export default async (): Promise<Express> => {
  const app: Express = express()

  const logger = container.resolve<Logger>(LoggerToken)
  app.use(createRequestLogger(logger))

  // Configure multer for file uploads (memory storage)
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
  })

  const options: SwaggerUiOptions = {
    swaggerOptions: { url: '/api-docs' },
  }

  app.use(express.urlencoded({ extended: true }))
  app.use(express.json())
  app.use(cors())

  // Add multer middleware for file uploads
  app.use('/files/upload', upload.single('file'))

  app.get('/', (_req: ExRequest, res: ExResponse) => {
    res.redirect('/swagger')
  })

  app.get('/api-docs', (_req: ExRequest, res: ExResponse) => {
    res.json(swagger)
  })
  app.use('/swagger', serve, setup(swagger, options))

  RegisterRoutes(app)

  app.use(errorHandler)

  return app
}
