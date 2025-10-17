import { KeyType } from '@credo-ts/core'
import { expect } from 'chai'
import { createHash } from 'crypto'
import { Express } from 'express'
import { before, describe, it } from 'mocha'
import request from 'supertest'
import createHttpServer from '../../src/server.js'
import { findPublicKeyBase64 } from '../../src/services/cloudagent/did.js'
import { setupTwoPartyContext, testCleanup, TwoPartyContext } from '../helpers/twoPartyContext.js'

describe('File Upload controller tests', function () {
  let app: Express
  const context = {} as TwoPartyContext
  let recipientDid: string
  let recipientPublicKey: string

  before(async () => {
    await setupTwoPartyContext(context)
    app = await createHttpServer()
    const did = await context.localCloudagent.createDid('key', {
      keyType: KeyType.X25519,
    })
    recipientDid = did.id
    recipientPublicKey = findPublicKeyBase64(did)!
  })

  after(async () => {
    await testCleanup(context)
  })

  describe('File Upload (Encryption Service)', function () {
    it('should upload encrypted file successfully, file returned from Minio is decrypted correctly', async () => {
      const testFileContent = Buffer.from('This is a test file content for encryption')
      const fileHash = createHash('sha256').update(testFileContent).digest('hex')

      const {
        body: { url, key },
      } = await request(app)
        .post('/files')
        .attach('file', testFileContent, 'test-file.txt')
        .field('recipientDid', recipientDid)
        .expect(201)

      const [file] = await context.localDatabase.get('file', { plaintext_hash: fileHash })
      expect(file).to.exist
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
  })
})
