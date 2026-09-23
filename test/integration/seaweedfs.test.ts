import { expect } from 'chai'
import { before, describe, it } from 'mocha'
import env from '../../src/env.js'
import { setupTwoPartyContext, TwoPartyContext } from '../helpers/twoPartyContext.js'

describe('SeaweedFS S3 Encryption Service Integration', function () {
  const context = {} as TwoPartyContext
  const testContent = 'Direct SeaweedFS access test content'
  const filename = 'direct-access-test.txt'

  before(async () => {
    await setupTwoPartyContext(context)
  })

  it('should create a bucket, upload an object, and download it from a signed URL', async () => {
    await context.localStorageClass.createBucketIfDoesNotExist()
    await context.localStorageClass.createBucketIfDoesNotExist()

    const { url: signedUrl } = await context.localStorageClass.addFile({
      buffer: Buffer.from(testContent),
      targetPath: filename,
    })

    const urlParts = new URL(signedUrl)
    expect(urlParts.hostname).to.equal(env.STORAGE_BACKEND_HOST)
    expect(urlParts.port).to.equal(env.STORAGE_BACKEND_PORT.toString())
    expect(urlParts.pathname).to.equal(`/${env.STORAGE_BACKEND_BUCKET_NAME}/${filename}`)
    expect(urlParts.searchParams.has('X-Amz-Signature')).to.equal(true)
    expect(urlParts.searchParams.has('X-Amz-Credential')).to.equal(true)

    const response = await fetch(signedUrl)
    const downloadedContent = await response.text()

    expect(response.status).to.equal(200)
    expect(downloadedContent).to.equal(testContent)

    const unsignedResponse = await fetch(`${urlParts.origin}${urlParts.pathname}`)
    expect(unsignedResponse.status).to.equal(403)
  })
})
