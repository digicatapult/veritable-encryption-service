import { expect } from 'chai'
import { Express } from 'express'
import { before, describe, it } from 'mocha'
import request from 'supertest'
import { container } from 'tsyringe'

import { resetContainer } from '../../src/ioc.js'
import createHttpServer from '../../src/server.js'
import StorageClass, { StorageToken } from '../../src/services/storage.js'

describe('Minio Encryption Service Integration', function () {
  let app: Express
  let storageService: StorageClass

  before(async () => {
    resetContainer()
    app = await createHttpServer()
    storageService = container.resolve<StorageClass>(StorageToken)

    // Initialize bucket for testing
    await storageService.createBucketIfDoesNotExist()
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

      // URL should point directly to Minio for download
      expect(response.body.url).to.match(/^http:\/\/localhost:9000\/veritable-encryption-test\/.*/)
      expect(response.body.url).to.include(response.body.key)
    })

    it('should return 400 when no file is provided', async () => {
      await request(app).post('/files/upload').expect(400)
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
      expect(directMinioUrl).to.match(
        /^http:\/\/localhost:9000\/veritable-encryption-test\/\d+-direct-access-test\.txt$/
      )

      // Actually test downloading the file from Minio directly using fetch
      const response = await fetch(directMinioUrl)
      expect(response.status).to.equal(200)

      const downloadedContent = await response.text()
      expect(downloadedContent).to.equal('Direct Minio access test content')

      // Verify URL components for anonymous access
      const urlParts = new URL(directMinioUrl)
      expect(urlParts.hostname).to.equal('localhost')
      expect(urlParts.port).to.equal('9000')
      expect(urlParts.pathname).to.include('veritable-encryption-test')
      expect(urlParts.pathname).to.include(uploadedFileKey)
    })
  })

  describe('Storage Service Direct Operations', function () {
    it('should upload file directly via storage service', async () => {
      const testBuffer = Buffer.from('Direct storage test content')
      const testFileName = 'direct-test.txt'

      const result = await storageService.addFile({
        buffer: testBuffer,
        filename: testFileName,
      })

      expect(result).to.have.property('key')
      expect(result).to.have.property('url')
      expect(result.key).to.include(testFileName)
      expect(result.url).to.include('localhost:9000')
    })

    it('should get storage status', async () => {
      const status = await storageService.getStatus()
      expect(status).to.have.property('status')
      expect(status.status).to.be.oneOf(['UP', 'DOWN'])

      if (status.status === 'UP') {
        expect(status).to.have.property('detail')
        expect(status.detail).to.have.property('version')
      }
    })
  })

  describe('Service Architecture', function () {
    it('should only expose upload endpoint (no download through encryption service)', async () => {
      // Verify download endpoints are not available on encryption service
      await request(app).get('/files/non-existent-file.txt').expect(404) // Should be 404 because route doesn't exist, not because file doesn't exist
    })

    it('should return Minio URL for direct access, not proxy downloads', async () => {
      const testContent = Buffer.from('Architecture test content')
      const response = await request(app)
        .post('/files/upload')
        .attach('file', testContent, 'architecture-test.txt')
        .expect(201)

      // The URL should be a direct Minio URL, not an encryption service URL
      expect(response.body.url).to.not.include('localhost:3000') // Not encryption service
      expect(response.body.url).to.include('localhost:9000') // Direct Minio
    })
  })
})
