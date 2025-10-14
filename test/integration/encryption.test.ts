import { KeyType, TypedArrayEncoder, VerificationMethod } from '@credo-ts/core'
import { expect } from 'chai'
import { DIDDocument } from 'did-resolver'
import { testCleanup } from '../helpers/cleanup.js'
import { setupTwoPartyContext, TwoPartyContext } from '../helpers/twoPartyContext.js'

describe('encryption', async () => {
  const context: TwoPartyContext = {} as TwoPartyContext
  const plaintext = Buffer.from('test')
  let recipientPublicKey64: string
  let cipher: string
  let encryptedCek: string
  let cek: Buffer

  before(async function () {
    this.timeout(10000)
    await setupTwoPartyContext(context)
  })

  after(async () => {
    await testCleanup(context.localCloudagent)
    await testCleanup(context.remoteCloudagent)
  })

  it('get recipient public key', async () => {
    const did = (await context.localCloudagent.createDid('key', {
      keyType: KeyType.X25519,
    })) as DIDDocument

    const keyAgreement = did.keyAgreement?.[0] as VerificationMethod
    recipientPublicKey64 = TypedArrayEncoder.toBase64(TypedArrayEncoder.fromBase58(keyAgreement.publicKeyBase58!))
  })

  it('encrypt plaintext + buffer', () => {
    cek = context.localEncryption.generateCek()
    const encryptionResult = context.localEncryption.encryptWithCek(plaintext, cek)
    cipher = encryptionResult.cipher
    encryptedCek = context.localEncryption.encryptWithPublicX25519(cek, recipientPublicKey64)
  })

  it('decrypt cek + cipher', async () => {
    const decryptedCek = await context.localCloudagent.walletDecrypt(encryptedCek, recipientPublicKey64)
    const decrypted = context.localEncryption.decryptWithCek(cipher, Buffer.from(decryptedCek, 'base64'))
    expect(decrypted).to.deep.equal(plaintext)
  })
})
