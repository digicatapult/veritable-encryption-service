import express, { Express, type Request as ExRequest, type Response as ExResponse } from 'express'
import { setup, serve, SwaggerUiOptions } from 'swagger-ui-express'
import cors from 'cors'
import promBundle from 'express-prom-bundle'

import { errorHandler } from './error.js'
import { RegisterRoutes } from './routes/routes.js'
import swagger from './routes/swagger.json' with { type: 'json' }
import { createRequestLogger, LoggerToken } from './logger.js'
import { Logger } from 'pino'
import { container } from 'tsyringe'

const promClient = promBundle({
  includePath: true,
  promClient: {
    collectDefaultMetrics: {
      prefix: 'veritable_encryption_service_',
    },
  },
})

export default async (): Promise<Express> => {
  const app: Express = express()

  const logger = container.resolve<Logger>(LoggerToken)
  app.use(createRequestLogger(logger))

  const options: SwaggerUiOptions = {
    swaggerOptions: { url: '/api-docs' },
  }

  app.use(express.urlencoded({ extended: true }))
  app.use(express.json())
  app.use(cors())
  app.use(promClient)

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
