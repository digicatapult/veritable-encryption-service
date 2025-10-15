import { expect } from 'chai'
import { createHash } from 'crypto'
import { Express } from 'express'
import { before, describe, it } from 'mocha'
import request from 'supertest'
import Database from '../../src/lib/db/index.js'
import createHttpServer from '../../src/server.js'

describe('File Upload controller tests', function () {
  let app: Express
  let db: Database

  before(async () => {
    app = await createHttpServer()
    db = new Database()
  })
  describe('File Upload (Encryption Service)', function () {
    it('should upload a file successfully and return direct Minio URL', async () => {
      const testFileContent = Buffer.from('This is a test file content for encryption')
      const testFileName = 'test-file.txt'

      const response = await request(app).post('/files').attach('file', testFileContent, testFileName).expect(201)

      expect(response.body).to.have.property('url')
      expect(response.body.url).to.include(testFileName)

      const [file] = await db.get('file', { uri: response.body.url })
      const fileHash = createHash('sha256').update(testFileContent).digest('hex')
      expect(file.plaintext_hash).to.equal(fileHash)
    })
  })
})
