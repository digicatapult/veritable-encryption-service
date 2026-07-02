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

  it('sets security headers on responses', async () => {
    const { headers } = await request(app).get('/health').expect(200)

    expect(headers['cross-origin-resource-policy']).to.equal('same-origin')
    expect(headers['referrer-policy']).to.equal('no-referrer')
    expect(headers['x-frame-options']).to.equal('DENY')
    expect(headers['x-content-type-options']).to.equal('nosniff')
  })

  it('returns JSON 404 for unknown routes', async () => {
    const { status, body, headers } = await request(app).get('/route-that-does-not-exist')

    expect(status).to.equal(404)
    expect(headers['content-type']).to.contain('application/json')
    expect(body).to.deep.equal({ message: 'not found' })
  })
})
