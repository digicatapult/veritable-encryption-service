import { ValidateError } from '@tsoa/runtime'
import { Request as ExRequest, Response as ExResponse, NextFunction } from 'express'
import multer from 'multer'

import env from './env.js'
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
  if (err instanceof multer.MulterError && (err as multer.MulterError).code === 'LIMIT_FILE_SIZE') {
    err = new BadRequest(`File is too large. Must be less than ${env.UPLOAD_LIMIT_MB}MB`)
  }

  if (
    err instanceof Error &&
    (err.message.includes('Malformed part header') ||
      err.message.includes('Unexpected end of form') ||
      err.message.includes('Unexpected end of multipart data'))
  ) {
    err = new BadRequest('Invalid multipart form data')
  }

  if (err instanceof ValidateError) {
    logger.warn(`Handled Validation Error for ${req.path}: %s`, JSON.stringify(err.fields))

    res.status(422).json({ message: 'validation failed' })
    return
  }
  if (err instanceof HttpResponse) {
    logger.warn({ code: err.code, message: err.message }, 'Error thrown in handler')

    const normalizedCode = err.code === 400 || err.code === 404 || err.code === 422 || err.code === 500 ? err.code : 500

    const normalizedMessageByCode: Record<number, string> = {
      400: 'bad request',
      404: 'not found',
      422: 'validation failed',
      500: 'internal error',
    }

    res.status(normalizedCode).json({ message: normalizedMessageByCode[normalizedCode] })
    return
  }
  if (err instanceof Error) {
    logger.error('Unexpected error thrown in handler: %s', err.message)

    res.status(500).json({ message: 'internal error' })
    return
  }

  next()
}
