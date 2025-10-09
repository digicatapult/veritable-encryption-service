import { expect } from 'chai'
import { describe, it } from 'mocha'
import request from 'supertest'
import version from '../../src/version.js'

describe('health check', function () {
  const ENCRYPTION_SERVICE_URL = 'http://localhost:3000'
  it('returns 200', async () => {
    const { status, body } = await request(ENCRYPTION_SERVICE_URL).get('/health')
    expect(status).to.equal(200)

    expect(body).to.deep.equal({
      status: 'ok',
      version,
    })
  })
})
