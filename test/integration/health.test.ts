import { expect } from 'chai'
import { Express } from 'express'
import { describe, it } from 'mocha'
import request from 'supertest'
import version from '../../src/version.js'

import createHttpServer from '../../src/server.js'

describe('health check', function () {
  let app: Express

  before(async () => {
    app = await createHttpServer()
  })
  it('returns 200', async () => {
    const { status, body } = await request(app).get('/health')
    expect(status).to.equal(200)

    expect(body).to.deep.equal({
      status: 'ok',
      version,
    })
  })
})
