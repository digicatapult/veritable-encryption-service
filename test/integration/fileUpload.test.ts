import { expect } from 'chai'
import { createHash } from 'crypto'
import { Express } from 'express'
import { afterEach, before, describe, it } from 'mocha'
import * as sinon from 'sinon'
import request from 'supertest'
import env from '../../src/env.js'
import createHttpServer from '../../src/server.js'
import { findPublicKeyBase64Url } from '../../src/services/cloudagent/did.js'
import { DidDocument } from '../../src/services/cloudagent/types.js'
import { setupTwoPartyContext, testCleanup, TwoPartyContext } from '../helpers/twoPartyContext.js'

describe('File Upload controller tests', function () {
  let app: Express
  const context = {} as TwoPartyContext
  let recipientDid: string
  let recipientPublicKey: string
  const testFileContent = Buffer.from('some file')
  const fileHash = createHash('sha256').update(testFileContent).digest('hex')

  before(async () => {
    await setupTwoPartyContext(context)
    app = await createHttpServer()
    recipientDid = 'did:web:veritable-cloudagent-alice%3A8443'
    const did = await context.localCloudagent.resolveDid(recipientDid)
    recipientPublicKey = findPublicKeyBase64Url(did)!
  })

  afterEach(() => {
    sinon.restore()
  })

  after(async () => {
    await testCleanup(context)
  })

  describe('POST /files', function () {
    it('should upload encrypted file successfully, file returned from Minio is decrypted correctly', async () => {
      const {
        body: { url, key },
      } = await request(app)
        .post('/files')
        .attach('file', testFileContent, 'test-file.txt')
        .field('recipientDid', recipientDid)
        .expect(201)

      const [file] = await context.localDatabase.get('file', { plaintext_hash: fileHash })
      expect(file.plaintext_hash).to.equal(fileHash)

      const encryptedFileResponse = await fetch(url)
      expect(encryptedFileResponse.status).to.equal(200)
      const encryptedFileBuffer = Buffer.from(await encryptedFileResponse.arrayBuffer())

      const decryptedCek = await context.localCloudagent.walletDecrypt(key, recipientPublicKey)

      const decryptedContent = context.localEncryption.decryptWithCek(
        encryptedFileBuffer.toString('base64'),
        decryptedCek
      )

      expect(decryptedContent).to.deep.equal(testFileContent)
    })

    it('should upload successfully using auto-generated DID on cloudagent (publickeyjwk keyAgreement)', async () => {
      await request(app)
        .post('/files')
        .attach('file', testFileContent, 'test-file.txt')
        .field('recipientDid', 'did:web:veritable-cloudagent-alice%3A8443')
        .expect(201)
    })

    it('should 400 if recipient DID doc is missing a public key', async () => {
      sinon.stub(context.localCloudagent, 'resolveDid').resolves({} as DidDocument)

      await request(app)
        .post('/files')
        .attach('file', testFileContent, 'test-file.txt')
        .field('recipientDid', 'someDid')
        .expect(400)
        .expect((res) => {
          expect(res.body).to.deep.equal({ message: 'bad request' })
        })
    })

    it('should 400 if upload over limit', async () => {
      const tooLarge = Buffer.from('a'.repeat(env.UPLOAD_LIMIT_MB * 1024 * 1024 + 1))

      await request(app)
        .post('/files')
        .attach('file', tooLarge, 'test-file.txt')
        .field('recipientDid', recipientDid)
        .expect(400)
        .expect((res) => {
          expect(res.body).to.deep.equal({ message: 'bad request' })
        })
    })

    it('should 404 if recipient DID is unresolvable', async () => {
      await request(app)
        .post('/files')
        .attach('file', testFileContent, 'test-file.txt')
        .field('recipientDid', 'did:bla')
        .expect(404)
        .expect((res) => {
          expect(res.body).to.deep.equal({ message: 'not found' })
        })
    })

    it('should 422 if recipient DID is unprocessable', async () => {
      await request(app)
        .post('/files')
        .attach('file', testFileContent, 'test-file.txt')
        .field('recipientDid', 'notADid')
        .expect(422)
    })

    it('should 400 for malformed multipart payload', async () => {
      const boundary = 'multipart-test-boundary'
      const malformedBody = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="test-file.txt"',
        'Malformed part header',
        '',
        'test',
        `--${boundary}--`,
      ].join('\r\n')

      await request(app)
        .post('/files')
        .set('Content-Type', `multipart/form-data; boundary=${boundary}`)
        .send(malformedBody)
        .expect(400)
        .expect((res) => {
          expect(res.headers['content-type']).to.contain('application/json')
          expect(res.body).to.deep.equal({ message: 'bad request' })
        })
    })
  })
})
