import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { InternalError } from '../../src/error.js'
import { createLocalDid, setupTwoPartyContext, testCleanup, TwoPartyContext } from '../helpers/twoPartyContext.js'

chai.use(chaiAsPromised)
const expect = chai.expect

describe('encryption', async () => {
  const context: TwoPartyContext = {} as TwoPartyContext
  const plaintext = Buffer.from('test')
  let recipientPublicKey: string

  before(async function () {
    await setupTwoPartyContext(context)
    recipientPublicKey = await createLocalDid(context)
  })

  after(async () => {
    await testCleanup(context)
  })

  it('success - encrypt/decrypt cek + cipher', async () => {
    const { cipherPayload, encryptedCek } = context.localEncryption.encryptPlaintext(plaintext, recipientPublicKey)
    const decryptedCek = await context.localCloudagent.walletDecrypt(encryptedCek, recipientPublicKey)
    const decrypted = context.localEncryption.decryptWithCek(cipherPayload, decryptedCek)
    expect(decrypted).to.deep.equal(plaintext)
  })

  it('success - large file encrypt/decrypt cek + cipher', async () => {
    const largeFile = Buffer.from('a'.repeat(100 * 1024 * 1024)) // 100MB

    const { cipherPayload, encryptedCek } = context.localEncryption.encryptPlaintext(largeFile, recipientPublicKey)
    const decryptedCek = await context.localCloudagent.walletDecrypt(encryptedCek, recipientPublicKey)
    const decrypted = context.localEncryption.decryptWithCek(cipherPayload, decryptedCek)
    expect(decrypted).to.deep.equal(largeFile)
  })

  it('success - multiple encryptions produce different cipherPayloads', async () => {
    const result1 = context.localEncryption.encryptPlaintext(plaintext, recipientPublicKey)
    const result2 = context.localEncryption.encryptPlaintext(plaintext, recipientPublicKey)

    expect(result1.cipherPayload).to.not.deep.equal(result2.cipherPayload)
    expect(result1.encryptedCek).to.not.deep.equal(result2.encryptedCek)
  })

  it('error - cek decryption fails with wrong recipient public key', async () => {
    const wrongPublicKey = await createLocalDid(context)
    const { encryptedCek } = context.localEncryption.encryptPlaintext(plaintext, recipientPublicKey)

    await expect(context.localCloudagent.walletDecrypt(encryptedCek, wrongPublicKey)).to.be.rejectedWith(
      InternalError,
      'AEAD decryption error'
    )
  })

  it('error - cipher decryption fails with wrong cek', async () => {
    const { cipherPayload } = context.localEncryption.encryptPlaintext(plaintext, recipientPublicKey)
    const wrongCek = context.localEncryption.generateCek()

    expect(() => context.localEncryption.decryptWithCek(cipherPayload, wrongCek)).to.throw(
      Error,
      'Unsupported state or unable to authenticate data'
    )
  })

  it('error - cipher decryption fails with tampered cipherPayload', async () => {
    const { cipherPayload, encryptedCek } = context.localEncryption.encryptPlaintext(plaintext, recipientPublicKey)
    const decryptedCek = await context.localCloudagent.walletDecrypt(encryptedCek, recipientPublicKey)

    const tamperedCipherPayload = cipherPayload.slice(0, -1) + 'X'

    expect(() => context.localEncryption.decryptWithCek(tamperedCipherPayload, decryptedCek)).to.throw(
      Error,
      'Unsupported state or unable to authenticate data'
    )
  })
})
