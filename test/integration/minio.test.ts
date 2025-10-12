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

      const response = await request(app)
        .post('/files/upload')
        .attach('file', testFileContent, testFileName)
        .expect(201)

      expect(response.body).to.have.property('key')
      expect(response.body).to.have.property('url')
      expect(response.body).to.have.property('message', 'File uploaded successfully')
      expect(response.body.key).to.include(testFileName)

      expect(response.body.url).to.include(testFileName)
    })
  })

  describe('Direct Minio Access', function () {
    let uploadedFileKey: string
    let directMinioUrl: string

    before(async () => {
      // Upload a file first via the encryption service
      const testContent = Buffer.from('Direct Minio access test content')
      const response = await request(app)
        .post('/files/upload')
        .attach('file', testContent, 'direct-access-test.txt')
        .expect(201)

      uploadedFileKey = response.body.key
      directMinioUrl = response.body.url
    })

    it('should allow direct download from Minio URL (anonymous access)', async () => {
      // Test that the returned URL format is correct for direct Minio access
      // Verify URL components for anonymous access
      const urlParts = new URL(directMinioUrl)
      expect(urlParts.hostname).to.equal(process.env.STORAGE_BACKEND_HOST)
      expect(urlParts.port).to.equal(process.env.STORAGE_BACKEND_PORT)
      expect(urlParts.pathname).to.include(`test/direct-access-test.txt`)
      expect(urlParts.pathname).to.include(uploadedFileKey)

      // Actually test downloading the file from Minio directly using fetch
      const response = await fetch(directMinioUrl)
      expect(response.status).to.equal(200)

      const downloadedContent = await response.text()
      expect(downloadedContent).to.equal('Direct Minio access test content')
    })
  })
})
