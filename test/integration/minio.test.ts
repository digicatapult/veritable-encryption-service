import { expect } from 'chai'
import { Express } from 'express'
import { before, describe, it } from 'mocha'
import env from '../../src/env.js'
import createHttpServer from '../../src/server.js'
import { setupTwoPartyContext, TwoPartyContext } from '../helpers/twoPartyContext.js'

describe('Minio Encryption Service Integration', function () {
  let app: Express
  const context = {} as TwoPartyContext
  const testContent = 'Direct Minio access test content'
  const filename = 'direct-access-test.txt'

  before(async () => {
    app = await createHttpServer()
    await setupTwoPartyContext(context)
  })

  it('should allow direct download from Minio URL (anonymous access)', async () => {
    const { url: directMinioUrl } = await context.localStorageClass.addFile({
      buffer: Buffer.from(testContent),
      targetPath: filename,
    })
    // Verify URL components for anonymous access
    const urlParts = new URL(directMinioUrl)
    expect(urlParts.hostname).to.equal(env.STORAGE_BACKEND_HOST)
    expect(urlParts.port).to.equal(env.STORAGE_BACKEND_PORT.toString())
    expect(urlParts.pathname).to.include(filename)

    // Actually test downloading the file from Minio directly using fetch
    const response = await fetch(directMinioUrl)
    const downloadedContent = await response.text()

    expect(response.status).to.equal(200)
    expect(downloadedContent).to.equal(testContent)
  })
})
