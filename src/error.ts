import { Request as ExRequest, Response as ExResponse, NextFunction } from 'express'
import { ValidateError } from 'tsoa'

import { logger } from './logger.js'

export class HttpResponse extends Error {
  public code: number
  public message: string

  constructor({ code = 500, message = 'Internal server error' }) {
    super(message)
    this.code = code
    this.message = message
  }
}

export class BadRequest extends HttpResponse {
  constructor(message = 'bad request') {
    super({ code: 400, message })
  }
}

export class InternalError extends HttpResponse {
  constructor(message = 'internal error') {
    super({ code: 500, message })
  }
}

export class NotFoundError extends HttpResponse {
  constructor(message = 'not found') {
    super({ code: 404, message })
  }
}

export const errorHandler = function errorHandler(
  err: Error & { code: number; data?: object },
  req: ExRequest,
  res: ExResponse,
  next: NextFunction
): void {
  if (err instanceof ValidateError) {
    logger.warn(`Handled Validation Error for ${req.path}: %s`, JSON.stringify(err.fields))

    const { status, ...rest } = err

    res.status(422).send({
      ...rest,
      message: 'Validation failed',
    })
    return
  }
  if (err instanceof HttpResponse) {
    logger.warn('Error thrown in handler: %s', err.message)
    res.status(err.code).json(err.message)
    return
  }
  if (err instanceof Error) {
    logger.error('Unexpected error thrown in handler: %s', err.message)

    res.status(500).json(err)
    return
  }

  next()
}
