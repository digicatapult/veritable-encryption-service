import cors from 'cors'
import express, { Express, type Request as ExRequest, type Response as ExResponse } from 'express'
import { serve, setup, SwaggerUiOptions } from 'swagger-ui-express'

import multer from 'multer'
import { Logger } from 'pino'
import { container } from 'tsyringe'
import env from './env.js'
import { errorHandler } from './error.js'
import { createRequestLogger, LoggerToken } from './logger.js'
import { RegisterRoutes } from './routes/routes.js'
import swagger from './routes/swagger.json' with { type: 'json' }

export default async (): Promise<Express> => {
  const app: Express = express()
  app.disable('x-powered-by')

  const logger = container.resolve<Logger>(LoggerToken)
  app.use(createRequestLogger(logger))
  app.use((_req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin')
    res.setHeader('Referrer-Policy', 'no-referrer')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    next()
  })

  const options: SwaggerUiOptions = {
    swaggerOptions: { url: '/api-docs' },
  }

  app.use(express.urlencoded({ extended: true }))
  app.use(express.json())
  app.use(cors({ origin: false }))

  app.get('/', (_req: ExRequest, res: ExResponse) => {
    res.redirect('/swagger')
  })

  app.get('/api-docs', (_req: ExRequest, res: ExResponse) => {
    res.json(swagger)
  })
  app.use('/swagger', serve, setup(swagger, options))

  const multerOptions = multer({
    limits: {
      fileSize: env.UPLOAD_LIMIT_MB * 1024 * 1024,
    },
  })
  RegisterRoutes(app, { multer: multerOptions })

  app.use((_req, res) => {
    res.status(404).json({ message: 'not found' })
  })

  app.use(errorHandler)

  return app
}
