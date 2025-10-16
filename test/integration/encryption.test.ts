import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { InternalError } from '../../src/error.js'
import {
  createLocalDid,
  encryptPlaintext,
  setupTwoPartyContext,
  testCleanup,
  TwoPartyContext,
} from '../helpers/twoPartyContext.js'

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
    const { ciphertext, encryptedCek } = await encryptPlaintext(context, plaintext, recipientPublicKey)
    const decryptedCek = await context.localCloudagent.walletDecrypt(encryptedCek, recipientPublicKey)
    const decrypted = context.localEncryption.decryptWithCek(ciphertext, decryptedCek)
    expect(decrypted).to.deep.equal(plaintext)
  })

  it('success - large file encrypt/decrypt cek + cipher', async () => {
    const largeFile = Buffer.from('a'.repeat(100 * 1024 * 1024)) // 100MB

    const { ciphertext, encryptedCek } = await encryptPlaintext(context, largeFile, recipientPublicKey)
    const decryptedCek = await context.localCloudagent.walletDecrypt(encryptedCek, recipientPublicKey)
    const decrypted = context.localEncryption.decryptWithCek(ciphertext, decryptedCek)
    expect(decrypted).to.deep.equal(largeFile)
  })

  it('success - multiple encryptions produce different ciphertexts', async () => {
    const result1 = await encryptPlaintext(context, plaintext, recipientPublicKey)
    const result2 = await encryptPlaintext(context, plaintext, recipientPublicKey)

    expect(result1.ciphertext).to.not.deep.equal(result2.ciphertext)
    expect(result1.encryptedCek).to.not.deep.equal(result2.encryptedCek)
  })

  it('error - cek decryption fails with wrong recipient public key', async () => {
    const wrongPublicKey = await createLocalDid(context)
    const { encryptedCek } = await encryptPlaintext(context, plaintext, recipientPublicKey)

    await expect(context.localCloudagent.walletDecrypt(encryptedCek, wrongPublicKey)).to.be.rejectedWith(
      InternalError,
      'AEAD decryption error'
    )
  })

  it('error - cipher decryption fails with wrong cek', async () => {
    const { ciphertext } = await encryptPlaintext(context, plaintext, recipientPublicKey)
    const wrongCek = context.localEncryption.generateCek()

    expect(() => context.localEncryption.decryptWithCek(ciphertext, wrongCek)).to.throw(
      Error,
      'Unsupported state or unable to authenticate data'
    )
  })

  it('error - cipher decryption fails with tampered ciphertext', async () => {
    const { ciphertext, encryptedCek } = await encryptPlaintext(context, plaintext, recipientPublicKey)
    const decryptedCek = await context.localCloudagent.walletDecrypt(encryptedCek, recipientPublicKey)

    const tamperedCiphertext = ciphertext.slice(0, -1) + 'X'

    expect(() => context.localEncryption.decryptWithCek(tamperedCiphertext, decryptedCek)).to.throw(
      Error,
      'Unsupported state or unable to authenticate data'
    )
  })
})
