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

  it('maps 400 responses from cloudagent to a local bad request error', async () => {
    sinon
      .stub(globalThis, 'fetch')
      .resolves(new Response('upstream detail', { status: 400, statusText: 'Bad Request' }))

    const cloudagent = new Cloudagent(mockEnvBob, mockLogger)

    try {
      await cloudagent.resolveDid('did:web:example.com')
      expect.fail('Expected resolveDid to throw')
    } catch (error) {
      expect(error).to.be.instanceof(HttpResponse)
      expect((error as HttpResponse).code).to.equal(400)
      expect((error as HttpResponse).message).to.equal('bad request')
    }
  })

  it('maps 404 responses from cloudagent to a local not found error', async () => {
    sinon.stub(globalThis, 'fetch').resolves(new Response('upstream detail', { status: 404, statusText: 'Not Found' }))

    const cloudagent = new Cloudagent(mockEnvBob, mockLogger)

    try {
      await cloudagent.resolveDid('did:web:example.com')
      expect.fail('Expected resolveDid to throw')
    } catch (error) {
      expect(error).to.be.instanceof(HttpResponse)
      expect((error as HttpResponse).code).to.equal(404)
      expect((error as HttpResponse).message).to.equal('not found')
    }
  })

  it('maps 422 responses from cloudagent to a local validation failure', async () => {
    sinon
      .stub(globalThis, 'fetch')
      .resolves(new Response(JSON.stringify({ message: 'upstream validation detail' }), { status: 422 }))

    const cloudagent = new Cloudagent(mockEnvBob, mockLogger)

    try {
      await cloudagent.resolveDid('did:web:example.com')
      expect.fail('Expected resolveDid to throw')
    } catch (error) {
      expect(error).to.be.instanceof(HttpResponse)
      expect((error as HttpResponse).code).to.equal(422)
      expect((error as HttpResponse).message).to.equal('validation failed')
    }
  })

  it('maps unexpected 4xx responses from cloudagent to a local bad request error', async () => {
    sinon.stub(globalThis, 'fetch').resolves(new Response('Forbidden', { status: 403, statusText: 'Forbidden' }))

    const cloudagent = new Cloudagent(mockEnvBob, mockLogger)

    try {
      await cloudagent.resolveDid('did:web:example.com')
      expect.fail('Expected resolveDid to throw')
    } catch (error) {
      expect(error).to.be.instanceof(HttpResponse)
      expect((error as HttpResponse).code).to.equal(400)
      expect((error as HttpResponse).message).to.equal('bad request')
    }
  })

  it('maps unexpected 5xx responses from cloudagent to 500', async () => {
    sinon
      .stub(globalThis, 'fetch')
      .resolves(new Response('cloudagent unavailable', { status: 503, statusText: 'Service Unavailable' }))

    const cloudagent = new Cloudagent(mockEnvBob, mockLogger)

    try {
      await cloudagent.resolveDid('did:web:example.com')
      expect.fail('Expected resolveDid to throw')
    } catch (error) {
      expect(error).to.be.instanceof(HttpResponse)
      expect((error as HttpResponse).code).to.equal(500)
      expect((error as HttpResponse).message).to.equal('internal error')
    }
  })
})
