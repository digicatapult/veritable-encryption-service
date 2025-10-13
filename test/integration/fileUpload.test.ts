import { expect } from 'chai'
import { Express } from 'express'
import { before, describe, it } from 'mocha'
import request from 'supertest'
import createHttpServer from '../../src/server.js'

describe('Minio Encryption Service Integration', function () {
  let app: Express

  before(async () => {
    app = await createHttpServer()
  })
  describe('File Upload (Encryption Service)', function () {
    it('should upload a file successfully and return direct Minio URL', async () => {
      const testFileContent = Buffer.from('This is a test file content for encryption')
      const testFileName = 'test-file.txt'

      const response = await request(app).post('/files').attach('file', testFileContent, testFileName).expect(201)

      expect(response.body).to.have.property('url')
      expect(response.body.url).to.include(testFileName)
    })
  })
})
