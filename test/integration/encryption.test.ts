import { KeyType, TypedArrayEncoder, VerificationMethod } from '@credo-ts/core'
import { expect } from 'chai'
import type { DIDDocument } from 'did-resolver'
import { encryptEcdh } from '../../src/ecdh.js'
import { testCleanup } from '../helpers/cleanup.js'
import { setupTwoPartyContext, TwoPartyContext } from '../helpers/twoPartyContext.js'

describe('encryption', async () => {
  const context: TwoPartyContext = {} as TwoPartyContext
  const file = Buffer.from('some file')
  let recipientPublicKey64: string
  let header: string
  let ciphertext: string

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

  it('encrypt buffer + separate jwe', () => {
    const jwe = encryptEcdh(file, recipientPublicKey64)
    const parts = jwe.split('.')
    header = parts.slice(0, 2).join('.')
    ciphertext = parts.slice(2).join('.')
  })

  it('receiver - reconstruct jwe and decrypt', async () => {
    const jwe = [header, ciphertext].join('.')
    const decrypted = await context.localCloudagent.walletDecrypt(jwe, recipientPublicKey64)
    expect(decrypted).to.deep.equal(file)
  })
})
