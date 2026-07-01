import { expect } from 'chai'
import { afterEach, describe, it } from 'mocha'
import * as sinon from 'sinon'
import { HttpResponse } from '../../src/error.js'
import Cloudagent from '../../src/services/cloudagent/index.js'
import { mockEnvBob, mockLogger } from '../helpers/mock.js'

describe('cloudagent error mapping', () => {
  afterEach(() => {
    sinon.restore()
  })

  it('maps unexpected 4xx responses from cloudagent to the same status code', async () => {
    sinon.stub(globalThis, 'fetch').resolves(new Response('Forbidden', { status: 403, statusText: 'Forbidden' }))

    const cloudagent = new Cloudagent(mockEnvBob, mockLogger)

    try {
      await cloudagent.resolveDid('did:web:example.com')
      expect.fail('Expected resolveDid to throw')
    } catch (error) {
      expect(error).to.be.instanceof(HttpResponse)
      expect((error as HttpResponse).code).to.equal(403)
    }
  })

  it('maps unexpected 5xx responses from cloudagent to 502', async () => {
    sinon
      .stub(globalThis, 'fetch')
      .resolves(new Response('cloudagent unavailable', { status: 503, statusText: 'Service Unavailable' }))

    const cloudagent = new Cloudagent(mockEnvBob, mockLogger)

    try {
      await cloudagent.resolveDid('did:web:example.com')
      expect.fail('Expected resolveDid to throw')
    } catch (error) {
      expect(error).to.be.instanceof(HttpResponse)
      expect((error as HttpResponse).code).to.equal(502)
    }
  })
})
