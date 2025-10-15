import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { encryptEcdh } from '../../src/ecdh.js'
import { InternalError } from '../../src/error.js'
import { testCleanup } from '../helpers/cleanup.js'
import { createDid } from '../helpers/createDid.js'
import { setupTwoPartyContext, TwoPartyContext } from '../helpers/twoPartyContext.js'

chai.use(chaiAsPromised)
const expect = chai.expect

describe('encryption', async () => {
  const context: TwoPartyContext = {} as TwoPartyContext
  const file = Buffer.from('some file')
  let recipientPublicKey64: string
  let header: string
  let ciphertext: string

  before(async function () {
    await setupTwoPartyContext(context)
  })

  after(async () => {
    await testCleanup(context.localCloudagent)
    await testCleanup(context.remoteCloudagent)
  })

  it('sender - encrypt buffer + separate jwe', async () => {
    recipientPublicKey64 = await createDid(context.localCloudagent)
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

  it('fails with wrong recipient public key', async () => {
    const wrongPublicKey64 = await createDid(context.localCloudagent)

    const jwe = [header, ciphertext].join('.')
    await expect(context.localCloudagent.walletDecrypt(jwe, wrongPublicKey64)).to.be.rejectedWith(
      InternalError,
      'AEAD decryption error'
    )
  })
})
