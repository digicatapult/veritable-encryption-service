import { randomUUID } from 'crypto'
import { Request as ExRequest, Response as ExResponse } from 'express'
import { Logger, pino } from 'pino'
import { pinoHttp } from 'pino-http'
import env from './env.js'

export const logger: Logger = pino(
  {
    name: 'veritable-encryption-service',
    timestamp: true,
    level: env.LOG_LEVEL || 'info',
  },
  process.stdout
)

export const LoggerToken = Symbol('Logger')

export function createRequestLogger(logger: Logger) {
  return pinoHttp({
    logger,
    serializers: {
      req: ({ id, headers, ...req }: { id: string; headers: Record<string, string> }) => ({
        ...req,
        headers: {},
      }),
      res: (res) => {
        delete res.headers
        return res
      },
    },
    genReqId: function (req: ExRequest, res: ExResponse): string {
      const id: string = (req.headers['x-request-id'] as string) || (req.id as string) || randomUUID()
      res.setHeader('x-request-id', id)
      return id
    },
    quietReqLogger: true,
    customAttributeKeys: {
      reqId: 'req_id',
    },
  })
}
