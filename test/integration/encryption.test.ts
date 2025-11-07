import { decode, encode } from 'cbor2'
import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { InternalError } from '../../src/error.js'
import { EncryptedPayload } from '../../src/services/encryption/aesGcm.js'
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
    const { envelopedCiphertext, encryptedCek } = context.localEncryption.encryptPlaintext(
      plaintext,
      recipientPublicKey
    )
    const decryptedCek = await context.localCloudagent.walletDecrypt(encryptedCek, recipientPublicKey)
    const decrypted = context.localEncryption.decryptWithCek(envelopedCiphertext, decryptedCek)
    expect(decrypted).to.deep.equal(plaintext)
  })

  it('success - large file encrypt/decrypt cek + cipher', async () => {
    const largeFile = Buffer.from('a'.repeat(100 * 1024 * 1024)) // 100MB
    const { envelopedCiphertext, encryptedCek } = context.localEncryption.encryptPlaintext(
      largeFile,
      recipientPublicKey
    )
    const decryptedCek = await context.localCloudagent.walletDecrypt(encryptedCek, recipientPublicKey)
    const decrypted = context.localEncryption.decryptWithCek(envelopedCiphertext, decryptedCek)
    expect(decrypted).to.deep.equal(largeFile)
  }).timeout(30000)

  it('success - multiple encryptions produce different cipherPayloads', async () => {
    const result1 = context.localEncryption.encryptPlaintext(plaintext, recipientPublicKey)
    const result2 = context.localEncryption.encryptPlaintext(plaintext, recipientPublicKey)

    expect(result1.envelopedCiphertext).to.not.deep.equal(result2.envelopedCiphertext)
  })

  it('success - multiple encryptions produce different ciphertexts', async () => {
    const result1 = context.localEncryption.encryptPlaintext(plaintext, recipientPublicKey)
    const result2 = context.localEncryption.encryptPlaintext(plaintext, recipientPublicKey)

    expect(result1.envelopedCiphertext).to.not.deep.equal(result2.envelopedCiphertext)
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
    const { envelopedCiphertext } = context.localEncryption.encryptPlaintext(plaintext, recipientPublicKey)
    const wrongCek = context.localEncryption.generateCek()

    expect(() => context.localEncryption.decryptWithCek(envelopedCiphertext, wrongCek)).to.throw(
      Error,
      'Unsupported state or unable to authenticate data'
    )
  })

  it('error - cipher decryption fails with tampered ciphertext', async () => {
    const { envelopedCiphertext, encryptedCek } = context.localEncryption.encryptPlaintext(
      plaintext,
      recipientPublicKey
    )
    const decryptedCek = await context.localCloudagent.walletDecrypt(encryptedCek, recipientPublicKey)

    const envelopeBuffer = Buffer.from(envelopedCiphertext, 'base64')
    const envelope = decode(envelopeBuffer) as EncryptedPayload
    envelope.ciphertext = envelope.ciphertext.slice(0, -2) + 'ff'
    const tamperedCiphertext = Buffer.from(encode(envelope)).toString('base64')

    expect(() => context.localEncryption.decryptWithCek(tamperedCiphertext, decryptedCek)).to.throw(
      Error,
      'Unsupported state or unable to authenticate data'
    )
  })
});