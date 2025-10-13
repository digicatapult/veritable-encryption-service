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

  describe('Direct Minio Access', function () {
    let directMinioUrl: string

    before(async () => {
      // Upload a file first via the encryption service
      const testContent = Buffer.from('Direct Minio access test content')
      const response = await request(app)
        .post('/files')
        .attach('file', testContent, 'direct-access-test.txt')
        .expect(201)

      directMinioUrl = response.body.url
    })

    it('should allow direct download from Minio URL (anonymous access)', async () => {
      // Verify URL components for anonymous access
      const urlParts = new URL(directMinioUrl)
      expect(urlParts.hostname).to.equal(process.env.STORAGE_BACKEND_HOST)
      expect(urlParts.port).to.equal(process.env.STORAGE_BACKEND_PORT)
      expect(urlParts.pathname).to.include(`test/direct-access-test.txt`)

      // Actually test downloading the file from Minio directly using fetch
      const response = await fetch(directMinioUrl)
      const downloadedContent = await response.text()

      expect(response.status).to.equal(200)
      expect(downloadedContent).to.equal('Direct Minio access test content')
    })
  })
})
