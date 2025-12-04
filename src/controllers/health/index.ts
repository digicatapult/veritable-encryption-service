import express from 'express'
import { Controller, Get, Hidden, Request, Route, SuccessResponse } from '@tsoa/runtime'
import { Health } from '../../models/health.js'
import version from '../../version.js'

@Route('health')
export class HealthController extends Controller {
  public constructor() {
    super()
  }

  /**
   * @summary Check health of API and its dependencies
   */
  @SuccessResponse(200)
  @Hidden()
  @Get('/')
  public async get(@Request() req: express.Request): Promise<Health> {
    req.log.trace('health controller called, veritable-encryption-service version is %s', version)
    return {
      status: 'ok',
      version: version,
    }
  }
}
