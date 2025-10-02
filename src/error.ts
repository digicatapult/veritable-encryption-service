import { Response as ExResponse, Request as ExRequest, NextFunction } from 'express'
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

/**
 * reports that item was not found
 */
export class NotFound extends HttpResponse {
  public item: string

  constructor(item: string) {
    super({ code: 404, message: `${item} not found` })
    this.item = item
    this.name = 'not found'
  }
}

/**
 * indicates that request was invalid e.g. missing parameter
 */
export class BadRequest extends HttpResponse {
  constructor(message = 'bad request') {
    super({ code: 400, message })
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
