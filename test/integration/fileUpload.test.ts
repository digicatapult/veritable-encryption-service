import { expect } from 'chai'
import { createHash } from 'crypto'
import { Express } from 'express'
import { before, describe, it } from 'mocha'
import request from 'supertest'
import createHttpServer from '../../src/server.js'
import { setupTwoPartyContext, testCleanup, TwoPartyContext } from '../helpers/twoPartyContext.js'

describe('File Upload controller tests', function () {
  let app: Express
  const context = {} as TwoPartyContext

  before(async () => {
    await setupTwoPartyContext(context)
    app = await createHttpServer()
  })

  after(async () => {
    await testCleanup(context)
  })

  describe('File Upload (Encryption Service)', function () {
    it('should upload a file successfully and return direct Minio URL', async () => {
      const testFileContent = Buffer.from('This is a test file content for encryption')
      const fileHash = createHash('sha256').update(testFileContent).digest('hex')

      const response = await request(app).post('/files').attach('file', testFileContent, 'file').expect(201)

      expect(response.body.url).to.include(fileHash)

      const [file] = await context.localDatabase.get('file', { uri: fileHash })
      expect(file.plaintext_hash).to.equal(fileHash)
    })
  })
})
